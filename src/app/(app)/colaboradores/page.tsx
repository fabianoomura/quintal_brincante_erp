import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import ColaboradorForm from './colaborador-form'
import ColaboradorRow from './colaborador-row'

export default async function ColaboradoresPage() {
  const me = await requireAdmin()
  const supabase = await createClient()

  const { data: colaboradores } = await supabase
    .from('colaborador')
    .select('id, nome, funcao, papel_acesso, ativo')
    .order('ativo', { ascending: false })
    .order('nome', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🧑‍🏫 Colaboradores</h1>
      </div>

      <ul className="space-y-2">
        {colaboradores?.map((c) => (
          <ColaboradorRow
            key={c.id}
            id={c.id}
            nome={c.nome}
            funcao={c.funcao}
            papel={c.papel_acesso}
            ativo={c.ativo}
            ehVoce={c.id === me.id}
          />
        ))}
      </ul>

      <ColaboradorForm />
    </div>
  )
}
