'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkIn, type CheckInInput } from './actions'
import { card, input, btnPrimary } from '@/lib/ui'
import BuscaCrianca from '../busca-crianca'

type Origem = CheckInInput['origem']

const ORIGENS: { value: Origem; label: string }[] = [
  { value: 'espaco_kids', label: 'Play (espaço kids)' },
  { value: 'diaria', label: 'Diária / aula experimental' },
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
  onSuccess,
}: {
  criancas: { id: string; nome: string }[]
  ambientes?: { id: string; nome: string }[]
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [criancaId, setCriancaId] = useState('')
  const [origem, setOrigem] = useState<Origem>('espaco_kids')
  const [entrada, setEntrada] = useState(agoraLocalHHMM())
  const [tempo, setTempo] = useState('')
  const [valorDiaria, setValorDiaria] = useState('')
  const [ambienteId, setAmbienteId] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    try {
      const res = await checkIn({
        criancaId,
        origem,
        entrada,
        tempoContratadoMin:
          origem === 'espaco_kids' && tempo.trim() !== '' ? Number(tempo) : null,
        ambienteId: ambienteId || null,
        valorDiaria:
          origem === 'diaria' && valorDiaria.trim() !== '' ? Number(valorDiaria) : null,
      })
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      setCriancaId('')
      setTempo('')
      setValorDiaria('')
      setAmbienteId('')
      setEntrada(agoraLocalHHMM())
      router.refresh()
      onSuccess?.()
    } catch (e2) {
      setErro(`Falha ao registrar (${e2 instanceof Error ? e2.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <form onSubmit={registrar} className={`space-y-2 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">
        🚪 Registrar entrada
      </div>

      <BuscaCrianca criancas={criancas} value={criancaId} onChange={setCriancaId} />

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

      {origem === 'diaria' && (
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          placeholder="Valor da diária (R$) — vazio = experimental, não cobra"
          value={valorDiaria}
          onChange={(e) => setValorDiaria(e.target.value)}
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

      <button type="submit" disabled={ocupado || !criancaId} className={btnPrimary}>
        Registrar entrada 🎉
      </button>
    </form>
  )
}
