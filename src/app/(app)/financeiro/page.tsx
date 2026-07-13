import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import BaixaButton from './baixa-button'
import AvulsoForm from './avulso-form'

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
      'id, descricao, valor, desconto, vencimento, status, origem_tipo, pago_em, crianca:crianca_id (nome)',
    )
    .order('vencimento', { ascending: false })
    .limit(200)
  if (status !== 'todos') query = query.eq('status', status)
  if (de) query = query.gte('vencimento', de)
  if (ate) query = query.lte('vencimento', ate)

  const { data: lancamentos, error } = await query

  const total = (lancamentos ?? []).reduce((s, l) => s + Number(l.valor) - Number(l.desconto), 0)

  // Recebido por MODALIDADE (pagos no período), líquido do desconto.
  let pagosQ = supabase.from('lancamento').select('valor, desconto, capture_method').eq('status', 'pago')
  if (de) pagosQ = pagosQ.gte('vencimento', de)
  if (ate) pagosQ = pagosQ.lte('vencimento', ate)
  const [{ data: pagos }, { data: criancasAtivas }, { data: cfgDesc }] = await Promise.all([
    pagosQ,
    supabase.from('crianca').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('config_sistema').select('desconto_ativo').eq('id', 1).maybeSingle(),
  ])
  const descontoAtivo = cfgDesc?.desconto_ativo ?? false

  function bucket(cm: string | null): string {
    if (cm === 'pix') return 'pix'
    if (cm === 'dinheiro') return 'dinheiro'
    if (cm === 'debito') return 'debito'
    if (cm === 'credito') return 'credito'
    if (cm && ['cartao', 'credit', 'debit', 'credit_card'].includes(cm)) return 'credito' // legado
    return 'outros' // maquininha, sem modalidade, etc.
  }
  const porModalidade: Record<string, number> = {}
  let totalRecebido = 0
  for (const p of pagos ?? []) {
    const v = Number(p.valor) - Number(p.desconto)
    totalRecebido += v
    const b = bucket(p.capture_method)
    porModalidade[b] = (porModalidade[b] ?? 0) + v
  }
  const MODALIDADES: { k: string; label: string; cls: string }[] = [
    { k: 'dinheiro', label: '💵 Dinheiro', cls: 'bg-emerald-100 text-emerald-800' },
    { k: 'pix', label: '📱 Pix', cls: 'bg-sky-100 text-sky-800' },
    { k: 'debito', label: '💳 Débito', cls: 'bg-violet-100 text-violet-800' },
    { k: 'credito', label: '💳 Crédito', cls: 'bg-fuchsia-100 text-fuchsia-800' },
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
        <div className="rounded-2xl bg-slate-800 px-3.5 py-2.5 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">Todos (recebido)</div>
          <div className="font-display text-lg font-bold">{formatBRL(totalRecebido)}</div>
        </div>
        {MODALIDADES.map((m) => (
          <div key={m.k} className={`rounded-2xl px-3.5 py-2.5 shadow-sm ring-1 ring-black/5 ${m.cls}`}>
            <div className="text-xs font-semibold opacity-80">{m.label}</div>
            <div className="font-display text-lg font-bold">{formatBRL(porModalidade[m.k] ?? 0)}</div>
          </div>
        ))}
      </div>
      {(porModalidade['outros'] ?? 0) > 0 && (
        <p className="text-xs text-slate-400">
          Outros (sem modalidade): {formatBRL(porModalidade['outros'])}
        </p>
      )}

      {/* Filtros numa linha só */}
      <form method="get" className={`flex flex-wrap items-end gap-2 ${card}`}>
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
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
        <label className="text-xs font-semibold text-slate-500">
          De
          <input
            type="date"
            name="de"
            defaultValue={de}
            className="mt-1 block rounded-2xl border-2 border-amber-200 bg-amber-50/40 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Até
          <input
            type="date"
            name="ate"
            defaultValue={ate}
            className="mt-1 block rounded-2xl border-2 border-amber-200 bg-amber-50/40 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="pop rounded-full bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
        >
          Filtrar
        </button>
      </form>

      {/* Resultado + ações na mesma linha */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="mr-auto text-sm text-slate-500">
          {lancamentos?.length ?? 0} lançamento(s) · total{' '}
          <strong>{formatBRL(total)}</strong>
        </span>
        <AvulsoForm criancas={criancasAtivas ?? []} />
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
                  {formatBRL(Number(l.valor) - Number(l.desconto))}
                </span>
                {Number(l.desconto) > 0 && (
                  <span className="text-xs text-rose-500 line-through">{formatBRL(l.valor)}</span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_CHIP[l.status] ?? ''
                  }`}
                >
                  {l.status}
                </span>
              </div>
            </div>
            {l.status === 'pendente' && (
              <BaixaButton lancamentoId={l.id} valor={Number(l.valor)} descontoAtivo={descontoAtivo} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
