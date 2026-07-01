'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkIn, type CheckInInput } from './actions'
import { card, input, btnPrimary } from '@/lib/ui'

type Origem = CheckInInput['origem']

const ORIGENS: { value: Origem; label: string }[] = [
  { value: 'espaco_kids', label: 'Play (espaço kids)' },
  { value: 'diaria', label: 'Diária' },
  { value: 'mensalista', label: 'Mensalista' },
  { value: 'colonia', label: 'Colônia' },
]

function agoraLocalHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CheckinForm({
  criancas,
  ambientes = [],
}: {
  criancas: { id: string; nome: string }[]
  ambientes?: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [criancaId, setCriancaId] = useState('')
  const [origem, setOrigem] = useState<Origem>('espaco_kids')
  const [entrada, setEntrada] = useState(agoraLocalHHMM())
  const [tempo, setTempo] = useState('')
  const [ambienteId, setAmbienteId] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await checkIn({
      criancaId,
      origem,
      entrada,
      tempoContratadoMin:
        origem === 'espaco_kids' && tempo.trim() !== '' ? Number(tempo) : null,
      ambienteId: ambienteId || null,
    })
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setCriancaId('')
    setTempo('')
    setAmbienteId('')
    setEntrada(agoraLocalHHMM())
    router.refresh()
  }

  return (
    <form onSubmit={registrar} className={`space-y-2 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">
        🚪 Registrar entrada
      </div>

      <select
        required
        value={criancaId}
        onChange={(e) => setCriancaId(e.target.value)}
        className={input}
      >
        <option value="">Selecione a criança…</option>
        {criancas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <select
          value={origem}
          onChange={(e) => setOrigem(e.target.value as Origem)}
          className={`flex-1 ${input}`}
        >
          {ORIGENS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          className={`w-auto ${input}`}
        />
      </div>

      {origem === 'espaco_kids' && (
        <input
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Tempo contratado (min) — opcional"
          value={tempo}
          onChange={(e) => setTempo(e.target.value)}
          className={input}
        />
      )}

      {ambientes.length > 0 && (
        <select
          value={ambienteId}
          onChange={(e) => setAmbienteId(e.target.value)}
          className={input}
        >
          <option value="">Ambiente (opcional)…</option>
          {ambientes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      )}

      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}

      <button type="submit" disabled={ocupado} className={btnPrimary}>
        Registrar entrada 🎉
      </button>
    </form>
  )
}
