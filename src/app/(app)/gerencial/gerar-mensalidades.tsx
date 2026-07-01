'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gerarMensalidadesAtual } from './mensalidades-action'

export default function GerarMensalidades() {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function gerar() {
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await gerarMensalidadesAtual()
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setMsg(
      res.geradas === 0
        ? `Nada a gerar (todas as ${res.puladas} já existiam).`
        : `✅ ${res.geradas} mensalidade(s) gerada(s) · ${res.puladas} já existiam.`,
    )
    router.refresh()
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="font-display text-base font-bold text-slate-700">
        🔁 Mensalidades do mês
      </div>
      <p className="mb-2 text-sm text-slate-500">
        Gera os lançamentos das matrículas ativas para o mês atual. Pode rodar de novo sem
        duplicar.
      </p>
      <button
        onClick={gerar}
        disabled={ocupado}
        className="pop rounded-full bg-indigo-600 px-5 py-2.5 font-bold text-white shadow-sm disabled:opacity-60"
      >
        {ocupado ? 'Gerando…' : 'Gerar mensalidades'}
      </button>
      {erro && <p className="mt-2 text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="mt-2 text-sm font-semibold text-emerald-600">{msg}</p>}
    </div>
  )
}
