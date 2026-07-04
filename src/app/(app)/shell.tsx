'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from './logout-action'
import AjudaButton from './ajuda-button'

type Item = { href: string; label: string; icon: string; cor: string; adminOnly?: boolean }
type Grupo = { titulo: string; itens: Item[] }

const GRUPOS: Grupo[] = [
  {
    titulo: 'Operação',
    itens: [
      { href: '/presenca', label: 'Quem está aqui', icon: '📋', cor: 'bg-amber-500' },
      { href: '/criancas', label: 'Crianças', icon: '👧', cor: 'bg-sky-500' },
    ],
  },
  {
    titulo: 'Play',
    itens: [
      { href: '/playground', label: 'Playground', icon: '🎠', cor: 'bg-fuchsia-500' },
      { href: '/grade', label: 'Grade (valores)', icon: '🗓️', cor: 'bg-fuchsia-600', adminOnly: true },
      { href: '/calendario', label: 'Feriados', icon: '📅', cor: 'bg-orange-500', adminOnly: true },
      { href: '/mensagens', label: 'Mensagens', icon: '💬', cor: 'bg-fuchsia-700', adminOnly: true },
    ],
  },
  {
    titulo: 'Mensalistas',
    itens: [
      { href: '/mensalistas', label: 'Mensalistas', icon: '🎟️', cor: 'bg-pink-500' },
      { href: '/planos', label: 'Planos', icon: '📦', cor: 'bg-pink-600', adminOnly: true },
    ],
  },
  {
    titulo: 'Colônia',
    itens: [{ href: '/colonias', label: 'Colônia de férias', icon: '🏕️', cor: 'bg-yellow-500' }],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { href: '/financeiro', label: 'Lançamentos', icon: '💰', cor: 'bg-emerald-500' },
      { href: '/faturamento', label: 'Faturamento', icon: '📈', cor: 'bg-emerald-600', adminOnly: true },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/gerencial', label: 'Gerencial', icon: '📊', cor: 'bg-indigo-500', adminOnly: true },
      { href: '/ambientes', label: 'Ambientes', icon: '🏠', cor: 'bg-lime-500', adminOnly: true },
      { href: '/colaboradores', label: 'Colaboradores', icon: '🧑‍🏫', cor: 'bg-teal-500', adminOnly: true },
      { href: '/configuracoes', label: 'Configurações', icon: '⚙️', cor: 'bg-violet-500', adminOnly: true },
    ],
  },
]

function tituloDaRota(path: string): string {
  if (path === '/') return 'Início'
  for (const g of GRUPOS) for (const i of g.itens) if (path.startsWith(i.href)) return i.label
  return 'Quintal Brincante'
}

export default function Shell({
  nome,
  ehAdmin,
  children,
}: {
  nome: string
  ehAdmin: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)

  const NavConteudo = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
      <Link
        href="/"
        onClick={() => setAberto(false)}
        className={`flex items-center gap-2 rounded-xl px-3 py-2 font-semibold transition ${
          pathname === '/' ? 'bg-white/20' : 'hover:bg-white/10'
        }`}
      >
        <span className="text-xl">🌳</span> Início
      </Link>

      {GRUPOS.map((g) => {
        const itens = g.itens.filter((i) => !i.adminOnly || ehAdmin)
        if (itens.length === 0) return null
        return (
          <div key={g.titulo} className="space-y-1">
            <div className="px-3 text-xs font-bold uppercase tracking-wider text-white/50">
              {g.titulo}
            </div>
            {itens.map((i) => {
              const ativo = pathname.startsWith(i.href)
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setAberto(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    ativo ? 'bg-white/20 shadow-sm' : 'text-white/85 hover:bg-white/10'
                  }`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${i.cor} text-base shadow`}>
                    {i.icon}
                  </span>
                  {i.label}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-emerald-600 via-sky-700 to-violet-800 text-white shadow-xl md:flex">
        <div className="flex items-center gap-2 px-5 py-4 font-display text-lg font-bold">
          🌳 Quintal Brincante
        </div>
        {NavConteudo}
      </aside>

      {/* Gaveta mobile */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-gradient-to-b from-emerald-600 via-sky-700 to-violet-800 text-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 font-display text-lg font-bold">
              🌳 Quintal
              <button onClick={() => setAberto(false)} className="text-2xl leading-none">
                ×
              </button>
            </div>
            {NavConteudo}
          </aside>
        </div>
      )}

      {/* Coluna de conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAberto(true)}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-lg md:hidden"
              aria-label="Menu"
            >
              ☰
            </button>
            <h1 className="font-display text-xl font-bold text-slate-700">
              {tituloDaRota(pathname)}
            </h1>
            <AjudaButton />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 sm:inline">
              {nome.split(' ')[0]} · {ehAdmin ? 'admin' : 'operador'}
            </span>
            <form action={logout}>
              <button className="rounded-full bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white">
                Sair
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
