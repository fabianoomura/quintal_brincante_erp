'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkOut, excluirPresencaEsquecida, finalizarPresencaSemCobranca } from './actions'
import { hhmm } from '@/lib/datas'

export type PresencaAntiga = {
  id: string
  nome: string
  data: string // 'YYYY-MM-DD'
  entrada: string // 'HH:MM(:SS)'
}

// Check-outs ESQUECIDOS: presença aberta de dia anterior. Sem este banner ela ficava
// invisível (as telas só listam o dia atual) e a sessão nunca era cobrada. A equipe
// informa a hora real da saída; o valor vai pro Financeiro como pendente.
// O valor pode ser ajustado à mão: ficou aberto por horas e nem sempre é justo
// cobrar o cálculo cheio pelo tempo decorrido.
export default function PresencasAntigas({
  presencas,
  ehAdmin = false,
}: {
  presencas: PresencaAntiga[]
  ehAdmin?: boolean
}) {
  const router = useRouter()
  // Fluxo de exceção: começa colapsado numa linha p/ não dominar a tela.
  const [aberto, setAberto] = useState(false)
  const [saidas, setSaidas] = useState<Record<string, string>>({})
  const [valores, setValores] = useState<Record<string, string>>({})
  const [motivos, setMotivos] = useState<Record<string, string>>({})
  const [semCobrancaAberta, setSemCobrancaAberta] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  if (presencas.length === 0) return null

  async function encerrar(p: PresencaAntiga) {
    const saida = saidas[p.id]
    if (!saida) {
      setErro(`Informe o horário em que ${p.nome} saiu.`)
      return
    }
    const valorTexto = (valores[p.id] ?? '').trim()
    let valorManual: number | undefined
    if (valorTexto !== '') {
      valorManual = Number(valorTexto.replace(',', '.'))
      if (!Number.isFinite(valorManual) || valorManual <= 0) {
        setErro(`Valor inválido para ${p.nome}. Deixe em branco para usar o cálculo automático.`)
        return
      }
    }
    setOcupado(`${p.id}:cobrar`)
    setErro(null)
    try {
      const res = await checkOut(p.id, saida, valorManual)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      router.refresh()
    } catch (e) {
      setErro(`Falha ao encerrar (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(null)
    }
  }

  async function finalizarSemCobranca(p: PresencaAntiga) {
    const saida = saidas[p.id]
    if (!saida) return setErro(`Informe o horário em que ${p.nome} saiu.`)
    const motivo = (motivos[p.id] ?? '').trim()
    if (motivo.length < 5) return setErro(`Explique por que ${p.nome} não foi cobrado.`)

    setOcupado(`${p.id}:sem-cobranca`)
    setErro(null)
    try {
      const res = await finalizarPresencaSemCobranca(p.id, saida, motivo)
      if (!res.ok) return setErro(res.erro)
      router.refresh()
    } catch (e) {
      setErro(`Falha ao finalizar (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(null)
    }
  }

  async function excluir(p: PresencaAntiga) {
    if (!window.confirm(`Excluir a presença esquecida de ${p.nome}?\n\nUse apenas para teste ou entrada criada por engano. O cadastro e as conversas serão mantidos.`)) return
    setOcupado(`${p.id}:excluir`)
    setErro(null)
    try {
      const res = await excluirPresencaEsquecida(p.id)
      if (!res.ok) return setErro(res.erro)
      router.refresh()
    } catch (e) {
      setErro(`Falha ao excluir (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5">
      <button
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-amber-800"
      >
        <span>
          ⚠️ {presencas.length} check-out(s) esquecido(s) de dias anteriores
        </span>
        <span className="shrink-0 text-xs font-semibold text-amber-600">
          {aberto ? 'fechar ▴' : 'resolver ▾'}
        </span>
      </button>
      {aberto && (
        <div className="space-y-2 pb-1.5 pt-3">
          <p className="text-xs text-amber-700">
            Informe a hora em que a criança saiu. Você pode encerrar e cobrar, finalizar sem
            cobrança com justificativa ou excluir uma entrada de teste (admin).
          </p>
          <ul className="space-y-2">
            {presencas.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-semibold text-slate-700">{p.nome}</div>
                  <div className="text-xs text-slate-500">
                    {p.data.split('-').reverse().join('/')} · entrada {hhmm(p.entrada)}
                  </div>
                </div>
                <input
                  type="time"
                  value={saidas[p.id] ?? ''}
                  onChange={(e) => setSaidas((s) => ({ ...s, [p.id]: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  aria-label={`Hora de saída de ${p.nome}`}
                />
                <div className="flex items-center rounded-lg border border-slate-200 px-2">
                  <span className="text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="auto"
                    value={valores[p.id] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [p.id]: e.target.value }))}
                    className="w-16 bg-transparent px-1 py-1.5 text-right text-sm outline-none"
                    aria-label={`Valor a cobrar de ${p.nome}`}
                  />
                </div>
                <button
                  onClick={() => encerrar(p)}
                  disabled={ocupado?.startsWith(p.id)}
                  className="pop shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                >
                  {ocupado === `${p.id}:cobrar` ? '…' : 'Encerrar e cobrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setSemCobrancaAberta((id) => id === p.id ? null : p.id)}
                  disabled={ocupado?.startsWith(p.id)}
                  className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  Sem cobrança
                </button>
                {ehAdmin && (
                  <button
                    type="button"
                    onClick={() => excluir(p)}
                    disabled={ocupado?.startsWith(p.id)}
                    className="shrink-0 rounded-full px-2 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {ocupado === `${p.id}:excluir` ? '…' : '🗑️ Excluir teste'}
                  </button>
                )}
                {semCobrancaAberta === p.id && (
                  <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <input
                      type="text"
                      value={motivos[p.id] ?? ''}
                      onChange={(e) => setMotivos((m) => ({ ...m, [p.id]: e.target.value }))}
                      placeholder="Motivo obrigatório (ex.: cortesia, responsável não retornou…)"
                      className="min-w-56 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      aria-label={`Motivo para não cobrar ${p.nome}`}
                    />
                    <button
                      type="button"
                      onClick={() => finalizarSemCobranca(p)}
                      disabled={ocupado?.startsWith(p.id)}
                      className="rounded-full bg-slate-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {ocupado === `${p.id}:sem-cobranca` ? '…' : 'Confirmar sem cobrança'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {erro && <p className="text-sm font-semibold text-rose-600">{erro}</p>}
        </div>
      )}
    </div>
  )
}
