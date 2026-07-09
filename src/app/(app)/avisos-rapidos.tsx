'use client'

import { useState } from 'react'
import { registrarOcorrencia } from './criancas/ocorrencia-action'
import type { Database } from '@/lib/database.types'

type TipoOcorrencia = Database['public']['Enums']['tipo_ocorrencia']
export type AvisoRapido = { id: string; label: string; tipo: TipoOcorrencia; texto: string }

export default function AvisosRapidos({
  criancaId,
  avisos,
  presencaId = null,
  compact = false,
}: {
  criancaId: string
  avisos: AvisoRapido[]
  presencaId?: string | null
  compact?: boolean
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function enviar(a: AvisoRapido) {
    setMsg(null)
    setOcupado(a.id)
    const res = await registrarOcorrencia(criancaId, a.tipo, a.texto, presencaId)
    setOcupado(null)
    if (!res.ok) {
      setMsg('❌ ' + res.erro)
      return
    }
    setMsg(res.notificou ? '✅ Responsável avisado' : (res.aviso ?? 'Registrado'))
    setTimeout(() => setMsg(null), 4000)
  }

  const visiveis = avisos.slice(0, 6)
  if (visiveis.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-1.5`}>
        {visiveis.map((a) => (
          <button
            key={a.id}
            onClick={() => enviar(a)}
            disabled={ocupado !== null}
            title={a.texto}
            className="truncate rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-sky-100 hover:text-sky-700 disabled:opacity-50"
          >
            {ocupado === a.id ? '…' : a.label}
          </button>
        ))}
      </div>
      {msg && <p className="text-xs font-semibold text-emerald-600">{msg}</p>}
    </div>
  )
}
