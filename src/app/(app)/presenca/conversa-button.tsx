'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { abrirConversaDoResponsavel } from '../conversas/actions'

export default function ConversaButton({
  criancaId,
  presencaId,
  naoLidas,
}: {
  criancaId: string
  presencaId: string
  naoLidas: number
}) {
  const router = useRouter()
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function abrir() {
    setAbrindo(true)
    setErro(null)
    try {
      const res = await abrirConversaDoResponsavel(criancaId)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      router.push(`/conversas/${res.conversaId}?crianca=${criancaId}&presenca=${presencaId}`)
    } catch {
      setErro('Não foi possível abrir a conversa.')
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={abrir}
        disabled={abrindo}
        className="pop flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 disabled:opacity-60"
      >
        💬 {abrindo ? 'Abrindo…' : 'WhatsApp'}
        {naoLidas > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>
      {erro && <span className="max-w-48 text-right text-xs font-semibold text-rose-600">{erro}</span>}
    </div>
  )
}
