import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { input, pill } from '@/lib/ui'

export default async function CriancasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tipo?: string }>
}) {
  const sp = await searchParams
  const busca = (sp.q ?? '').trim()
  const status = sp.status ?? 'ativa' // ativa | inativa | todas
  const tipo = sp.tipo ?? 'todos' // todos | mensalista

  const supabase = await createClient()

  let criancas: { id: string; nome: string; ativo: boolean }[] | null = null
  let error: { message: string } | null = null

  if (tipo === 'mensalista') {
    let q = supabase
      .from('crianca')
      .select('id, nome, ativo, mensalidade!inner(id)')
      .eq('mensalidade.ativo', true)
      .order('nome', { ascending: true })
      .limit(200)
    if (busca !== '') q = q.ilike('nome', `%${busca}%`)
    if (status === 'ativa') q = q.eq('ativo', true)
    else if (status === 'inativa') q = q.eq('ativo', false)
    const res = await q
    error = res.error
    criancas = (res.data ?? []).map((c) => ({ id: c.id, nome: c.nome, ativo: c.ativo }))
  } else {
    let q = supabase
      .from('crianca')
      .select('id, nome, ativo')
      .order('nome', { ascending: true })
      .limit(200)
    if (busca !== '') q = q.ilike('nome', `%${busca}%`)
    if (status === 'ativa') q = q.eq('ativo', true)
    else if (status === 'inativa') q = q.eq('ativo', false)
    const res = await q
    error = res.error
    criancas = res.data
  }

  const chip = (campo: string, valor: string, atual: string, txt: string) => {
    const params = new URLSearchParams()
    if (busca) params.set('q', busca)
    params.set('status', campo === 'status' ? valor : status)
    params.set('tipo', campo === 'tipo' ? valor : tipo)
    const ativo = atual === valor
    return (
      <Link
        href={`/criancas?${params.toString()}`}
        className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
          ativo
            ? 'bg-emerald-600 text-white ring-emerald-600'
            : 'bg-white text-slate-500 ring-slate-200'
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

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={busca}
          placeholder="🔎 Buscar por nome…"
          className={input}
        />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="tipo" value={tipo} />
      </form>

      <div className="flex flex-wrap gap-2">
        {chip('status', 'ativa', status, 'Ativas')}
        {chip('status', 'inativa', status, 'Inativas')}
        {chip('status', 'todas', status, 'Todas')}
        <span className="w-px self-stretch bg-slate-200" />
        {chip('tipo', 'todos', tipo, 'Todos os tipos')}
        {chip('tipo', 'mensalista', tipo, '🎟️ Mensalistas')}
      </div>

      {error && (
        <p className="text-sm font-semibold text-rose-500">
          Erro ao carregar: {error.message}
        </p>
      )}

      {criancas && criancas.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {busca
            ? 'Nenhuma criança encontrada. 🙈'
            : 'Nenhuma criança cadastrada ainda. Toque em “+ Nova”! 🎈'}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {criancas?.map((c, i) => {
          const cores = ['bg-rose-500', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-emerald-500']
          const cor = cores[i % cores.length]
          const iniciais = c.nome
            .replace(/\[seed\]/g, '')
            .trim()
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
          return (
            <li key={c.id}>
              <Link
                href={`/criancas/${c.id}`}
                className="pop flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${cor} font-display font-bold text-white`}>
                  {iniciais}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display font-semibold text-slate-800">
                    {c.nome.replace(/\[seed\]/g, '').trim()}
                  </span>
                  <span className="text-xs text-slate-400">
                    {c.ativo ? 'ativa' : 'inativa'}
                  </span>
                </span>
                <span className="text-slate-300">›</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
