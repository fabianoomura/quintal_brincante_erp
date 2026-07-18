'use client'

import { useState } from 'react'
import RecebimentoModal from './recebimento-modal'

// Reabre o pop-up de recebimento de um lançamento pendente (ex.: o modal do
// check-out fechou sem receber — o valor continua cobrável por aqui).
export default function ReceberButton({
  lancamentoId,
  valor,
  nome,
  presencaId = null,
}: {
  lancamentoId: string
  valor: number
  nome: string
  // Quando o lançamento vem de um check-out do play: habilita "reabrir por engano".
  presencaId?: string | null
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="pop shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm"
      >
        💰 Receber
      </button>
      <RecebimentoModal
        aberto={aberto}
        lancamentoId={lancamentoId}
        valor={valor}
        nome={nome}
        presencaId={presencaId}
        onFechar={() => setAberto(false)}
      />
    </>
  )
}
