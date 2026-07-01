import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { pill } from '@/lib/ui'
import CriancasLista from './criancas-lista'

type Row = { id: string; nome: string; ativo: boolean; foto: string | null }

export default async function CriancasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tipo?: string }>
}) {
  const sp = await searchParams
  const status = sp.status ?? 'ativa' // ativa | inativa | todas
  const tipo = sp.tipo ?? 'todos' // todos | mensalista | colonia | play | diaria

  const supabase = await createClient()

  function aplicaStatus<T extends { eq: (c: 'ativo', v: boolean) => T }>(q: T): T {
    if (status === 'ativa') return q.eq('ativo', true)
    if (status === 'inativa') return q.eq('ativo', false)
    return q
  }

  let rows: Row[] = []
  let error: { message: string } | null = null

  if (tipo === 'mensalista') {
    const res = await aplicaStatus(
      supabase.from('crianca').select('id, nome, ativo, foto, mensalidade!inner(id)').eq('mensalidade.ativo', true).order('nome').limit(500),
    )
    error = res.error
    rows = res.data ?? []
  } else if (tipo === 'colonia') {
    const res = await aplicaStatus(
      supabase.from('crianca').select('id, nome, ativo, foto, inscricao_colonia!inner(id)').order('nome').limit(500),
    )
    error = res.error
    rows = res.data ?? []
  } else if (tipo === 'play' || tipo === 'diaria') {
    const origem = tipo === 'play' ? 'espaco_kids' : 'diaria'
    const res = await aplicaStatus(
      supabase.from('crianca').select('id, nome, ativo, foto, presenca!inner(id)').eq('presenca.origem', origem).order('nome').limit(500),
    )
    error = res.error
    rows = res.data ?? []
  } else {
    const res = await aplicaStatus(
      supabase.from('crianca').select('id, nome, ativo, foto').order('nome').limit(500),
    )
    error = res.error
    rows = res.data ?? []
  }

  // inner join pode repetir a criança (1 linha por presença/inscrição) → dedupe por id
  const vistos = new Set<string>()
  const criancas: Row[] = []
  for (const r of rows) {
    if (!vistos.has(r.id)) {
      vistos.add(r.id)
      criancas.push({ id: r.id, nome: r.nome, ativo: r.ativo, foto: r.foto })
    }
  }

  const TIPOS = [
    { v: 'todos', t: 'Todos os tipos' },
    { v: 'mensalista', t: '🎟️ Mensalista' },
    { v: 'play', t: '🎠 Play' },
    { v: 'diaria', t: '☀️ Diária' },
    { v: 'colonia', t: '🏕️ Colônia' },
  ]
  const STATUS = [
    { v: 'ativa', t: 'Ativas' },
    { v: 'inativa', t: 'Inativas' },
    { v: 'todas', t: 'Todas' },
  ]

  function chip(campo: 'status' | 'tipo', valor: string, atual: string, txt: string) {
    const params = new URLSearchParams({
      status: campo === 'status' ? valor : status,
      tipo: campo === 'tipo' ? valor : tipo,
    })
    return (
      <Link
        key={campo + valor}
        href={`/criancas?${params.toString()}`}
        className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
          atual === valor ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-500 ring-slate-200'
        }`}
      >
        {txt}
      </Link>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-700">👧 Crianças</h1>
        <Link href="/criancas/nova" className={pill}>
          + Nova
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS.map((s) => chip('status', s.v, status, s.t))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {TIPOS.map((t) => chip('tipo', t.v, tipo, t.t))}
      </div>

      {error && <p className="text-sm font-semibold text-rose-500">Erro ao carregar: {error.message}</p>}

      <CriancasLista criancas={criancas} />
    </div>
  )
}
