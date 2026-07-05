'use client'

import { useMemo, useState } from 'react'

type Crianca = { id: string; nome: string }

// tira acentos e caixa p/ a busca ser "esperta" (mesmo estilo da tela Crianças)
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Busca com filtro enquanto digita + seleção por toque. Controlado por `value`.
export default function BuscaCrianca({
  criancas,
  value,
  onChange,
  placeholder = '🔎 Buscar criança pelo nome…',
}: {
  criancas: Crianca[]
  value: string // id da criança selecionada ('' = nenhuma)
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const selecionada = criancas.find((c) => c.id === value) ?? null

  const filtradas = useMemo(() => {
    const termo = norm(q.trim())
    if (termo === '') return []
    return criancas.filter((c) => norm(c.nome).includes(termo)).slice(0, 8)
  }, [q, criancas])

  if (selecionada) {
    return (
      <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
        <span className="truncate font-display font-bold text-emerald-800">
          🧒 {selecionada.nome}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange('')
            setQ('')
          }}
          className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
        >
          trocar ✕
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-50/40 px-4 py-3 text-base outline-none focus:border-fuchsia-400"
      />
      {filtradas.length > 0 && (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {filtradas.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onChange(c.id)}
                className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 hover:bg-fuchsia-50"
              >
                {c.nome}
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim() !== '' && filtradas.length === 0 && (
        <p className="px-1 text-sm text-slate-400">Nenhuma criança encontrada. 🙈</p>
      )}
    </div>
  )
}
