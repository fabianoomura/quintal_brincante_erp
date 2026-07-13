'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkOut } from './actions'
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
export default function PresencasAntigas({ presencas }: { presencas: PresencaAntiga[] }) {
  const router = useRouter()
  // Fluxo de exceção: começa colapsado numa linha p/ não dominar a tela.
  const [aberto, setAberto] = useState(false)
  const [saidas, setSaidas] = useState<Record<string, string>>({})
  const [valores, setValores] = useState<Record<string, string>>({})
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
    setOcupado(p.id)
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
            Informe a hora em que a criança saiu para encerrar e cobrar. Se preferir, informe
            também o valor a cobrar (em branco = cálculo automático pelo tempo).
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
                  disabled={ocupado === p.id}
                  className="pop shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                >
                  {ocupado === p.id ? '…' : 'Encerrar'}
                </button>
              </li>
            ))}
          </ul>
          {erro && <p className="text-sm font-semibold text-rose-600">{erro}</p>}
        </div>
      )}
    </div>
  )
}
