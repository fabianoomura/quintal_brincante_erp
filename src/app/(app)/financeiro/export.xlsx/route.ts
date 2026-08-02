import { normalizarFiltrosFinanceiros } from '@/lib/financeiro-filtros'
import { valorMovimentadoLancamento } from '@/lib/financeiro'
import { criarXlsx, type XlsxCell } from '@/lib/xlsx'
import { buscarLancamentosRelatorio } from '../export/dados'

export const runtime = 'nodejs'

const c = (value: XlsxCell['value'], style?: XlsxCell['style'], formula?: string): XlsxCell => ({ value, style, formula })

function dataExcel(data: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  if (!partes) return null
  return (Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) - Date.UTC(1899, 11, 30)) / 86400000
}

function instanteExcel(iso: string | null): number | null {
  if (!iso) return null
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return null
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(data).reduce<Record<string, string>>((m, p) => {
    if (p.type !== 'literal') m[p.type] = p.value
    return m
  }, {})
  const localComoUtc = Date.UTC(
    Number(partes.year), Number(partes.month) - 1, Number(partes.day),
    Number(partes.hour) % 24, Number(partes.minute), Number(partes.second),
  )
  return (localComoUtc - Date.UTC(1899, 11, 30)) / 86400000
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

  const cabecalho = [
    'Criado em', 'Criança', 'Descrição', 'Origem', 'Valor bruto', 'Desconto', 'Valor líquido',
    'Movimento financeiro', 'Vencimento', 'Status', 'Modalidade', 'Pago em', 'NSU', 'Recibo',
  ].map((v) => c(v, 'header'))
  const linhas = data.map((l) => [
    c(instanteExcel(l.createdAt), 'datetime'), c(l.crianca), c(l.descricao), c(l.origem),
    c(l.valor, 'currency'), c(l.desconto, 'currency'), c(Math.max(0, l.valor - l.desconto), 'currency'),
    c(l.status === 'pago' ? valorMovimentadoLancamento(l.valor, l.desconto, l.modalidade) : 0, 'currency'),
    c(dataExcel(l.vencimento), 'date'), c(l.status), c(l.modalidade ?? ''),
    c(instanteExcel(l.pagoEm), 'datetime'), c(l.transactionNsu ?? ''), c(l.recibo ?? ''),
  ])
  const ultima = Math.max(2, linhas.length + 1)
  const statusRange = `'Lançamentos'!$J$2:$J$${ultima}`
  const origemRange = `'Lançamentos'!$D$2:$D$${ultima}`
  const modalidadeRange = `'Lançamentos'!$K$2:$K$${ultima}`
  const liquidoRange = `'Lançamentos'!$G$2:$G$${ultima}`
  const movimentoRange = `'Lançamentos'!$H$2:$H$${ultima}`

  const resumo: XlsxCell[][] = [
    [c('Relatório financeiro — Quintal Brincante', 'title')],
    [c(`Período de vencimento: ${filtros.de || 'início'} a ${filtros.ate || 'hoje'} · Status: ${filtros.status} · Origem: ${filtros.origem} · Modalidade: ${filtros.modalidade}`, 'subtitle')],
    [],
    [c('Indicador', 'header'), c('Valor', 'header')],
    [c('Lançamentos'), c(data.length, 'integer', `COUNTA('Lançamentos'!$A$2:$A$${ultima})`)],
    [c('Pendentes'), c(data.filter((l) => l.status === 'pendente').length, 'integer', `COUNTIF(${statusRange},"pendente")`)],
    [c('Pagos'), c(data.filter((l) => l.status === 'pago').length, 'integer', `COUNTIF(${statusRange},"pago")`)],
    [c('Cortesias'), c(data.filter((l) => l.modalidade === 'cortesia').length, 'integer', `COUNTIF(${modalidadeRange},"cortesia")`)],
    [c('A receber'), c(data.filter((l) => l.status === 'pendente').reduce((s, l) => s + Math.max(0, l.valor - l.desconto), 0), 'currency', `SUMIFS(${liquidoRange},${statusRange},"pendente")`)],
    [c('Receita recebida'), c(data.reduce((s, l) => s + (l.status === 'pago' ? valorMovimentadoLancamento(l.valor, l.desconto, l.modalidade) : 0), 0), 'currency', `SUM(${movimentoRange})`)],
    [c('Valor concedido em cortesia'), c(data.filter((l) => l.modalidade === 'cortesia').reduce((s, l) => s + Math.max(0, l.valor - l.desconto), 0), 'currency', `SUMIFS(${liquidoRange},${modalidadeRange},"cortesia")`)],
    [],
    [c('Por operação', 'header'), c('A receber', 'header'), c('Recebido', 'header'), c(''), c('Por modalidade', 'header'), c('Recebido', 'header')],
  ]
  const operacoes = [['presenca', 'Play / Diária'], ['mensalidade', 'Mensalidade'], ['colonia', 'Colônia'], ['avulso', 'Avulso']]
  const modalidades = [['dinheiro', 'Dinheiro'], ['pix', 'Pix'], ['debito', 'Débito'], ['credito', 'Crédito'], ['cortesia', 'Cortesia']]
  for (let i = 0; i < Math.max(operacoes.length, modalidades.length); i++) {
    const op = operacoes[i]
    const mod = modalidades[i]
    resumo.push([
      c(op?.[1] ?? ''),
      op ? c(data.filter((l) => l.origem === op[0] && l.status === 'pendente').reduce((s, l) => s + Math.max(0, l.valor - l.desconto), 0), 'currency', `SUMIFS(${liquidoRange},${origemRange},"${op[0]}",${statusRange},"pendente")`) : c(null),
      op ? c(data.filter((l) => l.origem === op[0]).reduce((s, l) => s + (l.status === 'pago' ? valorMovimentadoLancamento(l.valor, l.desconto, l.modalidade) : 0), 0), 'currency', `SUMIFS(${movimentoRange},${origemRange},"${op[0]}")`) : c(null),
      c(null),
      c(mod?.[1] ?? ''),
      mod ? c(data.filter((l) => l.modalidade === mod[0]).reduce((s, l) => s + (l.status === 'pago' ? valorMovimentadoLancamento(l.valor, l.desconto, l.modalidade) : 0), 0), 'currency', `SUMIFS(${movimentoRange},${modalidadeRange},"${mod[0]}")`) : c(null),
    ])
  }

  const arquivo = criarXlsx([
    { name: 'Resumo', rows: resumo, widths: [28, 18, 18, 3, 22, 18], freezeRows: 3, mergeTitleAcross: 6 },
    { name: 'Lançamentos', rows: [cabecalho, ...linhas], widths: [18, 24, 38, 16, 16, 14, 16, 20, 14, 13, 16, 18, 18, 42], freezeRows: 1, autoFilterRow: 1 },
  ])
  const hoje = new Date().toISOString().slice(0, 10)
  return new Response(arquivo as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="financeiro_${hoje}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
