import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import BaixaButton from './baixa-button'

type StatusFiltro = 'pendente' | 'pago' | 'todos'

const STATUS_CHIP: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-slate-200 text-slate-500',
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; de?: string; ate?: string }>
}) {
  const sp = await searchParams
  const status = (sp.status as StatusFiltro) ?? 'pendente'
  const de = sp.de ?? ''
  const ate = sp.ate ?? ''

  const supabase = await createClient()
  let query = supabase
    .from('lancamento')
    .select(
      'id, descricao, valor, vencimento, status, origem_tipo, pago_em, crianca:crianca_id (nome)',
    )
    .order('vencimento', { ascending: false })
    .limit(200)
  if (status !== 'todos') query = query.eq('status', status)
  if (de) query = query.gte('vencimento', de)
  if (ate) query = query.lte('vencimento', ate)

  const { data: lancamentos, error } = await query

  const total = (lancamentos ?? []).reduce((s, l) => s + Number(l.valor), 0)

  // Recebido por MODALIDADE (pagos no período), independente do filtro de status.
  let pagosQ = supabase.from('lancamento').select('valor, capture_method').eq('status', 'pago')
  if (de) pagosQ = pagosQ.gte('vencimento', de)
  if (ate) pagosQ = pagosQ.lte('vencimento', ate)
  const { data: pagos } = await pagosQ

  function bucket(cm: string | null): string {
    if (cm === 'pix') return 'pix'
    if (cm === 'dinheiro') return 'dinheiro'
    if (cm === 'maquininha') return 'maquininha'
    if (cm && ['cartao', 'credit', 'debit', 'credit_card'].includes(cm)) return 'cartao'
    return 'outros'
  }
  const porModalidade: Record<string, number> = {}
  let totalRecebido = 0
  for (const p of pagos ?? []) {
    const v = Number(p.valor)
    totalRecebido += v
    const b = bucket(p.capture_method)
    porModalidade[b] = (porModalidade[b] ?? 0) + v
  }
  const MODALIDADES: { k: string; label: string; cls: string }[] = [
    { k: 'dinheiro', label: '💵 Dinheiro', cls: 'bg-emerald-100 text-emerald-800' },
    { k: 'pix', label: '📱 Pix', cls: 'bg-sky-100 text-sky-800' },
    { k: 'cartao', label: '💳 Cartão', cls: 'bg-violet-100 text-violet-800' },
    { k: 'maquininha', label: '🏧 Maquininha', cls: 'bg-amber-100 text-amber-800' },
  ]

  const qs = new URLSearchParams({ status, ...(de && { de }), ...(ate && { ate }) })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">💰 Financeiro</h1>
      </div>

      {/* Recebido por modalidade (no período) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl bg-slate-800 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">Todos (recebido)</div>
          <div className="font-display text-xl font-bold">{formatBRL(totalRecebido)}</div>
        </div>
        {MODALIDADES.map((m) => (
          <div key={m.k} className={`rounded-2xl p-4 shadow-sm ring-1 ring-black/5 ${m.cls}`}>
            <div className="text-xs font-semibold opacity-80">{m.label}</div>
            <div className="font-display text-xl font-bold">{formatBRL(porModalidade[m.k] ?? 0)}</div>
          </div>
        ))}
      </div>
      {(porModalidade['outros'] ?? 0) > 0 && (
        <p className="text-xs text-slate-400">
          Outros (sem modalidade): {formatBRL(porModalidade['outros'])}
        </p>
      )}

      <form method="get" className={`space-y-3 ${card}`}>
        <div className="flex flex-wrap gap-2">
          {(['pendente', 'pago', 'todos'] as StatusFiltro[]).map((s) => (
            <label key={s} className="cursor-pointer">
              <input
                type="radio"
                name="status"
                value={s}
                defaultChecked={status === s}
                className="peer sr-only"
              />
              <span className="block rounded-full border-2 border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-500 peer-checked:border-emerald-400 peer-checked:bg-emerald-50 peer-checked:text-emerald-700">
                {s === 'pendente' ? 'Pendentes' : s === 'pago' ? 'Pagos' : 'Todos'}
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-slate-500">
            De
            <input
              type="date"
              name="de"
              defaultValue={de}
              className="mt-1 block rounded-2xl border-2 border-amber-200 bg-amber-50/40 px-3 py-2 text-base"
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Até
            <input
              type="date"
              name="ate"
              defaultValue={ate}
              className="mt-1 block rounded-2xl border-2 border-amber-200 bg-amber-50/40 px-3 py-2 text-base"
            />
          </label>
          <button
            type="submit"
            className="pop rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-slate-500">
          {lancamentos?.length ?? 0} lançamento(s) · total{' '}
          <strong>{formatBRL(total)}</strong>
        </span>
        <a
          href={`/financeiro/export?${qs.toString()}`}
          className="text-sm font-semibold text-emerald-700"
        >
          ⬇️ Exportar CSV
        </a>
      </div>

      {error && (
        <p className="text-sm font-semibold text-rose-500">Erro: {error.message}</p>
      )}

      {lancamentos && lancamentos.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          Nenhum lançamento neste filtro. 🧾
        </p>
      )}

      <ul className="grid gap-2 lg:grid-cols-2">
        {lancamentos?.map((l) => (
          <li key={l.id} className={`flex items-center justify-between ${card}`}>
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {l.crianca?.nome ?? '—'}
              </div>
              <div className="text-xs text-slate-500">
                {l.descricao} · vence {l.vencimento}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-lg font-bold text-slate-700">
                  {formatBRL(l.valor)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_CHIP[l.status] ?? ''
                  }`}
                >
                  {l.status}
                </span>
              </div>
            </div>
            {l.status === 'pendente' && <BaixaButton lancamentoId={l.id} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
