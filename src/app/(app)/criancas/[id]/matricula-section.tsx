'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarMatricula, encerrarMatricula } from '../matricula-action'
import { formatBRL } from '@/lib/dinheiro'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Plano = { id: string; nome: string; dias_por_semana: number; valor: number }
type Matricula = {
  id: string
  valor: number
  dia_vencimento: number
  dias_semana: number[] | null
  plano: { nome: string } | null
}

export default function MatriculaSection({
  criancaId,
  matricula,
  planos,
  ehAdmin,
}: {
  criancaId: string
  matricula: Matricula | null
  planos: Plano[]
  ehAdmin: boolean
}) {
  const router = useRouter()
  const [planoId, setPlanoId] = useState('')
  const [valor, setValor] = useState('')
  const [diaVenc, setDiaVenc] = useState('10')
  const [dias, setDias] = useState<number[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function escolherPlano(id: string) {
    setPlanoId(id)
    const p = planos.find((x) => x.id === id)
    if (p) setValor(String(p.valor))
  }

  function toggleDia(d: number) {
    setDias((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()))
  }

  async function matricular(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await criarMatricula({
      criancaId,
      planoId,
      valor: Number(valor),
      diaVencimento: Number(diaVenc),
      diasSemana: dias,
      inicio: '',
    })
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setPlanoId('')
    setValor('')
    setDias([])
    router.refresh()
  }

  async function encerrar() {
    if (!matricula) return
    setOcupado(true)
    await encerrarMatricula(matricula.id, criancaId)
    setOcupado(false)
    router.refresh()
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold text-slate-600">🎟️ Matrícula</h2>

      {matricula ? (
        <div className={`flex items-center justify-between ${card}`}>
          <div>
            <div className="font-display text-lg font-semibold">
              {matricula.plano?.nome ?? 'Mensalidade'}
            </div>
            <div className="text-xs text-slate-500">
              {formatBRL(matricula.valor)} · vence dia {matricula.dia_vencimento}
              {matricula.dias_semana?.length
                ? ' · ' + matricula.dias_semana.map((d) => DIAS[d]).join(', ')
                : ''}
            </div>
          </div>
          {ehAdmin && (
            <button
              onClick={encerrar}
              disabled={ocupado}
              className="text-sm font-semibold text-rose-500 disabled:opacity-50"
            >
              Encerrar
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Sem mensalidade ativa.</p>
      )}

      {ehAdmin && (
        <form onSubmit={matricular} className={`space-y-3 ${card}`}>
          <div className="font-display text-base font-bold text-slate-600">
            {matricula ? 'Trocar plano' : 'Matricular'}
          </div>

          {planos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum plano ativo. Crie um em Planos primeiro.
            </p>
          ) : (
            <>
              <label className={label}>
                <span className={labelText}>Plano</span>
                <select
                  value={planoId}
                  onChange={(e) => escolherPlano(e.target.value)}
                  className={input}
                  required
                >
                  <option value="">Selecione…</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} · {formatBRL(p.valor)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2">
                <label className={`flex-1 ${label}`}>
                  <span className={labelText}>Valor (R$)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className={input}
                    required
                  />
                </label>
                <label className={`flex-1 ${label}`}>
                  <span className={labelText}>Vence dia</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={diaVenc}
                    onChange={(e) => setDiaVenc(e.target.value)}
                    className={input}
                    required
                  />
                </label>
              </div>

              <div className="space-y-1">
                <span className={labelText}>Dias da semana (opcional)</span>
                <div className="flex flex-wrap gap-1.5">
                  {DIAS.map((nome, d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDia(d)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                        dias.includes(d)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {nome}
                    </button>
                  ))}
                </div>
              </div>

              {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
              <button type="submit" disabled={ocupado} className={btnPrimary}>
                {matricula ? 'Trocar plano' : 'Matricular'}
              </button>
            </>
          )}
        </form>
      )}
    </section>
  )
}
