import { createClient } from '@/lib/supabase/server'
import { hojeISO, hhmm } from '@/lib/datas'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import ReceberButton from '../receber-button'
import CobrarButton from '../cobrar-button'
import { getColaboradorAtual } from '@/lib/colaborador'
import ExcluirOperacaoButton from './excluir-operacao-button'

// Visão geral do play: sessões que já saíram HOJE, com valor e pago/pendente.
export default async function ConcluidasHoje() {
  const supabase = await createClient()
  const hoje = hojeISO()
  const colaborador = await getColaboradorAtual()
  const ehAdmin = colaborador?.papel_acesso === 'admin'

  const { data: sessoes } = await supabase
    .from('presenca')
    .select('id, entrada, saida, valor, crianca:crianca_id (nome)')
    .eq('data', hoje)
    .eq('origem', 'espaco_kids')
    .not('saida', 'is', null)
    .order('saida', { ascending: false })

  const ids = (sessoes ?? []).map((s) => s.id)
  const porPresenca = new Map<string, { id: string; status: string; captureMethod: string | null }>()
  if (ids.length > 0) {
    const { data: lancs } = await supabase
      .from('lancamento')
      .select('id, origem_id, status, capture_method')
      .eq('origem_tipo', 'presenca')
      .in('origem_id', ids)
    for (const l of lancs ?? []) {
      if (l.origem_id) {
        porPresenca.set(l.origem_id, {
          id: l.id,
          status: l.status,
          captureMethod: l.capture_method,
        })
      }
    }
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
          const cortesia = lan?.captureMethod === 'cortesia'
          // sem lançamento = terminou sem valor na grade → dá pra cobrar retroativo
          const semCobranca = !lan
          return (
            <li key={p.id} className={`flex items-center justify-between ${card}`}>
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.crianca?.nome}</div>
                <div className="text-xs text-slate-500">
                  {hhmm(p.entrada)}{p.saida ? `–${hhmm(p.saida)}` : ''}
                  {semCobranca ? '' : ` · ${formatBRL(p.valor)}`}
                </div>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                    pago
                      ? 'bg-emerald-100 text-emerald-700'
                      : semCobranca
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {cortesia ? '🎁 cortesia' : pago ? 'pago' : semCobranca ? 'sem cobrança' : 'pendente'}
                </span>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-2">
                {lan && !pago && (
                  <ReceberButton
                    lancamentoId={lan.id}
                    valor={Number(p.valor ?? 0)}
                    nome={p.crianca?.nome ?? ''}
                    presencaId={p.id}
                  />
                )}
                {semCobranca && <CobrarButton presencaId={p.id} nome={p.crianca?.nome ?? ''} />}
                {ehAdmin && (
                  <ExcluirOperacaoButton presencaId={p.id} nome={p.crianca?.nome ?? 'esta criança'} />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
