import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import ColoniaForm from './colonia-form'

export default async function ColoniasPage() {
  const supabase = await createClient()
  const [colaborador, { data: colonias }] = await Promise.all([
    getColaboradorAtual(),
    supabase
      .from('colonia')
      .select('id, nome, inicio, fim, valor, vagas, ativo, inscricao_colonia(count)')
      .order('inicio', { ascending: false }),
  ])
  const ehAdmin = colaborador?.papel_acesso === 'admin'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🏕️ Colônia de férias</h1>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {colonias?.map((c) => {
          const inscritos = c.inscricao_colonia?.[0]?.count ?? 0
          return (
            <li key={c.id}>
              <Link
                href={`/colonias/${c.id}`}
                className={`pop flex items-center justify-between ${card}`}
              >
                <div>
                  <div className="font-display text-lg font-semibold">
                    {c.nome} {!c.ativo && <span className="text-xs text-slate-400">· inativa</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    {c.inicio} a {c.fim} · {formatBRL(c.valor)}
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                  {inscritos}
                  {c.vagas != null ? `/${c.vagas}` : ''} 🧒
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {colonias && colonias.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          Nenhuma colônia cadastrada. {ehAdmin ? 'Crie a primeira abaixo. ☀️' : ''}
        </p>
      )}

      {ehAdmin && <ColoniaForm />}
    </div>
  )
}
