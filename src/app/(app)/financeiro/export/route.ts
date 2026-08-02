import { normalizarFiltrosFinanceiros } from '@/lib/financeiro-filtros'
import { valorMovimentadoLancamento } from '@/lib/financeiro'
import { buscarLancamentosRelatorio } from './dados'

const COLUNAS = [
  'data', 'criança', 'descrição', 'origem', 'valor', 'desconto', 'valor_liquido',
  'movimento_financeiro', 'vencimento', 'status', 'método', 'transaction_nsu', 'pago_em', 'recibo',
]

function celula(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function valorBR(v: number | string | null): string {
  if (v == null) return ''
  return Number(v).toFixed(2).replace('.', ',')
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const filtros = normalizarFiltrosFinanceiros({
    status: url.searchParams.get('status') ?? undefined,
    de: url.searchParams.get('de') ?? undefined,
    ate: url.searchParams.get('ate') ?? undefined,
    origem: url.searchParams.get('origem') ?? undefined,
    modalidade: url.searchParams.get('modalidade') ?? undefined,
  })
  if (filtros.erro) return new Response(filtros.erro, { status: 400 })

  const { data, erro } = await buscarLancamentosRelatorio(filtros)
  if (erro) return new Response(`Erro: ${erro}`, { status: 500 })

  const linhas = data.map((l) =>
    [
      l.createdAt.slice(0, 10), l.crianca, l.descricao, l.origem, valorBR(l.valor),
      valorBR(l.desconto), valorBR(l.valor - l.desconto),
      valorBR(l.status === 'pago' ? valorMovimentadoLancamento(l.valor, l.desconto, l.modalidade) : 0),
      l.vencimento, l.status, l.modalidade ?? '', l.transactionNsu ?? '', l.pagoEm ?? '', l.recibo ?? '',
    ].map(celula).join(';'),
  )

  const csv = '\ufeff' + [COLUNAS.join(';'), ...linhas].join('\r\n') + '\r\n'
  const hoje = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="conciliacao_${filtros.status}_${hoje}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
