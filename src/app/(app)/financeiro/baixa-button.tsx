'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { baixaManual, type Modalidade } from './actions'

const OPCOES: { m: Modalidade; label: string }[] = [
  { m: 'dinheiro', label: '💵 Dinheiro' },
  { m: 'pix', label: '📱 Pix' },
  { m: 'cartao', label: '💳 Cartão' },
  { m: 'maquininha', label: '🏧 Maquininha' },
]

export default function BaixaButton({ lancamentoId }: { lancamentoId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  async function pagar(m: Modalidade) {
    setOcupado(true)
    await baixaManual(lancamentoId, m)
    setOcupado(false)
    setAberto(false)
    router.refresh()
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="pop shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
      >
        ✓ Marcar pago
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {OPCOES.map((o) => (
        <button
          key={o.m}
          onClick={() => pagar(o.m)}
          disabled={ocupado}
          className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
        >
          {o.label}
        </button>
      ))}
      <button onClick={() => setAberto(false)} className="px-1 text-xs text-slate-400">
        ✕
      </button>
    </div>
  )
}
