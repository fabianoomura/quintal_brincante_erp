'use client'

import { useState } from 'react'
import Modal from '../modal'
import CheckinForm from './checkin-form'

// "Quem está aqui" foca nas crianças presentes; a entrada abre em pop-up.
export default function NovaEntradaButton({
  criancas,
  ambientes,
}: {
  criancas: { id: string; nome: string }[]
  ambientes: { id: string; nome: string }[]
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="pop shrink-0 rounded-full bg-emerald-600 px-5 py-2.5 font-display text-base font-bold text-white shadow-sm"
      >
        ➕ Nova entrada
      </button>

      <Modal open={aberto} onClose={() => setAberto(false)} title="🚪 Registrar entrada">
        <CheckinForm
          criancas={criancas}
          ambientes={ambientes}
          onSuccess={() => setAberto(false)}
        />
      </Modal>
    </>
  )
}
