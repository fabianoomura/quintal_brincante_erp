'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { baixaManual, type Modalidade } from './actions'

const OPCOES: { m: Modalidade; label: string }[] = [
  { m: 'dinheiro', label: '💵' },
  { m: 'pix', label: '📱 Pix' },
  { m: 'debito', label: '💳 Déb' },
  { m: 'credito', label: '💳 Créd' },
  { m: 'maquininha', label: '🏧' },
]

export default function BaixaButton({
  lancamentoId,
  valor,
  descontoAtivo = false,
}: {
  lancamentoId: string
  valor: number
  descontoAtivo?: boolean
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [tipo, setTipo] = useState<'%' | 'R$'>('%')
  const [desc, setDesc] = useState('')

  function descontoReais(): number {
    const n = Number(desc)
    if (!(n > 0)) return 0
    const bruto = tipo === '%' ? (valor * n) / 100 : n
    return Math.round(bruto * 100) / 100 // centavos
  }

  async function pagar(m: Modalidade) {
    setOcupado(true)
    await baixaManual(lancamentoId, m, descontoReais())
    setOcupado(false)
    setAberto(false)
    setDesc('')
    router.refresh()
  }

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="pop shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm">
        ✓ Marcar pago
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {descontoAtivo && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">desc.</span>
          <input
            type="number"
            min={0}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="0"
            className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs"
          />
          <button
            type="button"
            onClick={() => setTipo(tipo === '%' ? 'R$' : '%')}
            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600"
          >
            {tipo}
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-1">
        {OPCOES.map((o) => (
          <button key={o.m} onClick={() => pagar(o.m)} disabled={ocupado} className="rounded-lg bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">
            {o.label}
          </button>
        ))}
        <button onClick={() => setAberto(false)} className="px-1 text-xs text-slate-400">✕</button>
      </div>
    </div>
  )
}
