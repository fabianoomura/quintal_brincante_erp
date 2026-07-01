'use client'

import { useState } from 'react'
import { AVISOS_RAPIDOS } from '@/lib/whatsapp/avisosRapidos'
import { registrarOcorrencia } from './criancas/ocorrencia-action'

export default function AvisosRapidos({
  criancaId,
  presencaId = null,
  compact = false,
}: {
  criancaId: string
  presencaId?: string | null
  compact?: boolean
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function enviar(id: string, tipo: (typeof AVISOS_RAPIDOS)[number]['tipo'], texto: string) {
    setMsg(null)
    setOcupado(id)
    const res = await registrarOcorrencia(criancaId, tipo, texto, presencaId)
    setOcupado(null)
    if (!res.ok) {
      setMsg('❌ ' + res.erro)
      return
    }
    setMsg(res.notificou ? '✅ Responsável avisado' : (res.aviso ?? 'Registrado'))
    setTimeout(() => setMsg(null), 4000)
  }

  return (
    <div className="space-y-1.5">
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-1.5`}>
        {AVISOS_RAPIDOS.map((a) => (
          <button
            key={a.id}
            onClick={() => enviar(a.id, a.tipo, a.texto)}
            disabled={ocupado !== null}
            title={a.texto}
            className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-sky-100 hover:text-sky-700 disabled:opacity-50"
          >
            {ocupado === a.id ? '…' : a.label}
          </button>
        ))}
      </div>
      {msg && <p className="text-xs font-semibold text-emerald-600">{msg}</p>}
    </div>
  )
}
