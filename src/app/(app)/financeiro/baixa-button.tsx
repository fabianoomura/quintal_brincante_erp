'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { baixaManual } from './actions'

export default function BaixaButton({ lancamentoId }: { lancamentoId: string }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function pagar() {
    setOcupado(true)
    await baixaManual(lancamentoId)
    setOcupado(false)
    router.refresh()
  }

  return (
    <button
      onClick={pagar}
      disabled={ocupado}
      className="pop shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
    >
      {ocupado ? '…' : '✓ Marcar pago'}
    </button>
  )
}
