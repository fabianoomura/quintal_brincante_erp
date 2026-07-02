'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setDescontoIrmao } from './actions'

export default function DescontoIrmao({ inicial }: { inicial: number | null }) {
  const router = useRouter()
  const [v, setV] = useState(inicial != null ? String(inicial) : '')
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await setDescontoIrmao(v.trim() === '' ? null : Number(v))
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setMsg('Salvo. ✅')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="font-display text-base font-bold text-slate-700">👨‍👩‍👧‍👦 Desconto por irmão</div>
      <p className="mb-2 text-sm text-slate-500">
        % de desconto no 2º filho em diante (mensalidade e colônia). Irmãos = mesmo responsável
        (CPF). Vazio = desligado.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="ex.: 10"
          className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
        <span className="text-sm text-slate-500">%</span>
        <button disabled={ocupado} className="pop rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
          Salvar
        </button>
      </div>
      {erro && <p className="mt-1 text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="mt-1 text-sm font-semibold text-emerald-600">{msg}</p>}
    </form>
  )
}
