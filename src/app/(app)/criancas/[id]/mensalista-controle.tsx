'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  atualizarDiasSemana,
  registrarFalta,
  agendarReposicao,
  removerReposicao,
} from '../reposicao-action'
import { card } from '@/lib/ui'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Reposicao = {
  id: string
  data_falta: string
  data_reposicao: string | null
  obs: string | null
}

export default function MensalistaControle({
  criancaId,
  mensalidadeId,
  diasIniciais,
  reposicoes,
  ehAdmin,
}: {
  criancaId: string
  mensalidadeId: string
  diasIniciais: number[]
  reposicoes: Reposicao[]
  ehAdmin: boolean
}) {
  const router = useRouter()
  const [dias, setDias] = useState<number[]>(diasIniciais)
  const [dataFalta, setDataFalta] = useState('')
  const [obs, setObs] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function toggleDia(d: number) {
    setDias((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()))
  }

  async function salvarDias() {
    setErro(null)
    setMsg(null)
    setOcupado(true)
    const res = await atualizarDiasSemana(mensalidadeId, criancaId, dias)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setMsg('Dias atualizados. ✅')
    router.refresh()
  }

  async function addFalta(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await registrarFalta(criancaId, dataFalta, obs)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setDataFalta('')
    setObs('')
    router.refresh()
  }

  async function agendar(id: string, data: string) {
    await agendarReposicao(id, criancaId, data)
    router.refresh()
  }

  async function remover(id: string) {
    await removerReposicao(id, criancaId)
    router.refresh()
  }

  const pendentes = reposicoes.filter((r) => !r.data_reposicao).length

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold text-slate-600">
        📅 Dias & reposições
      </h2>

      {/* Dias da semana */}
      <div className={`space-y-2 ${card}`}>
        <div className="text-sm font-semibold text-slate-600">Dias da semana</div>
        <div className="flex flex-wrap gap-1.5">
          {DIAS.map((nome, d) => (
            <button
              key={d}
              type="button"
              disabled={!ehAdmin}
              onClick={() => toggleDia(d)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-100 ${
                dias.includes(d) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {nome}
            </button>
          ))}
        </div>
        {ehAdmin && (
          <button
            onClick={salvarDias}
            disabled={ocupado}
            className="pop rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Salvar dias
          </button>
        )}
        {!ehAdmin && (
          <p className="text-xs text-slate-400">Só o admin altera os dias.</p>
        )}
        {msg && <p className="text-sm font-semibold text-emerald-600">{msg}</p>}
      </div>

      {/* Reposições */}
      <div className={`space-y-2 ${card}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-600">Faltas & reposições</span>
          {pendentes > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              {pendentes} a repor
            </span>
          )}
        </div>

        {reposicoes.length === 0 && (
          <p className="text-sm text-slate-500">Sem faltas registradas.</p>
        )}

        <ul className="space-y-1.5">
          {reposicoes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold">Faltou {r.data_falta}</span>
              {r.data_reposicao ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  repôs em {r.data_reposicao}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="text-xs text-amber-600">a repor →</span>
                  <input
                    type="date"
                    onChange={(e) => e.target.value && agendar(r.id, e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </span>
              )}
              {r.obs && <span className="text-xs text-slate-400">· {r.obs}</span>}
              <button onClick={() => remover(r.id)} className="ml-auto text-xs font-semibold text-rose-500">
                remover
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={addFalta} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
          <label className="text-xs font-semibold text-slate-500">
            Registrar falta
            <input
              type="date"
              required
              value={dataFalta}
              onChange={(e) => setDataFalta(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <input
            placeholder="motivo (ex.: viagem)"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={ocupado}
            className="pop rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Registrar
          </button>
        </form>
        {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      </div>
    </section>
  )
}
