'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAmbiente } from './actions'

export default function ToggleAmbiente({ id, ativo }: { id: string; ativo: boolean }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function alternar() {
    setOcupado(true)
    await toggleAmbiente(id, !ativo)
    setOcupado(false)
    router.refresh()
  }

  return (
    <button
      onClick={alternar}
      disabled={ocupado}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${
        ativo ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      {ativo ? 'Desativar' : 'Reativar'}
    </button>
  )
}
