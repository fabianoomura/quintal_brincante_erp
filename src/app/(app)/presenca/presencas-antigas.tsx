'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkOut } from './actions'
import { hhmm } from '@/lib/datas'

export type PresencaAntiga = {
  id: string
  nome: string
  data: string // 'YYYY-MM-DD'
  entrada: string // 'HH:MM(:SS)'
}

// Check-outs ESQUECIDOS: presença aberta de dia anterior. Sem este banner ela ficava
// invisível (as telas só listam o dia atual) e a sessão nunca era cobrada. A equipe
// informa a hora real da saída; o valor vai pro Financeiro como pendente.
export default function PresencasAntigas({ presencas }: { presencas: PresencaAntiga[] }) {
  const router = useRouter()
  const [saidas, setSaidas] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  if (presencas.length === 0) return null

  async function encerrar(p: PresencaAntiga) {
    const saida = saidas[p.id]
    if (!saida) {
      setErro(`Informe o horário em que ${p.nome} saiu.`)
      return
    }
    setOcupado(p.id)
    setErro(null)
    try {
      const res = await checkOut(p.id, saida)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      router.refresh()
    } catch (e) {
      setErro(`Falha ao encerrar (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-800">
        ⚠️ Check-out esquecido: {presencas.length} presença(s) de dias anteriores ainda
        aberta(s). Informe a hora em que a criança saiu para encerrar e cobrar.
      </p>
      <ul className="space-y-2">
        {presencas.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-display font-semibold text-slate-700">{p.nome}</div>
              <div className="text-xs text-slate-500">
                {p.data.split('-').reverse().join('/')} · entrada {hhmm(p.entrada)}
              </div>
            </div>
            <input
              type="time"
              value={saidas[p.id] ?? ''}
              onChange={(e) => setSaidas((s) => ({ ...s, [p.id]: e.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              aria-label={`Hora de saída de ${p.nome}`}
            />
            <button
              onClick={() => encerrar(p)}
              disabled={ocupado === p.id}
              className="pop shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            >
              {ocupado === p.id ? '…' : 'Encerrar'}
            </button>
          </li>
        ))}
      </ul>
      {erro && <p className="text-sm font-semibold text-rose-600">{erro}</p>}
    </div>
  )
}
