'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarGradePlay, toggleGradePlay } from './actions'
import { formatBRL } from '@/lib/dinheiro'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function GradeRow({
  id,
  nome,
  dias_semana,
  hora_inicio,
  hora_fim,
  valor,
  capacidade,
  ativo,
}: {
  id: string
  nome: string
  dias_semana: number[]
  hora_inicio: string
  hora_fim: string
  valor: number
  capacidade: number | null
  ativo: boolean
}) {
  const router = useRouter()
  const [val, setVal] = useState(String(valor))
  const [cap, setCap] = useState(capacidade != null ? String(capacidade) : '')
  const [ini, setIni] = useState(hora_inicio.slice(0, 5))
  const [fim, setFim] = useState(hora_fim.slice(0, 5))
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await atualizarGradePlay(id, {
      valor: Number(val),
      capacidade: cap.trim() === '' ? null : Number(cap),
      horaInicio: ini,
      horaFim: fim,
    })
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setMsg('✓')
    router.refresh()
  }

  async function alternar() {
    setOcupado(true)
    await toggleGradePlay(id, !ativo)
    setOcupado(false)
    router.refresh()
  }

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${!ativo ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="font-display font-semibold text-slate-800">{nome}</div>
        <div className="text-xs text-slate-400">{dias_semana.map((d) => DIAS[d]).join(', ')}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs font-semibold text-slate-500">
          Valor/hora
          <div className="mt-0.5 flex items-center gap-1">
            <span className="text-slate-400">R$</span>
            <input type="number" min={0} step="0.01" value={val} onChange={(e) => setVal(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          </div>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Capacidade
          <input type="number" min={1} value={cap} onChange={(e) => setCap(e.target.value)} placeholder="sem limite" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Início
          <input type="time" value={ini} onChange={(e) => setIni(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Fim
          <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={salvar} disabled={ocupado} className="pop rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          Salvar
        </button>
        <button onClick={alternar} disabled={ocupado} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${ativo ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
          {ativo ? 'Desativar' : 'Reativar'}
        </button>
        <span className="text-sm text-slate-400">atual: {formatBRL(valor)}{capacidade != null ? ` · cap ${capacidade}` : ''}</span>
        {msg && <span className="text-sm font-semibold text-emerald-600">{msg}</span>}
        {erro && <span className="text-sm font-semibold text-rose-500">{erro}</span>}
      </div>
    </div>
  )
}
