'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setFilaTolerancia } from './actions'

export default function FilaToleranciaInput({ inicial }: { inicial: number }) {
  const router = useRouter()
  const [valor, setValor] = useState(String(inicial))
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await setFilaTolerancia(Number(valor))
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setMsg('Salvo. ✅')
    router.refresh()
  }

  return (
    <form
      onSubmit={salvar}
      className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
    >
      <div className="font-display text-base font-bold text-slate-700">
        ⏳ Tolerância da fila (min)
      </div>
      <p className="text-sm text-slate-500">
        Quando chega a vez, a família recebe o aviso no WhatsApp e tem esse tempo para
        chegar. Não veio? A vaga passa para a próxima criança da fila.
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-32 rounded-2xl border-2 border-amber-200 bg-amber-50/40 px-4 py-2 text-base"
        />
        <button
          type="submit"
          disabled={ocupado}
          className="pop rounded-full bg-emerald-500 px-5 py-2 font-bold text-white shadow-sm disabled:opacity-60"
        >
          Salvar
        </button>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="text-sm font-semibold text-emerald-600">{msg}</p>}
    </form>
  )
}
