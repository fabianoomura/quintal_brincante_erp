'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inscrever } from '../actions'
import { card, input, btnPrimary } from '@/lib/ui'

export default function Inscrever({
  coloniaId,
  criancas,
}: {
  coloniaId: string
  criancas: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [criancaId, setCriancaId] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await inscrever(coloniaId, criancaId)
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setCriancaId('')
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className={`space-y-2 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">➕ Inscrever criança</div>
      {criancas.length === 0 ? (
        <p className="text-sm text-slate-500">Todas as crianças ativas já estão inscritas.</p>
      ) : (
        <>
          <select
            required
            value={criancaId}
            onChange={(e) => setCriancaId(e.target.value)}
            className={input}
          >
            <option value="">Selecione…</option>
            {criancas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
          <button type="submit" disabled={ocupado} className={btnPrimary}>
            Inscrever (gera lançamento)
          </button>
        </>
      )}
      {erro && criancas.length === 0 && (
        <p className="text-sm font-semibold text-rose-500">{erro}</p>
      )}
    </form>
  )
}
