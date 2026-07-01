'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { removerInscricao } from '../actions'

export default function RemoverInscricao({
  inscricaoId,
  coloniaId,
}: {
  inscricaoId: string
  coloniaId: string
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function remover() {
    setOcupado(true)
    await removerInscricao(inscricaoId, coloniaId)
    setOcupado(false)
    router.refresh()
  }

  return (
    <button
      onClick={remover}
      disabled={ocupado}
      className="shrink-0 text-sm font-semibold text-rose-500 disabled:opacity-50"
    >
      Remover
    </button>
  )
}
