import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import GradeRow from './grade-row'
import GradeForm from './grade-form'

export default async function GradePage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: grade } = await supabase
    .from('grade_play')
    .select('id, nome, dias_semana, hora_inicio, hora_fim, valor, capacidade, ativo')
    .order('hora_inicio', { ascending: true })
    .order('nome', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🎠 Grade do play</h1>
      </div>

      <p className="text-sm text-slate-500">
        Preço fixo por período (dia + horário). O sistema cobra o valor do período pela hora de
        entrada. Capacidade é opcional.
      </p>

      <div className="space-y-2">
        {grade?.map((g) => (
          <GradeRow
            key={g.id}
            id={g.id}
            nome={g.nome}
            dias_semana={g.dias_semana}
            hora_inicio={g.hora_inicio}
            hora_fim={g.hora_fim}
            valor={Number(g.valor)}
            capacidade={g.capacidade}
            ativo={g.ativo}
          />
        ))}
      </div>

      {grade && grade.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Nenhum período. Crie o primeiro abaixo. 🎠
        </p>
      )}

      <GradeForm />
    </div>
  )
}
