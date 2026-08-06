import { requireAdmin } from '@/lib/colaborador'
import { agoraHora, hojeISO, horaParaMinutos } from '@/lib/datas'
import { dataISOValida } from '@/lib/financeiro-filtros'
import { calcularRelatorioGerencial } from '@/lib/gerencial-relatorio'
import { calcularViabilidade } from '@/lib/viabilidade'
import { criarXlsx, type XlsxCell } from '@/lib/xlsx'
import { buscarPresencasRelatorio } from '../../dados'
import { buscarOperacoesPlay, buscarReceitasPlay } from '../dados'

export const runtime = 'nodejs'

const c = (value: XlsxCell['value'], style?: XlsxCell['style']): XlsxCell => ({ value, style })

function dataExcel(data: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  if (!partes) return null
  return (Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) - Date.UTC(1899, 11, 30)) / 86400000
}

function horaExcel(hora: string | null): number | null {
  if (!hora) return null
  const partes = /^(\d{2}):(\d{2})/.exec(hora)
  return partes ? (Number(partes[1]) * 60 + Number(partes[2])) / 1440 : null
}

function classeLabel(classe: string): string {
  return classe === 'ruim' ? 'Abaixo da média' : classe === 'pico' ? 'Pico' : classe === 'medio' ? 'Na média' : 'Sem base'
}

export async function GET(request: Request) {
  await requireAdmin()
  const url = new URL(request.url)
  const de = url.searchParams.get('de') ?? ''
  const ate = url.searchParams.get('ate') ?? ''
  if (!dataISOValida(de) || !dataISOValida(ate) || de > ate) return new Response('Período inválido.', { status: 400 })

  const [presencas, operacoes, receitas] = await Promise.all([
    buscarPresencasRelatorio(de, ate),
    buscarOperacoesPlay(de, ate),
    buscarReceitasPlay(de, ate),
  ])
  const erro = presencas.erro ?? operacoes.erro ?? receitas.erro
  if (erro) return new Response(`Erro: ${erro}`, { status: 500 })
  const relatorio = calcularRelatorioGerencial(presencas.data, {
    hoje: hojeISO(),
    agoraMin: horaParaMinutos(agoraHora()),
  })
  const analise = calcularViabilidade(relatorio, operacoes.data, receitas.data)

  const resumo: XlsxCell[][] = [
    [c('Viabilidade do Play — Quintal Brincante', 'title')],
    [c(`Período: ${de.split('-').reverse().join('/')} a ${ate.split('-').reverse().join('/')}`, 'subtitle')],
    [],
    [c('Indicador', 'header'), c('Resultado', 'header'), c('Leitura', 'header')],
    [c('Dias funcionando'), c(analise.diasFuncionamento, 'integer'), c(`${analise.diasAbertosInformados} informados; ${analise.diasInferidosPorMovimento} inferidos por check-in`) ],
    [c('Dias abertos sem movimento'), c(analise.diasAbertosSemMovimento, 'integer'), c('Só aparecem quando a operação diária foi informada.')],
    [c('Atendimentos'), c(analise.totalAtendimentos, 'integer'), c(`${analise.mediaAtendimentosDia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por dia funcionando`) ],
    [c('Receita paga do Play'), c(analise.receita, 'currency'), c(`${analise.receitaMediaDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por dia`) ],
    [c('Custo da equipe'), c(analise.custoPessoal, 'currency'), c('Total informado nos dias de operação.')],
    [c('Outros custos'), c(analise.outrosCustos, 'currency'), c('Custos variáveis informados.')],
    [c('Resultado operacional'), c(analise.resultadoOperacional, 'currency'), c(analise.diasSemCustoInformado ? `Parcial: faltam custos de ${analise.diasSemCustoInformado} dia(s).` : 'Receita paga menos custos informados.')],
    [c('Margem operacional'), c(analise.margemPercentual ?? 0, 'percent'), c(analise.diasSemCustoInformado ? 'Parcial.' : 'Sobre a receita paga.')],
    [c('Equipe média'), c(analise.mediaPessoas ?? 0, 'decimal'), c('Média nos dias com equipe informada.')],
    [c('Pessoa-horas'), c(analise.pessoasHora ?? 0, 'decimal'), c('Depende de equipe, abertura e fechamento preenchidos.')],
    [c('Cobertura dos custos'), c(analise.diasFuncionamento ? analise.diasComCustoInformado / analise.diasFuncionamento : 0, 'percent'), c(`${analise.diasComCustoInformado} de ${analise.diasFuncionamento} dia(s)`) ],
  ]

  const dias: XlsxCell[][] = [[c('Dia da semana', 'header'), c('Dias funcionando', 'header'), c('Atendimentos', 'header'), c('Média/dia', 'header'), c('Classificação', 'header')],
    ...analise.diasSemana.map((d) => [c(d.label), c(d.diasAbertos, 'integer'), c(d.atendimentos, 'integer'), c(d.mediaPorDia, 'decimal'), c(classeLabel(d.classificacao))])]

  const horarios: XlsxCell[][] = [[c('Horário', 'header'), c('Entradas', 'header'), c('Média/dia funcionando', 'header'), c('Classificação', 'header')],
    ...analise.horarios.map((h) => [c(`${String(h.hora).padStart(2, '0')}:00–${String(h.hora + 1).padStart(2, '0')}:00`), c(h.entradas, 'integer'), c(h.mediaPorDia, 'decimal'), c(classeLabel(h.classificacao))])]

  const operacao: XlsxCell[][] = [[
    c('Data', 'header'), c('Funcionou', 'header'), c('Abertura', 'header'), c('Fechamento', 'header'), c('Pessoas', 'header'),
    c('Custo da equipe', 'header'), c('Outros custos', 'header'), c('Custo total', 'header'), c('Receita paga', 'header'), c('Observação', 'header'),
  ], ...operacoes.data.map((o) => [
    c(dataExcel(o.data), 'date'), c(o.aberto ? 'Sim' : 'Não'), c(horaExcel(o.abertura), 'time'), c(horaExcel(o.fechamento), 'time'),
    c(o.pessoas, 'integer'), c(o.custoPessoal, 'currency'), c(o.outrosCustos, 'currency'), c(o.custoPessoal == null ? null : o.custoPessoal + o.outrosCustos, 'currency'),
    c(receitas.data.find((r) => r.data === o.data)?.valor ?? 0, 'currency'), c(o.observacao),
  ])]

  const arquivo = criarXlsx([
    { name: 'Resumo viabilidade', rows: resumo, widths: [30, 22, 72], freezeRows: 3, mergeTitleAcross: 3 },
    { name: 'Dias da semana', rows: dias, widths: [22, 20, 17, 18, 24], freezeRows: 1, autoFilterRow: 1, charts: [{
      type: 'column', title: 'Média de atendimentos por dia funcionando', from: { col: 6, row: 1 }, to: { col: 14, row: 17 },
      series: [{ name: 'Média/dia', color: '059669', categoryRange: `'Dias da semana'!$A$2:$A$8`, valueRange: `'Dias da semana'!$D$2:$D$8`, categories: analise.diasSemana.map((d) => d.label), values: analise.diasSemana.map((d) => d.mediaPorDia) }],
    }] },
    { name: 'Horários', rows: horarios, widths: [20, 14, 24, 24], freezeRows: 1, autoFilterRow: 1, charts: [{
      type: 'column', title: 'Entradas médias por horário', from: { col: 5, row: 1 }, to: { col: 13, row: 18 },
      series: [{ name: 'Média/dia', color: '4F46E5', categoryRange: `'Horários'!$A$2:$A$${analise.horarios.length + 1}`, valueRange: `'Horários'!$C$2:$C$${analise.horarios.length + 1}`, categories: analise.horarios.map((h) => `${h.hora}h`), values: analise.horarios.map((h) => h.mediaPorDia) }],
    }] },
    { name: 'Operação diária', rows: operacao, widths: [13, 14, 14, 14, 12, 20, 18, 18, 18, 42], freezeRows: 1, autoFilterRow: 1 },
  ])

  return new Response(arquivo as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="viabilidade_play_${de}_a_${ate}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
