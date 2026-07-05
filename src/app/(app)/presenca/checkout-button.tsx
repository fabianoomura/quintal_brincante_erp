'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkOut } from './actions'
import RecebimentoModal from '../recebimento-modal'
import Modal from '../modal'

export default function CheckoutButton({ presencaId }: { presencaId: string }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [receb, setReceb] = useState<{
    lancamentoId: string | null
    valor: number
    nome: string
  } | null>(null)

  async function sair() {
    setOcupado(true)
    try {
      const res = await checkOut(presencaId)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      if (res.valor != null && res.lancamentoId) {
        setReceb({ lancamentoId: res.lancamentoId, valor: res.valor, nome: res.nome })
      }
      router.refresh()
    } catch (e) {
      setErro(`Falha no check-out (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <button
        onClick={sair}
        disabled={ocupado}
        className="pop shrink-0 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        {ocupado ? '…' : 'Check-out 👋'}
      </button>

      <RecebimentoModal
        aberto={receb != null}
        lancamentoId={receb?.lancamentoId ?? null}
        valor={receb?.valor ?? 0}
        nome={receb?.nome ?? ''}
        onFechar={() => setReceb(null)}
      />

      <Modal open={erro != null} onClose={() => setErro(null)} title="Ops">
        <p className="text-sm text-slate-600">{erro}</p>
      </Modal>
    </>
  )
}
