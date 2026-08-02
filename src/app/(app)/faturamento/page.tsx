import Link from 'next/link'
import { requireAdmin } from '@/lib/colaborador'
import { hojeISO } from '@/lib/datas'
import { formatBRL } from '@/lib/dinheiro'
import { valorMovimentadoLancamento } from '@/lib/financeiro'
import { normalizarMes, periodoDoMes } from '@/lib/financeiro-filtros'
import { buscarLancamentosRelatorio } from '../financeiro/export/dados'

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const pad = (n: number) => String(n).padStart(2, '0')
function addMes(ano: number, mes: number, delta: number): string {
  const d = new Date(ano, mes - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

const OPERACOES: { tipo: string; label: string; cor: string }[] = [
  { tipo: 'presenca', label: '🎠 Play / ☀️ Diária', cor: 'bg-fuchsia-100 text-fuchsia-800' },
  { tipo: 'mensalidade', label: '🎟️ Mensalidade', cor: 'bg-emerald-100 text-emerald-800' },
  { tipo: 'colonia', label: '🏕️ Colônia', cor: 'bg-amber-100 text-amber-800' },
  { tipo: 'avulso', label: '🧾 Avulso', cor: 'bg-sky-100 text-sky-800' },
]

export default async function FaturamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const mesParam = normalizarMes(sp.mes, hojeISO().slice(0, 7))
  const [ano, mes] = mesParam.split('-').map(Number)
  const periodo = periodoDoMes(mesParam)
  const { data: lancs, erro } = await buscarLancamentosRelatorio({
    status: 'todos', origem: 'todos', modalidade: 'todos', ...periodo,
  })

  const por: Record<string, { aReceber: number; recebido: number }> = {}
  let totAReceber = 0
  let totRecebido = 0
  let totCortesia = 0
  let qtdCortesia = 0
  for (const l of lancs) {
    const t = l.origem || 'avulso'
    por[t] ??= { aReceber: 0, recebido: 0 }
    const v = Math.max(0, l.valor - l.desconto)
    if (l.status === 'pago') {
      const movimentado = valorMovimentadoLancamento(l.valor, l.desconto, l.modalidade)
      por[t].recebido += movimentado
      totRecebido += movimentado
      if (l.modalidade === 'cortesia') {
        totCortesia += v
        qtdCortesia++
      }
    } else if (l.status === 'pendente') {
      por[t].aReceber += v
      totAReceber += v
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/sistema" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">📈 Faturamento</h1>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/faturamento?mes=${addMes(ano, mes, -1)}`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">← Anterior</Link>
        <div className="font-display text-lg font-bold text-slate-700">{MESES[mes]} de {ano}</div>
        <Link href={`/faturamento?mes=${addMes(ano, mes, 1)}`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">Próximo →</Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <label className="text-xs font-semibold text-slate-500">
          Mês de competência (vencimento)
          <input type="month" name="mes" defaultValue={mesParam} className="mt-1 block rounded-xl border-2 border-slate-200 px-3 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Ver mês</button>
        <a href={`/financeiro/export.xlsx?status=todos&origem=todos&modalidade=todos&de=${periodo.de}&ate=${periodo.ate}`} className="ml-auto text-sm font-semibold text-emerald-700">📊 Exportar Excel</a>
      </form>

      {erro && <p className="text-sm font-semibold text-rose-500">Erro ao carregar: {erro}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">Recebido no mês</div>
          <div className="font-display text-2xl font-bold">{formatBRL(totRecebido)}</div>
        </div>
        <div className="rounded-2xl bg-orange-500 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">A receber no mês</div>
          <div className="font-display text-2xl font-bold">{formatBRL(totAReceber)}</div>
        </div>
        <div className="col-span-2 rounded-2xl bg-slate-700 p-4 text-white shadow-sm lg:col-span-1">
          <div className="text-xs font-semibold opacity-80">Cortesias no mês</div>
          <div className="font-display text-2xl font-bold">{formatBRL(totCortesia)}</div>
          <div className="text-xs opacity-70">{qtdCortesia} lançamento(s) · não é receita</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 font-display text-base font-bold text-slate-700">Por operação</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>operação</span>
            <span className="flex gap-4">
              <span className="w-24 text-right">a receber</span>
              <span className="w-24 text-right">recebido</span>
            </span>
          </div>
          {OPERACOES.map((o) => (
            <div key={o.tipo} className="flex items-center justify-between text-sm">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.cor}`}>{o.label}</span>
              <span className="flex gap-4">
                <span className="w-24 text-right text-orange-600">{formatBRL(por[o.tipo]?.aReceber ?? 0)}</span>
                <span className="w-24 text-right font-bold text-emerald-700">{formatBRL(por[o.tipo]?.recebido ?? 0)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/financeiro" className="text-sm font-semibold text-emerald-700">
        → Ver lançamentos no Financeiro
      </Link>
    </div>
  )
}
