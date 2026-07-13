'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sairDaFila } from './fila-actions'

export type FilaItem = {
  id: string
  nome: string
  foto: string | null
  status: 'aguardando' | 'chamada'
  criadaEm: string // ISO
  chamadaEm: string | null // ISO
}

function hhmmLocal(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function primeiroNome(nome: string) {
  return nome.replace(/\[seed\]/g, '').trim().split(/\s+/)[0] ?? nome
}

// A "filinha": avatares das crianças em pé, lado a lado, na ordem de chegada.
// Chamadas vêm primeiro (🔔 + prazo); as demais mostram a posição no ombro.
// Some quando vazia; a adição é pelo + Fila da entrada rápida.
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

  const ordenada = [
    ...fila.filter((f) => f.status === 'chamada'),
    ...fila.filter((f) => f.status === 'aguardando'),
  ]

  return (
    <div className="rounded-2xl bg-white px-4 pb-1.5 pt-2.5 shadow-sm ring-1 ring-black/5">
      <div className="text-sm font-bold text-slate-500">⏳ Fila de espera ({fila.length})</div>
      {/* a filinha: todo mundo em pé na linha, esperando a vez */}
      <div className="flex items-end gap-1 overflow-x-auto pb-1 pt-1.5">
        {ordenada.map((f, i) => {
          const chamada = f.status === 'chamada'
          const prazo =
            chamada && f.chamadaEm
              ? hhmmLocal(new Date(new Date(f.chamadaEm).getTime() + toleranciaMin * 60_000).toISOString())
              : null
          return (
            <div key={f.id} className="flex items-end">
              {i > 0 && <span className="mb-6 px-0.5 text-slate-200">·</span>}
              <div className="relative flex w-[4.5rem] shrink-0 flex-col items-center border-b-2 border-dashed border-slate-200 pb-1">
                <button
                  onClick={() => remover(f)}
                  disabled={ocupado === f.id}
                  aria-label={`Remover ${f.nome} da fila`}
                  className="absolute -right-0.5 -top-0.5 z-10 grid h-4.5 w-4.5 place-items-center rounded-full bg-white text-[10px] font-bold text-slate-400 ring-1 ring-slate-200 disabled:opacity-60"
                >
                  {ocupado === f.id ? '…' : '✕'}
                </button>
                <span className="relative">
                  <span
                    className={`grid h-11 w-11 place-items-center overflow-hidden rounded-full ring-2 ${
                      chamada ? 'bg-emerald-50 ring-emerald-400' : 'bg-slate-100 ring-slate-200'
                    }`}
                  >
                    {f.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.foto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl">🧒</span>
                    )}
                  </span>
                  <span
                    className={`absolute -bottom-1 -left-1 grid h-5 min-w-5 place-items-center rounded-full px-0.5 text-[10px] font-bold ring-1 ring-white ${
                      chamada ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
                    }`}
                  >
                    {chamada ? '🔔' : i + 1}
                  </span>
                </span>
                <span className="mt-1 w-full truncate text-center text-[11px] font-semibold text-slate-600">
                  {primeiroNome(f.nome)}
                </span>
                <span className={`text-[10px] ${chamada ? 'font-bold text-emerald-600' : 'text-slate-400'}`}>
                  {chamada && prazo ? `até ${prazo}` : hhmmLocal(f.criadaEm)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {erro && <p className="pb-1 text-sm font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
