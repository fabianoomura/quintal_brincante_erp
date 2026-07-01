'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarGradePlay } from './actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function GradeForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [dias, setDias] = useState<number[]>([])
  const [ini, setIni] = useState('11:00')
  const [fim, setFim] = useState('14:00')
  const [valor, setValor] = useState('')
  const [cap, setCap] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function toggleDia(d: number) {
    setDias((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await criarGradePlay({
      nome,
      diasSemana: dias,
      horaInicio: ini,
      horaFim: fim,
      valor: Number(valor),
      capacidade: cap.trim() === '' ? null : Number(cap),
    })
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setNome('')
    setDias([])
    setValor('')
    setCap('')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className={`space-y-3 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">➕ Novo período</div>
      <label className={label}>
        <span className={labelText}>Nome</span>
        <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: 2ª a 4ª — almoço" className={input} />
      </label>
      <div className="space-y-1">
        <span className={labelText}>Dias da semana</span>
        <div className="flex flex-wrap gap-1.5">
          {DIAS.map((n, d) => (
            <button key={d} type="button" onClick={() => toggleDia(d)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${dias.includes(d) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={label}>
          <span className={labelText}>Início</span>
          <input type="time" value={ini} onChange={(e) => setIni(e.target.value)} className={input} />
        </label>
        <label className={label}>
          <span className={labelText}>Fim</span>
          <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} className={input} />
        </label>
        <label className={label}>
          <span className={labelText}>Valor/hora (R$)</span>
          <input type="number" min={0} step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} className={input} />
        </label>
        <label className={label}>
          <span className={labelText}>Capacidade</span>
          <input type="number" min={1} value={cap} onChange={(e) => setCap(e.target.value)} placeholder="opcional" className={input} />
        </label>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      <button type="submit" disabled={ocupado} className={btnPrimary}>Criar período</button>
    </form>
  )
}
