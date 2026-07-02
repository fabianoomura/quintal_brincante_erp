import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/dinheiro'
import { pill } from '@/lib/ui'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default async function MensalistasPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('mensalidade')
    .select('id, valor, dia_vencimento, dias_semana, crianca:crianca_id (id, nome, foto), plano:plano_id (nome)')
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-700">🎟️ Mensalistas</h1>
        <Link href="/planos" className={pill}>
          Planos
        </Link>
      </div>

      <p className="text-sm text-slate-500">{rows?.length ?? 0} matrícula(s) ativa(s).</p>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows?.map((m) => (
          <li key={m.id}>
            <Link
              href={`/criancas/${m.crianca?.id}`}
              className="pop flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200 hover:shadow-md"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-500 font-display font-bold text-white">
                {m.crianca?.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.crianca.foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  (m.crianca?.nome ?? '?').replace(/\[seed\]/g, '').trim().slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-semibold text-slate-800">
                  {(m.crianca?.nome ?? '—').replace(/\[seed\]/g, '').trim()}
                </span>
                <span className="text-xs text-slate-500">
                  {m.plano?.nome ?? 'Mensalidade'} · {formatBRL(m.valor)} · vence {m.dia_vencimento}
                  {m.dias_semana?.length ? ` · ${m.dias_semana.map((d) => DIAS[d]).join(',')}` : ''}
                </span>
              </span>
              <span className="text-slate-300">›</span>
            </Link>
          </li>
        ))}
      </ul>

      {rows && rows.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Nenhum mensalista ativo. Matricule uma criança na ficha dela. 🎈
        </p>
      )}
    </div>
  )
}
