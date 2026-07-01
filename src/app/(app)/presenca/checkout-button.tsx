'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkOut } from './actions'

export default function CheckoutButton({ presencaId }: { presencaId: string }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function sair() {
    setOcupado(true)
    await checkOut(presencaId)
    setOcupado(false)
    router.refresh()
  }

  return (
    <button
      onClick={sair}
      disabled={ocupado}
      className="pop shrink-0 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
    >
      {ocupado ? '…' : 'Check-out 👋'}
    </button>
  )
}
