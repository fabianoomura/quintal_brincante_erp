import { requireAdmin } from '@/lib/colaborador'
import { agoraHora, hojeISO, horaParaMinutos } from '@/lib/datas'
import { dataISOValida } from '@/lib/financeiro-filtros'
import { calcularRelatorioGerencial } from '@/lib/gerencial-relatorio'
import { calcularViabilidade } from '@/lib/viabilidade'
import { criarXlsx, type XlsxCell } from '@/lib/xlsx'
import { buscarPresencasRelatorio } from '../../dados'
import { buscarOperacoesPlay, buscarReceitasPlay } from '../dados'

export const runtime = 'nodejs'

const c = (value: XlsxCell['value'], style?: XlsxCell['style'], formula?: string): XlsxCell => ({ value, style, formula })

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
    [c('Faturamento gerado do Play'), c(analise.faturamentoGerado, 'currency'), c(`${analise.faturamentoMedioDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por dia funcionando`) ],
    [c('Receita recebida'), c(analise.receita, 'currency'), c(`${analise.receitaMediaDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por dia funcionando`) ],
    [c('A receber'), c(analise.aReceber, 'currency'), c('Faturamento gerado que ainda está pendente.')],
    [c('Custo da equipe'), c(analise.custoPessoal, 'currency'), c('Total informado nos dias de operação.')],
    [c('Outros custos'), c(analise.outrosCustos, 'currency'), c('Custos variáveis informados.')],
    [c('Resultado operacional'), c(analise.resultadoOperacional, 'currency'), c(analise.diasSemCustoInformado ? `Parcial: faltam custos de ${analise.diasSemCustoInformado} dia(s).` : 'Faturamento gerado menos custos informados.')],
    [c('Margem operacional'), c(analise.margemPercentual ?? 0, 'percent'), c(analise.diasSemCustoInformado ? 'Parcial.' : 'Sobre o faturamento gerado.')],
    [c('Equipe média'), c(analise.mediaPessoas ?? 0, 'decimal'), c('Média nos dias com equipe informada.')],
    [c('Pessoa-horas'), c(analise.pessoasHora ?? 0, 'decimal'), c('Depende de equipe, abertura e fechamento preenchidos.')],
    [c('Cobertura dos custos'), c(analise.diasFuncionamento ? analise.diasComCustoInformado / analise.diasFuncionamento : 0, 'percent'), c(`${analise.diasComCustoInformado} de ${analise.diasFuncionamento} dia(s)`) ],
  ]

  const dias: XlsxCell[][] = [[c('Dia da semana', 'header'), c('Dias funcionando', 'header'), c('Atendimentos', 'header'), c('Média/dia', 'header'), c('Classificação', 'header')],
    ...analise.diasSemana.map((d) => [c(d.label), c(d.diasAbertos, 'integer'), c(d.atendimentos, 'integer'), c(d.mediaPorDia, 'decimal'), c(classeLabel(d.classificacao))])]

  const horarios: XlsxCell[][] = [[c('Horário', 'header'), c('Entradas', 'header'), c('Média/dia funcionando', 'header'), c('Classificação', 'header')],
    ...analise.horarios.map((h) => [c(`${String(h.hora).padStart(2, '0')}:00–${String(h.hora + 1).padStart(2, '0')}:00`), c(h.entradas, 'integer'), c(h.mediaPorDia, 'decimal'), c(classeLabel(h.classificacao))])]

  const demonstrativoLinhas: XlsxCell[][] = analise.demonstrativoDias.map((d) => [
    c(dataExcel(d.data), 'date'), c(d.diaSemana), c(d.funcionou ? 'Sim' : 'Não'),
    c(d.situacao === 'informado' ? 'Informado' : d.situacao === 'inferido' ? 'Inferido por check-in/receita' : 'Não abriu'),
    c(horaExcel(d.abertura), 'time'), c(horaExcel(d.fechamento), 'time'), c(d.criancasUnicas, 'integer'), c(d.atendimentos, 'integer'),
    c(d.faturamentoGerado, 'currency'), c(d.receitaRecebida, 'currency'), c(d.aReceber, 'currency'),
    c(d.pessoas, 'integer'), c(d.custoPessoal, 'currency'), c(d.gastosExtras, 'currency'),
    c(d.custoTotal, 'currency'), c(d.resultado, 'currency'), c(d.resultadoParcial ? null : d.margemPercentual, 'percent'),
    c(d.resultadoParcial ? 'Parcial — custo de funcionários pendente' : 'Completo'), c(d.observacao),
  ])
  const totalLinha = demonstrativoLinhas.length + 2
  const ultimaLinhaDados = Math.max(2, demonstrativoLinhas.length + 1)
  const demonstrativo: XlsxCell[][] = [[
    c('Data', 'header'), c('Dia da semana', 'header'), c('Funcionou', 'header'), c('Origem da informação', 'header'),
    c('Abertura', 'header'), c('Fechamento', 'header'), c('Crianças únicas', 'header'), c('Atendimentos', 'header'),
    c('Faturamento gerado', 'header'), c('Receita recebida', 'header'), c('A receber', 'header'),
    c('Funcionários', 'header'), c('Custo dos funcionários', 'header'),
    c('Gastos extras', 'header'), c('Saídas totais', 'header'), c('Saldo do dia', 'header'), c('Margem', 'header'),
    c('Situação do resultado', 'header'), c('Observação', 'header'),
  ], ...demonstrativoLinhas, [
    c('TOTAL DO PERÍODO', 'header'), c(null), c(`${analise.diasFuncionamento} dia(s)`), c(null), c(null), c(null),
    c(analise.demonstrativoDias.reduce((s, d) => s + (d.funcionou ? d.criancasUnicas : 0), 0), 'integer', `SUM(G2:G${ultimaLinhaDados})`),
    c(analise.totalAtendimentos, 'integer', `SUM(H2:H${ultimaLinhaDados})`),
    c(analise.faturamentoGerado, 'currency', `SUM(I2:I${ultimaLinhaDados})`), c(analise.receita, 'currency', `SUM(J2:J${ultimaLinhaDados})`),
    c(analise.aReceber, 'currency', `SUM(K2:K${ultimaLinhaDados})`),
    c(analise.demonstrativoDias.reduce((s, d) => s + (d.funcionou ? (d.pessoas ?? 0) : 0), 0), 'integer', `SUM(L2:L${ultimaLinhaDados})`),
    c(analise.custoPessoal, 'currency', `SUM(M2:M${ultimaLinhaDados})`), c(analise.outrosCustos, 'currency', `SUM(N2:N${ultimaLinhaDados})`),
    c(analise.custoTotal, 'currency', `SUM(O2:O${ultimaLinhaDados})`), c(analise.resultadoOperacional, 'currency', `SUM(P2:P${ultimaLinhaDados})`),
    c(analise.margemPercentual ?? 0, 'percent', `IFERROR(P${totalLinha}/I${totalLinha},0)`),
    c(analise.diasSemCustoInformado ? `Parcial — faltam ${analise.diasSemCustoInformado} dia(s)` : 'Completo'), c(null),
  ]]

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
    { name: 'Demonstrativo diário', rows: demonstrativo, widths: [13, 18, 13, 30, 13, 13, 17, 15, 21, 19, 17, 15, 23, 17, 18, 18, 14, 36, 42], freezeRows: 1, autoFilterRow: 1 },
  ])

  return new Response(arquivo as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="viabilidade_play_${de}_a_${ate}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
