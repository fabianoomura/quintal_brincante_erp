'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sairDaFila } from './fila-actions'

export type FilaItem = {
  id: string
  nome: string
  status: 'aguardando' | 'chamada'
  criadaEm: string // ISO
  chamadaEm: string | null // ISO
}

function hhmmLocal(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Fila de espera em pills compactas: chamadas (🔔 com prazo) primeiro, depois quem
// aguarda com a posição. Some quando vazia; a adição é pelo + Fila da entrada rápida.
export default function FilaEspera({
  fila,
  toleranciaMin,
}: {
  fila: FilaItem[]
  toleranciaMin: number
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  if (fila.length === 0) return null

  async function remover(item: FilaItem) {
    setErro(null)
    setOcupado(item.id)
    try {
      const res = await sairDaFila(item.id)
      if (!res.ok) setErro(res.erro)
      router.refresh()
    } catch (e) {
      setErro(`Não consegui remover (${e instanceof Error ? e.message : 'erro'}).`)
    } finally {
      setOcupado(null)
    }
  }

  const chamadas = fila.filter((f) => f.status === 'chamada')
  const aguardando = fila.filter((f) => f.status === 'aguardando')

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-bold text-slate-500">⏳ Fila ({fila.length}):</span>
        {chamadas.map((f) => {
          const prazo = f.chamadaEm
            ? hhmmLocal(new Date(new Date(f.chamadaEm).getTime() + toleranciaMin * 60_000).toISOString())
            : null
          return (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-3 pr-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200"
            >
              🔔 {f.nome}
              {prazo && <span className="text-xs font-bold text-emerald-600">até {prazo}</span>}
              <button
                onClick={() => remover(f)}
                disabled={ocupado === f.id}
                aria-label={`Remover ${f.nome} da fila`}
                className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-bold text-slate-400 ring-1 ring-slate-200 disabled:opacity-60"
              >
                {ocupado === f.id ? '…' : '✕'}
              </button>
            </span>
          )
        })}
        {aguardando.map((f, i) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200"
          >
            <span className="font-display font-bold text-slate-400">{i + 1}·</span> {f.nome}
            <span className="text-xs text-slate-400">{hhmmLocal(f.criadaEm)}</span>
            <button
              onClick={() => remover(f)}
              disabled={ocupado === f.id}
              aria-label={`Remover ${f.nome} da fila`}
              className="grid h-5 w-5 place-items-center rounded-full bg-slate-50 text-[11px] font-bold text-slate-400 ring-1 ring-slate-200 disabled:opacity-60"
            >
              {ocupado === f.id ? '…' : '✕'}
            </button>
          </span>
        ))}
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
