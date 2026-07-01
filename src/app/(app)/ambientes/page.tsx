import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import { card } from '@/lib/ui'
import AmbienteForm from './ambiente-form'
import ToggleAmbiente from './toggle-ambiente'

export default async function AmbientesPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: ambientes } = await supabase
    .from('ambiente')
    .select('id, nome, capacidade, ativo')
    .order('ativo', { ascending: false })
    .order('nome', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🏠 Ambientes</h1>
      </div>

      <p className="text-sm text-slate-500">
        Opcional — salas/espaços com lotação própria. Se não usar, deixe vazio.
      </p>

      <ul className="space-y-2">
        {ambientes?.map((a) => (
          <li key={a.id} className={`flex items-center justify-between ${card}`}>
            <div>
              <div className="font-display text-lg font-semibold">{a.nome}</div>
              <div className="text-xs text-slate-500">
                {a.capacidade != null ? `capacidade ${a.capacidade}` : 'sem limite'}
                {!a.ativo && ' · inativo'}
              </div>
            </div>
            <ToggleAmbiente id={a.id} ativo={a.ativo} />
          </li>
        ))}
      </ul>

      {ambientes && ambientes.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          Nenhum ambiente. Crie abaixo se você controla salas distintas. 🏡
        </p>
      )}

      <AmbienteForm />
    </div>
  )
}
