'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { entrarNaFila, sairDaFila } from './fila-actions'
import BuscaCrianca from '../busca-crianca'

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

// Fila de espera do play: quem foi chamado (com o prazo correndo) e quem aguarda,
// em ordem de chegada. Quando abre vaga, o sistema chama e avisa no WhatsApp.
export default function FilaEspera({
  fila,
  toleranciaMin,
  criancas,
}: {
  fila: FilaItem[]
  toleranciaMin: number
  criancas: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [criancaId, setCriancaId] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function adicionar() {
    if (!criancaId) return
    setErro(null)
    setOcupado('add')
    try {
      const res = await entrarNaFila(criancaId)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      setCriancaId('')
      router.refresh()
    } catch (e) {
      setErro(`Não consegui adicionar (${e instanceof Error ? e.message : 'erro'}).`)
    } finally {
      setOcupado(null)
    }
  }

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
    <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="font-display text-base font-bold text-slate-600">
        ⏳ Fila de espera {fila.length > 0 && `(${fila.length})`}
      </div>

      {fila.length === 0 && (
        <p className="text-sm text-slate-400">Ninguém aguardando. 🎈</p>
      )}

      <ul className="space-y-2">
        {chamadas.map((f) => {
          const prazo = f.chamadaEm
            ? new Date(new Date(f.chamadaEm).getTime() + toleranciaMin * 60_000).toISOString()
            : null
          return (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-display font-semibold text-emerald-800">
                  🔔 {f.nome}
                </div>
                <div className="text-xs text-emerald-700">
                  chamada {f.chamadaEm ? `às ${hhmmLocal(f.chamadaEm)}` : ''}
                  {prazo ? ` · tem até ${hhmmLocal(prazo)} para chegar` : ''}
                </div>
              </div>
              <button
                onClick={() => remover(f)}
                disabled={ocupado === f.id}
                className="pop shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200 disabled:opacity-60"
              >
                {ocupado === f.id ? '…' : '✕ remover'}
              </button>
            </li>
          )
        })}

        {aguardando.map((f, i) => (
          <li
            key={f.id}
            className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white font-display text-sm font-bold text-slate-500 ring-1 ring-slate-200">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display font-semibold text-slate-700">{f.nome}</div>
              <div className="text-xs text-slate-500">na fila desde {hhmmLocal(f.criadaEm)}</div>
            </div>
            <button
              onClick={() => remover(f)}
              disabled={ocupado === f.id}
              className="pop shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200 disabled:opacity-60"
            >
              {ocupado === f.id ? '…' : '✕ remover'}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-end gap-2 pt-1">
        <div className="min-w-0 flex-1">
          <BuscaCrianca criancas={criancas} value={criancaId} onChange={setCriancaId} />
        </div>
        <button
          onClick={adicionar}
          disabled={!criancaId || ocupado === 'add'}
          className="pop shrink-0 rounded-full bg-amber-500 px-5 py-3 font-display font-bold text-white shadow-sm disabled:opacity-50"
        >
          {ocupado === 'add' ? '…' : '+ Fila'}
        </button>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
