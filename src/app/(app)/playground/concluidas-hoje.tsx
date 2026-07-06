import { createClient } from '@/lib/supabase/server'
import { hojeISO, hhmm } from '@/lib/datas'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import ReceberButton from '../receber-button'

// Visão geral do play: sessões que já saíram HOJE, com valor e pago/pendente.
export default async function ConcluidasHoje() {
  const supabase = await createClient()
  const hoje = hojeISO()

  const { data: sessoes } = await supabase
    .from('presenca')
    .select('id, entrada, saida, valor, crianca:crianca_id (nome)')
    .eq('data', hoje)
    .eq('origem', 'espaco_kids')
    .not('saida', 'is', null)
    .order('saida', { ascending: false })

  const ids = (sessoes ?? []).map((s) => s.id)
  const porPresenca = new Map<string, { id: string; status: string }>()
  if (ids.length > 0) {
    const { data: lancs } = await supabase
      .from('lancamento')
      .select('id, origem_id, status')
      .eq('origem_tipo', 'presenca')
      .in('origem_id', ids)
    for (const l of lancs ?? []) if (l.origem_id) porPresenca.set(l.origem_id, { id: l.id, status: l.status })
  }

  if (!sessoes || sessoes.length === 0) return null

  const totalPend = sessoes.reduce((s, p) => {
    const lan = porPresenca.get(p.id)
    return s + (lan?.status === 'pendente' ? Number(p.valor ?? 0) : 0)
  }, 0)

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-slate-600">✅ Concluídas hoje ({sessoes.length})</h2>
        {totalPend > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
            {formatBRL(totalPend)} a receber
          </span>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sessoes.map((p) => {
          const lan = porPresenca.get(p.id)
          const pago = lan?.status === 'pago'
          return (
            <li key={p.id} className={`flex items-center justify-between ${card}`}>
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.crianca?.nome}</div>
                <div className="text-xs text-slate-500">
                  {hhmm(p.entrada)}{p.saida ? `–${hhmm(p.saida)}` : ''} · {formatBRL(p.valor)}
                </div>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    pago ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {pago ? 'pago' : 'pendente'}
                </span>
              </div>
              {lan && !pago && (
                <ReceberButton lancamentoId={lan.id} valor={Number(p.valor ?? 0)} nome={p.crianca?.nome ?? ''} />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
