'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { input } from '@/lib/ui'

type Crianca = { id: string; nome: string; ativo: boolean; foto: string | null }

const CORES = ['bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-emerald-500']

// tira acentos e caixa p/ a busca ser "esperta"
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function limpar(nome: string) {
  return nome.replace(/\[seed\]/g, '').trim()
}

export default function CriancasLista({ criancas }: { criancas: Crianca[] }) {
  const [q, setQ] = useState('')

  const filtradas = useMemo(() => {
    const termo = norm(q.trim())
    if (termo === '') return criancas
    return criancas.filter((c) => norm(limpar(c.nome)).includes(termo))
  }, [q, criancas])

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔎 Buscar por nome (filtra enquanto você digita)…"
        autoFocus
        className={input}
      />

      {filtradas.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {q.trim() ? 'Nenhuma criança encontrada. 🙈' : 'Nenhuma criança nesta lista.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((c, i) => {
            const nome = limpar(c.nome)
            const iniciais = nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
            return (
              <li key={c.id}>
                <Link
                  href={`/criancas/${c.id}`}
                  className="pop flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full ${CORES[i % CORES.length]} font-display font-bold text-white`}>
                    {c.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.foto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      iniciais
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display font-semibold text-slate-800">{nome}</span>
                    <span className="text-xs text-slate-400">{c.ativo ? 'ativa' : 'inativa'}</span>
                  </span>
                  <span className="text-slate-300">›</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
