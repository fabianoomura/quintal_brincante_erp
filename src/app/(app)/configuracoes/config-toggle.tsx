'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setFlag } from './actions'

type Flag = 'conciliacao_automatica' | 'aviso_tempo_ativo'

export default function ConfigToggle({
  campo,
  titulo,
  descricao,
  inicial,
}: {
  campo: Flag
  titulo: string
  descricao: string
  inicial: boolean
}) {
  const router = useRouter()
  const [ligado, setLigado] = useState(inicial)
  const [ocupado, setOcupado] = useState(false)

  async function alternar() {
    const novo = !ligado
    setLigado(novo)
    setOcupado(true)
    const res = await setFlag(campo, novo)
    setOcupado(false)
    if (!res.ok) {
      setLigado(!novo) // reverte
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="min-w-0">
        <div className="font-display text-base font-bold text-slate-700">{titulo}</div>
        <p className="text-sm text-slate-500">{descricao}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={alternar}
        disabled={ocupado}
        className={`pop relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          ligado ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
            ligado ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}
