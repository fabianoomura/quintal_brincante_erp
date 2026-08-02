import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/dinheiro'
import { hojeISO } from '@/lib/datas'
import { card } from '@/lib/ui'
import { valorMovimentadoLancamento } from '@/lib/financeiro'
import AvulsoForm from './avulso-form'
import LancamentosLista from './lancamentos-lista'
import { normalizarFiltrosFinanceiros, STATUS_FINANCEIRO } from '@/lib/financeiro-filtros'
import { buscarLancamentosRelatorio } from './export/dados'

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; de?: string; ate?: string; origem?: string; modalidade?: string }>
}) {
  const sp = await searchParams
  // Padrão: mostra o DIA ATUAL (só na primeira abertura, sem params). Ao limpar os
  // campos e filtrar, chegam como '' — aí volta a ver tudo.
  const hoje = hojeISO()
  const filtros = normalizarFiltrosFinanceiros(sp, hoje)
  const { status, origem, modalidade, de, ate } = filtros

  const supabase = await createClient()
  const { data: lancamentosAsc, erro: erroLancamentos } = filtros.erro
    ? { data: [], erro: null }
    : await buscarLancamentosRelatorio(filtros)
  const { data: pagos, erro: erroPagos } = filtros.erro
    ? { data: [], erro: null }
    : await buscarLancamentosRelatorio({ ...filtros, status: 'pago' })
  const lancamentos = lancamentosAsc.toReversed()

  const total = lancamentos.reduce(
    (s, l) => s + (l.status === 'cancelado'
      ? 0
      : l.status === 'pago'
        ? valorMovimentadoLancamento(l.valor, l.desconto, l.modalidade)
        : Math.max(0, l.valor - l.desconto)),
    0,
  )

  // Recebido por MODALIDADE (pagos no período), líquido do desconto.
  const [{ data: criancasAtivas }, { data: cfgDesc }] = await Promise.all([
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
  for (const p of pagos) {
    const v = valorMovimentadoLancamento(p.valor, p.desconto, p.modalidade)
    totalRecebido += v
    const b = bucket(p.modalidade)
    porModalidade[b] = (porModalidade[b] ?? 0) + v
  }
  const MODALIDADES: { k: string; label: string; cls: string }[] = [
    { k: 'dinheiro', label: '💵 Dinheiro', cls: 'bg-emerald-100 text-emerald-800' },
    { k: 'pix', label: '📱 Pix', cls: 'bg-sky-100 text-sky-800' },
    { k: 'debito', label: '💳 Débito', cls: 'bg-violet-100 text-violet-800' },
    { k: 'credito', label: '💳 Crédito', cls: 'bg-fuchsia-100 text-fuchsia-800' },
  ]

  const qs = new URLSearchParams({ status, origem, modalidade, ...(de && { de }), ...(ate && { ate }) })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/sistema" className="text-sm font-semibold text-slate-500">
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
          {STATUS_FINANCEIRO.map((s) => (
            <label key={s} className="cursor-pointer">
              <input
                type="radio"
                name="status"
                value={s}
                defaultChecked={status === s}
                className="peer sr-only"
              />
              <span className="block rounded-full border-2 border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-500 peer-checked:border-emerald-400 peer-checked:bg-emerald-50 peer-checked:text-emerald-700">
                {s === 'pendente' ? 'Pendentes' : s === 'pago' ? 'Pagos' : s === 'cancelado' ? 'Cancelados' : 'Todos'}
              </span>
            </label>
          ))}
        </div>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
        <label className="text-xs font-semibold text-slate-500">
          Origem
          <select name="origem" defaultValue={origem} className="mt-1 block rounded-2xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm">
            <option value="todos">Todas</option><option value="presenca">Play / Diária</option>
            <option value="mensalidade">Mensalidade</option><option value="colonia">Colônia</option>
            <option value="avulso">Avulso</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Modalidade
          <select name="modalidade" defaultValue={modalidade} className="mt-1 block rounded-2xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm">
            <option value="todos">Todas</option><option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option><option value="debito">Débito</option>
            <option value="credito">Crédito</option><option value="cortesia">Cortesia</option>
          </select>
        </label>
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
        <Link href="/financeiro" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">
          Limpar
        </Link>
      </form>

      {/* Resultado + ações na mesma linha */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="mr-auto text-sm text-slate-500">
          {lancamentos.length} lançamento(s) · total do filtro{' '}
          <strong>{formatBRL(total)}</strong>
        </span>
        <AvulsoForm criancas={criancasAtivas ?? []} />
        <a href={`/financeiro/export.xlsx?${qs.toString()}`} className="text-sm font-semibold text-emerald-700">📊 Exportar Excel</a>
        <a href={`/financeiro/export?${qs.toString()}`} className="text-sm font-semibold text-slate-500">CSV</a>
      </div>

      {(filtros.erro || erroLancamentos || erroPagos) && (
        <p className="text-sm font-semibold text-rose-500">Erro: {filtros.erro ?? erroLancamentos ?? erroPagos}</p>
      )}

      <LancamentosLista
        descontoAtivo={descontoAtivo}
        lancamentos={lancamentos.map((l) => ({
          id: l.id,
          descricao: l.descricao,
          valor: Number(l.valor),
          desconto: Number(l.desconto),
          vencimento: l.vencimento,
          status: l.status,
          captureMethod: l.modalidade,
          createdAt: l.createdAt,
          pagoEm: l.pagoEm,
          conciliadoPor: l.conciliadoPor,
          recebidoPor: l.recebidoPor,
          nome: l.crianca || '—',
        }))}
      />
    </div>
  )
}
