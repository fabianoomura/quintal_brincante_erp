'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { excluirOperacaoPlay } from './actions'

export default function ExcluirOperacaoButton({ presencaId, nome }: { presencaId: string; nome: string }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function excluir() {
    const confirmou = window.confirm(
      `Excluir a operação de ${nome}?\n\nA presença e o lançamento financeiro serão apagados. O cadastro da criança e as conversas serão mantidos.`,
    )
    if (!confirmou) return

    setErro(null)
    setOcupado(true)
    try {
      const res = await excluirOperacaoPlay(presencaId)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      router.refresh()
    } catch (e) {
      setErro(`Falha ao excluir (${e instanceof Error ? e.message : 'erro'}).`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={excluir}
        disabled={ocupado}
        className="rounded-full border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
      >
        {ocupado ? '…' : '🗑️ Excluir'}
      </button>
      {erro && <p className="mt-1 max-w-40 text-xs font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
