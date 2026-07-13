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
        <>
          <p className="text-xs font-semibold text-slate-400">{filtradas.length} criança(s)</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtradas.map((c, i) => {
              const nome = limpar(c.nome)
              const iniciais = nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
              return (
                <li key={c.id}>
                  <Link
                    href={`/criancas/${c.id}`}
                    className="pop flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full ${CORES[i % CORES.length]} font-display text-xs font-bold text-white`}>
                      {c.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        iniciais
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-display font-semibold text-slate-800">
                      {nome}
                    </span>
                    {!c.ativo && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                        inativa
                      </span>
                    )}
                    <span className="text-slate-300">›</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
