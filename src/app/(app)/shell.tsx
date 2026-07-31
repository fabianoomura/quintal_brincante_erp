'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from './logout-action'
import AjudaButton from './ajuda-button'
import InstalarPwa from './instalar-pwa'
import { createClient } from '@/lib/supabase/client'

type Item = { href: string; label: string; icon: string; cor: string; adminOnly?: boolean }
type Grupo = { titulo: string; itens: Item[] }

const GRUPOS: Grupo[] = [
  {
    titulo: 'Operação',
    itens: [
      { href: '/presenca', label: 'Quem está aqui', icon: '📋', cor: 'bg-amber-100 text-amber-700' },
      { href: '/criancas', label: 'Crianças', icon: '👧', cor: 'bg-sky-100 text-sky-700' },
      { href: '/conversas', label: 'Conversas', icon: '💬', cor: 'bg-emerald-100 text-emerald-700' },
    ],
  },
  {
    titulo: 'Play',
    itens: [
      { href: '/playground', label: 'Play agora', icon: '🎠', cor: 'bg-fuchsia-100 text-fuchsia-700' },
      { href: '/grade', label: 'Preços e horários', icon: '🗓️', cor: 'bg-violet-100 text-violet-700', adminOnly: true },
      { href: '/calendario', label: 'Feriados', icon: '📅', cor: 'bg-orange-100 text-orange-700', adminOnly: true },
      { href: '/mensagens', label: 'Avisos do Play', icon: '💬', cor: 'bg-pink-100 text-pink-700', adminOnly: true },
    ],
  },
  {
    titulo: 'Mensalistas',
    itens: [
      { href: '/mensalistas', label: 'Mensalistas', icon: '🎟️', cor: 'bg-rose-100 text-rose-700' },
      { href: '/planos', label: 'Planos', icon: '📦', cor: 'bg-rose-100 text-rose-700', adminOnly: true },
    ],
  },
  {
    titulo: 'Colônia',
    itens: [{ href: '/colonias', label: 'Colônia de férias', icon: '🏕️', cor: 'bg-amber-100 text-amber-700' }],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { href: '/financeiro', label: 'Lançamentos', icon: '💰', cor: 'bg-emerald-100 text-emerald-700' },
      { href: '/faturamento', label: 'Faturamento', icon: '📈', cor: 'bg-teal-100 text-teal-700', adminOnly: true },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/gerencial', label: 'Gerencial', icon: '📊', cor: 'bg-indigo-100 text-indigo-700', adminOnly: true },
      { href: '/ambientes', label: 'Ambientes', icon: '🏠', cor: 'bg-lime-100 text-lime-700', adminOnly: true },
      { href: '/colaboradores', label: 'Colaboradores', icon: '🧑‍🏫', cor: 'bg-cyan-100 text-cyan-700', adminOnly: true },
      { href: '/configuracoes', label: 'Configurações', icon: '⚙️', cor: 'bg-violet-100 text-violet-700', adminOnly: true },
    ],
  },
]

function tituloDaRota(path: string): string {
  if (path === '/sistema') return 'Início'
  for (const g of GRUPOS) for (const i of g.itens) if (path.startsWith(i.href)) return i.label
  return 'Quintal Brincante'
}

export default function Shell({
  nome,
  ehAdmin,
  totalNaoLidasInicial,
  children,
}: {
  nome: string
  ehAdmin: boolean
  totalNaoLidasInicial: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [totalNaoLidas, setTotalNaoLidas] = useState(totalNaoLidasInicial)

  useEffect(() => {
    const supabase = createClient()
    async function atualizarTotal() {
      const { data } = await supabase
        .from('whatsapp_conversa')
        .select('nao_lidas')
        .eq('ativo', true)
        .gt('nao_lidas', 0)
      if (data) setTotalNaoLidas(data.reduce((soma, c) => soma + c.nao_lidas, 0))
    }
    const canal = supabase
      .channel('shell-conversas-nao-lidas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_conversa' },
        atualizarTotal,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  const NavConteudo = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-5 pt-2">
      <Link
        href="/sistema"
        onClick={() => setAberto(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          pathname === '/sistema' ? 'bg-white text-emerald-900 shadow-sm' : 'text-white/85 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-base">⌂</span>
        Visão geral
      </Link>

      {GRUPOS.map((g) => {
        const itens = g.itens.filter((i) => !i.adminOnly || ehAdmin)
        if (itens.length === 0) return null
        return (
          <div key={g.titulo} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
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
                    ativo ? 'bg-white text-emerald-950 shadow-sm' : 'text-white/78 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${i.cor} text-sm`}>
                    {i.icon}
                  </span>
                  {i.label}
                  {i.href === '/conversas' && totalNaoLidas > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm">
                      {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
                    </span>
                  )}
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
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-[#123b30] via-[#123b3d] to-[#27385d] text-white shadow-xl md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <Image src="/icon-192.png" alt="" width={38} height={38} className="rounded-xl shadow-md" />
          <div className="flex flex-col">
            <strong className="font-display text-base leading-tight">Quintal Brincante</strong>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/48">ERP da operação</span>
          </div>
        </div>
        {NavConteudo}
      </aside>

      {/* Gaveta mobile */}
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-gradient-to-b from-[#123b30] via-[#123b3d] to-[#27385d] text-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 font-display text-lg font-bold">
              <span className="flex items-center gap-2">
                <Image src="/icon-192.png" alt="" width={34} height={34} className="rounded-lg" />
                Quintal
              </span>
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-1.5 border-b border-emerald-950/8 bg-white/90 px-2.5 py-2 shadow-[0_1px_10px_rgba(28,57,47,0.04)] backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setAberto(true)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-base text-emerald-800 ring-1 ring-emerald-100 sm:h-9 sm:w-9 sm:rounded-xl sm:text-lg md:hidden"
              aria-label="Menu"
            >
              ☰
            </button>
            <h1 className="truncate font-display text-base font-bold text-[#20322c] sm:text-xl">
              {tituloDaRota(pathname)}
            </h1>
            <AjudaButton />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <InstalarPwa />
            <Link
              href="/conversas"
              className="relative grid h-8 w-8 place-items-center rounded-full bg-amber-50 text-base ring-1 ring-amber-200 transition hover:bg-amber-100 sm:h-9 sm:w-9 sm:text-lg"
              aria-label={
                totalNaoLidas > 0
                  ? `${totalNaoLidas} mensagem(ns) não lida(s)`
                  : 'Conversas, nenhuma mensagem não lida'
              }
              title={totalNaoLidas > 0 ? `${totalNaoLidas} mensagem(ns) não lida(s)` : 'Conversas'}
            >
              🔔
              {totalNaoLidas > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
                </span>
              )}
            </Link>
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100 sm:inline">
              {nome.split(' ')[0]} · {ehAdmin ? 'admin' : 'operador'}
            </span>
            <form action={logout}>
              <button className="rounded-full bg-[#20322c] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0c6f4b] sm:px-3.5 sm:text-sm">
                Sair
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-3 sm:p-4 md:p-7">{children}</main>
      </div>
    </div>
  )
}
