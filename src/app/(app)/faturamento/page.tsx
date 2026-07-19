import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import { hojeISO } from '@/lib/datas'
import { formatBRL } from '@/lib/dinheiro'
import { valorMovimentadoLancamento } from '@/lib/financeiro'

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
  const mesParam = sp.mes ?? hojeISO().slice(0, 7)
  const [ano, mes] = mesParam.split('-').map(Number)
  const primeiro = `${ano}-${pad(mes)}-01`
  const ultimo = `${ano}-${pad(mes)}-${pad(new Date(ano, mes, 0).getDate())}`

  const supabase = await createClient()
  const { data: lancs } = await supabase
    .from('lancamento')
    .select('valor, desconto, status, origem_tipo, capture_method')
    .gte('vencimento', primeiro)
    .lte('vencimento', ultimo)

  const por: Record<string, { aReceber: number; recebido: number }> = {}
  let totAReceber = 0
  let totRecebido = 0
  for (const l of lancs ?? []) {
    const t = l.origem_tipo ?? 'avulso'
    por[t] ??= { aReceber: 0, recebido: 0 }
    const v = Number(l.valor) - Number(l.desconto)
    if (l.status === 'pago') {
      const movimentado = valorMovimentadoLancamento(Number(l.valor), Number(l.desconto), l.capture_method)
      por[t].recebido += movimentado
      totRecebido += movimentado
    } else if (l.status === 'pendente') {
      por[t].aReceber += v
      totAReceber += v
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">📈 Faturamento</h1>
      </div>

      <div className="flex items-center justify-between">
        <Link href={`/faturamento?mes=${addMes(ano, mes, -1)}`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">← Anterior</Link>
        <div className="font-display text-lg font-bold text-slate-700">{MESES[mes]} de {ano}</div>
        <Link href={`/faturamento?mes=${addMes(ano, mes, 1)}`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">Próximo →</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">Recebido no mês</div>
          <div className="font-display text-2xl font-bold">{formatBRL(totRecebido)}</div>
        </div>
        <div className="rounded-2xl bg-orange-500 p-4 text-white shadow-sm">
          <div className="text-xs font-semibold opacity-80">A receber no mês</div>
          <div className="font-display text-2xl font-bold">{formatBRL(totAReceber)}</div>
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
