import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import PlanoForm from './plano-form'
import { requireAdmin } from '@/lib/colaborador'

export default async function PlanosPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: planos } = await supabase
    .from('plano_mensalidade')
    .select('id, nome, dias_por_semana, valor, ativo')
    .order('dias_por_semana', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🎟️ Planos de mensalidade</h1>
      </div>

      <p className="text-sm text-slate-500">
        O preço varia pela frequência (quantos dias por semana a criança vem).
      </p>

      <ul className="space-y-2">
        {planos?.map((p) => (
          <li key={p.id} className={`flex items-center justify-between ${card}`}>
            <div>
              <div className="font-display text-lg font-semibold">{p.nome}</div>
              <div className="text-xs text-slate-500">
                {p.dias_por_semana === 7 ? 'Todos os dias' : `${p.dias_por_semana}x/semana`}
                {!p.ativo && ' · inativo'}
              </div>
            </div>
            <span className="font-display text-lg font-bold text-emerald-700">
              {formatBRL(p.valor)}
            </span>
          </li>
        ))}
      </ul>

      {planos && planos.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          Nenhum plano ainda. Crie o primeiro abaixo. 🎈
        </p>
      )}

      <PlanoForm />
    </div>
  )
}
