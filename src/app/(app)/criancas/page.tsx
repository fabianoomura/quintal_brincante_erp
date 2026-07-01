import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { input, pill } from '@/lib/ui'

export default async function CriancasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const busca = (q ?? '').trim()

  const supabase = await createClient()
  let query = supabase
    .from('crianca')
    .select('id, nome, nascimento, ativo')
    .order('nome', { ascending: true })
    .limit(100)
  if (busca !== '') query = query.ilike('nome', `%${busca}%`)

  const { data: criancas, error } = await query

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
      </form>

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
