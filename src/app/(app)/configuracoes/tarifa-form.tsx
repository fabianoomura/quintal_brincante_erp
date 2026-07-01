'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setTarifa } from './actions'
import { input, labelText } from '@/lib/ui'

type Tarifa = {
  valor_hora: number
  valor_fracao: number
  tamanho_fracao_min: number
  minimo_minutos: number
  aviso_antecedencia_min: number
}

export default function TarifaForm({ inicial }: { inicial: Tarifa }) {
  const router = useRouter()
  const [f, setF] = useState({
    valorHora: String(inicial.valor_hora),
    valorFracao: String(inicial.valor_fracao),
    tamanhoFracaoMin: String(inicial.tamanho_fracao_min),
    minimoMinutos: String(inicial.minimo_minutos),
    avisoAntecedenciaMin: String(inicial.aviso_antecedencia_min),
  })
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const campo = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMsg(null)
    setOcupado(true)
    const res = await setTarifa({
      valorHora: Number(f.valorHora),
      valorFracao: Number(f.valorFracao),
      tamanhoFracaoMin: Number(f.tamanhoFracaoMin),
      minimoMinutos: Number(f.minimoMinutos),
      avisoAntecedenciaMin: Number(f.avisoAntecedenciaMin),
    })
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setMsg('Tarifa salva. ✅')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="font-display text-base font-bold text-slate-700">🎠 Tarifa do play</div>
      <p className="text-sm text-slate-500">
        Piso de 1h; horas cheias + fração arredondada pra cima. Calculada no check-out.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className={labelText}>Valor/hora (R$)</span>
          <input type="number" min={0} step="0.01" value={f.valorHora} onChange={campo('valorHora')} className={input} />
        </label>
        <label className="block space-y-1">
          <span className={labelText}>Valor fração (R$)</span>
          <input type="number" min={0} step="0.01" value={f.valorFracao} onChange={campo('valorFracao')} className={input} />
        </label>
        <label className="block space-y-1">
          <span className={labelText}>Fração (min)</span>
          <input type="number" min={1} value={f.tamanhoFracaoMin} onChange={campo('tamanhoFracaoMin')} className={input} />
        </label>
        <label className="block space-y-1">
          <span className={labelText}>Mínimo (min)</span>
          <input type="number" min={1} value={f.minimoMinutos} onChange={campo('minimoMinutos')} className={input} />
        </label>
        <label className="block space-y-1">
          <span className={labelText}>Avisar antes (min)</span>
          <input type="number" min={0} value={f.avisoAntecedenciaMin} onChange={campo('avisoAntecedenciaMin')} className={input} />
        </label>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="text-sm font-semibold text-emerald-600">{msg}</p>}
      <button
        type="submit"
        disabled={ocupado}
        className="pop rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-sm disabled:opacity-60"
      >
        Salvar tarifa
      </button>
    </form>
  )
}
