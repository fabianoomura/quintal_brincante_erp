import { requireAdmin } from '@/lib/colaborador'
import { agoraHora, hojeISO, horaParaMinutos } from '@/lib/datas'
import {
  calcularRelatorioGerencial,
  minutosComoHora,
  normalizarPeriodoGerencial,
} from '@/lib/gerencial-relatorio'
import { criarXlsx, type XlsxCell } from '@/lib/xlsx'
import { buscarPresencasRelatorio } from '../dados'

export const runtime = 'nodejs'

const c = (value: XlsxCell['value'], style?: XlsxCell['style'], formula?: string): XlsxCell => ({ value, style, formula })

function dataExcel(data: string): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  if (!partes) return null
  return (Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) - Date.UTC(1899, 11, 30)) / 86400000
}

function horaExcel(minutos: number | null): number | null {
  return minutos == null ? null : minutos / 1440
}

function dataBR(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

const ORIGENS: Record<string, string> = {
  espaco_kids: 'Play',
  diaria: 'Diária',
  mensalista: 'Mensalista',
  colonia: 'Colônia',
}

export async function GET(request: Request) {
  await requireAdmin()
  const hoje = hojeISO()
  const url = new URL(request.url)
  const periodo = normalizarPeriodoGerencial({
    de: url.searchParams.get('de') ?? undefined,
    ate: url.searchParams.get('ate') ?? undefined,
    mes: url.searchParams.get('mes') ?? undefined,
  }, hoje)
  if (periodo.erro) return new Response(periodo.erro, { status: 400 })

  const { data, erro } = await buscarPresencasRelatorio(periodo.de, periodo.ate)
  if (erro) return new Response(`Erro: ${erro}`, { status: 500 })
  const relatorio = calcularRelatorioGerencial(data, {
    hoje,
    agoraMin: horaParaMinutos(agoraHora()),
  })

  const linhasDia = relatorio.dias.map((d) => [
    c(dataExcel(d.data), 'date'), c(d.diaSemana), c(d.atendimentos, 'integer'), c(d.criancasUnicas, 'integer'),
    c(horaExcel(d.primeiraEntrada), 'time'), c(horaExcel(d.ultimaSaida), 'time'), c(d.picoSimultaneo, 'integer'),
    c(horaExcel(d.picoEm), 'time'), c(horaExcel(d.permanenciaMediaMin), 'duration'), c(d.criancaHoras, 'decimal'),
    c(d.antes14, 'integer'), c(d.entre14e18, 'integer'), c(d.apos18, 'integer'), c(d.incompletas, 'integer'),
  ])
  const ultimaDia = Math.max(2, linhasDia.length + 1)
  const abaDia = "'Movimento diário'"

  const resumo: XlsxCell[][] = [
    [c('Relatório operacional — Quintal Brincante', 'title')],
    [c(`Período: ${dataBR(periodo.de)} a ${dataBR(periodo.ate)} · Gerado em ${dataBR(hoje)}`, 'subtitle')],
    [],
    [c('Indicador', 'header'), c('Resultado', 'header'), c('Leitura', 'header')],
    [c('Atendimentos'), c(relatorio.totalAtendimentos, 'integer', `SUM(${abaDia}!$C$2:$C$${ultimaDia})`), c('Entradas registradas; a mesma criança pode aparecer mais de uma vez.')],
    [c('Crianças diferentes'), c(relatorio.criancasUnicas, 'integer'), c('Crianças únicas atendidas no período.')],
    [c('Dias com movimento'), c(relatorio.diasComMovimento, 'integer', `COUNTA(${abaDia}!$A$2:$A$${ultimaDia})`), c('Dias que possuem ao menos uma presença registrada.')],
    [c('Média de atendimentos por dia ativo'), c(relatorio.mediaAtendimentosDia, 'decimal', 'IFERROR(B5/B7,0)'), c('Não inclui dias sem presença, pois o sistema não sabe se o espaço estava fechado.')],
    [c('Pico simultâneo'), c(relatorio.picoLotacao?.picoSimultaneo ?? 0, 'integer', `MAX(${abaDia}!$G$2:$G$${ultimaDia})`), c(relatorio.picoLotacao ? `${dataBR(relatorio.picoLotacao.data)} às ${minutosComoHora(relatorio.picoLotacao.picoEm)}` : 'Sem permanências completas.')],
    [c('Maior movimento diário'), c(relatorio.diaMaisMovimento?.atendimentos ?? 0, 'integer', `MAX(${abaDia}!$C$2:$C$${ultimaDia})`), c(relatorio.diaMaisMovimento ? dataBR(relatorio.diaMaisMovimento.data) : '—')],
    [c('Menor movimento diário'), c(relatorio.diaMenosMovimento?.atendimentos ?? 0, 'integer', `IFERROR(MIN(${abaDia}!$C$2:$C$${ultimaDia}),0)`), c(relatorio.diaMenosMovimento ? `${dataBR(relatorio.diaMenosMovimento.data)} (entre dias com atendimento)` : '—')],
    [c('Menor pico simultâneo'), c(relatorio.menorPicoLotacao?.picoSimultaneo ?? 0, 'integer'), c(relatorio.menorPicoLotacao ? `${dataBR(relatorio.menorPicoLotacao.data)} (entre dias com permanência medida)` : '—')],
    [c('Horário com mais entradas'), c(relatorio.horarioMaisEntradas ? horaExcel(relatorio.horarioMaisEntradas.hora * 60) : null, 'time'), c(relatorio.horarioMaisEntradas ? `${relatorio.horarioMaisEntradas.entradas} entrada(s)` : '—')],
    [c('Permanência média'), c(horaExcel(relatorio.permanenciaMediaMin), 'duration'), c('Média entre presenças com saída registrada.')],
    [c('Criança-horas'), c(relatorio.criancaHoras, 'decimal', `SUM(${abaDia}!$J$2:$J$${ultimaDia})`), c('Soma do tempo de permanência de todas as crianças.')],
    [c('Check-outs antigos pendentes'), c(relatorio.incompletas, 'integer', `SUM(${abaDia}!$N$2:$N$${ultimaDia})`), c('Contam como entrada, mas não como duração ou lotação.')],
    [],
    [c('Como ler o arquivo', 'header')],
    [c('Melhores dias e horários traz rankings e gráficos para decisão. Movimento diário mostra volume e pico de cada data. Dia x faixa compara os períodos antes das 14h, das 14h às 18h e após as 18h. Horários detalha cada hora. Atendimentos permite auditoria registro a registro.')],
  ]

  const diario: XlsxCell[][] = [[
    c('Data', 'header'), c('Dia da semana', 'header'), c('Atendimentos', 'header'), c('Crianças únicas', 'header'),
    c('Primeira entrada', 'header'), c('Última saída', 'header'), c('Pico simultâneo', 'header'), c('Horário do pico', 'header'),
    c('Permanência média', 'header'), c('Criança-horas', 'header'), c('Entradas até 14h', 'header'), c('Entradas 14–18h', 'header'),
    c('Entradas após 18h', 'header'), c('Check-outs pendentes', 'header'),
  ], ...linhasDia]

  const diaFaixa: XlsxCell[][] = [[
    c('Dia da semana', 'header'), c('Dias com movimento', 'header'), c('Atendimentos', 'header'), c('Média por dia ativo', 'header'),
    c('Entradas até 14h', 'header'), c('Entradas 14–18h', 'header'), c('Entradas após 18h', 'header'),
  ], ...relatorio.diasSemana.map((d) => [
    c(d.label), c(d.diasComMovimento, 'integer'), c(d.atendimentos, 'integer'), c(d.mediaPorDia, 'decimal'),
    c(d.antes14, 'integer'), c(d.entre14e18, 'integer'), c(d.apos18, 'integer'),
  ])]

  const horarios: XlsxCell[][] = [[
    c('Faixa horária', 'header'), c('Entradas', 'header'), c('Saídas', 'header'), c('Atendimentos presentes na hora', 'header'),
    c('Criança-horas', 'header'), c('Maior simultaneidade', 'header'),
  ], ...relatorio.horarios.map((h) => [
    c(`${String(h.hora).padStart(2, '0')}:00–${String(h.hora).padStart(2, '0')}:59`),
    c(h.entradas, 'integer'), c(h.saidas, 'integer'), c(h.atendimentosNoHorario, 'integer'), c(h.criancaHoras, 'decimal'), c(h.picoSimultaneo, 'integer'),
  ])]

  const atendimentos: XlsxCell[][] = [[
    c('Data', 'header'), c('Dia da semana', 'header'), c('Criança', 'header'), c('Origem', 'header'), c('Entrada', 'header'),
    c('Saída', 'header'), c('Duração', 'header'), c('Situação', 'header'), c('ID da presença', 'header'),
  ], ...relatorio.presencas.map((p) => [
    c(dataExcel(p.data), 'date'), c(relatorio.dias.find((d) => d.data === p.data)?.diaSemana ?? ''), c(p.criancaNome),
    c(ORIGENS[p.origem] ?? p.origem), c(horaExcel(p.entradaMin), 'time'), c(horaExcel(p.saidaMin), 'time'),
    c(horaExcel(p.duracaoMin), 'duration'), c(p.incompleta ? 'Check-out pendente' : p.saida == null ? 'Em andamento' : 'Concluída'), c(p.id),
  ])]

  const melhorDiaSemana = relatorio.rankingDiasSemana[0] ?? null
  const melhorData = relatorio.rankingDatas[0] ?? null
  const melhorHorario = relatorio.rankingHorarios[0] ?? null
  const faixaApos18 = relatorio.faixas.find((f) => f.label === 'Após 18h')
  const fimSemana = relatorio.diasSemana.filter((d) => d.dia === 0 || d.dia === 5 || d.dia === 6)
  const totalFimSemana = fimSemana.reduce((s, d) => s + d.atendimentos, 0)
  const apos18FimSemana = fimSemana.reduce((s, d) => s + d.apos18, 0)
  const analise: XlsxCell[][] = [
    [c('Melhores dias e horários — apoio à decisão', 'title')],
    [c(`Período: ${dataBR(periodo.de)} a ${dataBR(periodo.ate)} · Rankings consideram apenas dias com movimento registrado.`, 'subtitle')],
    [],
    [c('Indicador', 'header'), c('Resultado', 'header'), c('Leitura', 'header')],
    [c('Melhor dia da semana'), c(melhorDiaSemana?.label ?? '—'), c(melhorDiaSemana ? `${melhorDiaSemana.mediaPorDia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} atendimento(s) em média por dia ativo` : 'Sem movimento')],
    [c('Melhor data do período'), c(melhorData ? dataExcel(melhorData.data) : null, 'date'), c(melhorData ? `${melhorData.atendimentos} atendimento(s) · pico simultâneo ${melhorData.picoSimultaneo}` : 'Sem movimento')],
    [c('Melhor horário de entrada'), c(melhorHorario ? horaExcel(melhorHorario.hora * 60) : null, 'time'), c(melhorHorario ? `${melhorHorario.entradas} entrada(s) no período` : 'Sem movimento')],
    [c('Faixa mais forte'), c(relatorio.faixaMaisForte?.label ?? '—'), c(relatorio.faixaMaisForte ? `${relatorio.faixaMaisForte.atendimentos} entrada(s) · ${(relatorio.faixaMaisForte.percentual * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total` : 'Sem movimento')],
    [c('Participação após 18h'), c(faixaApos18?.percentual ?? 0, 'percent'), c(`${faixaApos18?.atendimentos ?? 0} entrada(s) após 18h no período`) ],
    [c('Após 18h em sex./sáb./dom.'), c(totalFimSemana ? apos18FimSemana / totalFimSemana : 0, 'percent'), c(`${apos18FimSemana} de ${totalFimSemana} entrada(s) nesses dias`) ],
    [],
    [c('Ranking dos dias da semana', 'header')],
    [c('Dia da semana', 'header'), c('Média por dia ativo', 'header'), c('Atendimentos', 'header'), c('Dias ativos', 'header')],
  ]
  for (const d of relatorio.rankingDiasSemana) {
    const origem = d.dia + 2
    analise.push([
      c(d.label, undefined, `'Dia x faixa'!A${origem}`),
      c(d.mediaPorDia, 'decimal', `'Dia x faixa'!D${origem}`),
      c(d.atendimentos, 'integer', `'Dia x faixa'!C${origem}`),
      c(d.diasComMovimento, 'integer', `'Dia x faixa'!B${origem}`),
    ])
  }
  analise.push([], [c('Top 10 datas do período', 'header')], [c('Data', 'header'), c('Atendimentos', 'header'), c('Pico simultâneo', 'header'), c('Permanência média', 'header')])
  for (const d of relatorio.rankingDatas.slice(0, 10)) {
    const origem = relatorio.dias.findIndex((item) => item.data === d.data) + 2
    analise.push([
      c(dataExcel(d.data), 'date', `'Movimento diário'!A${origem}`),
      c(d.atendimentos, 'integer', `'Movimento diário'!C${origem}`),
      c(d.picoSimultaneo, 'integer', `'Movimento diário'!G${origem}`),
      c(horaExcel(d.permanenciaMediaMin), 'duration', `'Movimento diário'!I${origem}`),
    ])
  }
  analise.push([], [c('Top 10 horários de entrada', 'header')], [c('Faixa horária', 'header'), c('Entradas', 'header'), c('Pico simultâneo', 'header'), c('Criança-horas', 'header')])
  for (const h of relatorio.rankingHorarios.slice(0, 10)) {
    const origem = h.hora + 2
    analise.push([
      c(`${String(h.hora).padStart(2, '0')}:00–${String(h.hora).padStart(2, '0')}:59`, undefined, `'Horários'!A${origem}`),
      c(h.entradas, 'integer', `'Horários'!B${origem}`),
      c(h.picoSimultaneo, 'integer', `'Horários'!F${origem}`),
      c(h.criancaHoras, 'decimal', `'Horários'!E${origem}`),
    ])
  }
  analise.push([], [c('Participação por faixa do dia', 'header')], [c('Faixa', 'header'), c('Entradas', 'header'), c('Participação', 'header')])
  const linhaFaixasInicio = analise.length + 1
  const colunasFaixa = ['E', 'F', 'G']
  relatorio.faixas.forEach((f, i) => {
    const formulaTotal = `SUM('Dia x faixa'!$${colunasFaixa[i]}$2:$${colunasFaixa[i]}$8)`
    const linha = analise.length + 1
    analise.push([
      c(f.label),
      c(f.atendimentos, 'integer', formulaTotal),
      c(f.percentual, 'percent', `IFERROR(B${linha}/SUM($B$${linhaFaixasInicio}:$B$${linhaFaixasInicio + 2}),0)`),
    ])
  })

  const horasComEntrada = relatorio.horarios.filter((h) => h.entradas > 0)
  const primeiraHora = horasComEntrada.length ? Math.min(...horasComEntrada.map((h) => h.hora)) : 0
  const ultimaHora = horasComEntrada.length ? Math.max(...horasComEntrada.map((h) => h.hora)) : 23
  const horasGrafico = relatorio.horarios.slice(primeiraHora, ultimaHora + 1)
  const graficosAnalise = [
    {
      type: 'column' as const,
      title: 'Média de atendimentos por dia ativo',
      from: { col: 4, row: 3 }, to: { col: 12, row: 18 },
      series: [{
        name: 'Média por dia ativo', color: '059669',
        categoryRange: `'Dia x faixa'!$A$2:$A$8`, valueRange: `'Dia x faixa'!$D$2:$D$8`,
        categories: relatorio.diasSemana.map((d) => d.label), values: relatorio.diasSemana.map((d) => d.mediaPorDia),
      }],
    },
    {
      type: 'line' as const,
      title: 'Entradas por horário',
      from: { col: 4, row: 20 }, to: { col: 12, row: 35 },
      series: [{
        name: 'Entradas', color: '4F46E5',
        categoryRange: `'Horários'!$A$${primeiraHora + 2}:$A$${ultimaHora + 2}`,
        valueRange: `'Horários'!$B$${primeiraHora + 2}:$B$${ultimaHora + 2}`,
        categories: horasGrafico.map((h) => `${String(h.hora).padStart(2, '0')}:00`), values: horasGrafico.map((h) => h.entradas),
      }],
    },
    {
      type: 'column' as const,
      title: 'Entradas por faixa do dia',
      from: { col: 4, row: 37 }, to: { col: 12, row: 52 },
      series: [{
        name: 'Entradas', color: 'F59E0B',
        categoryRange: `'Melhores dias e horários'!$A$${linhaFaixasInicio}:$A$${linhaFaixasInicio + 2}`,
        valueRange: `'Melhores dias e horários'!$B$${linhaFaixasInicio}:$B$${linhaFaixasInicio + 2}`,
        categories: relatorio.faixas.map((f) => f.label), values: relatorio.faixas.map((f) => f.atendimentos),
      }],
    },
  ]

  const arquivo = criarXlsx([
    { name: 'Resumo', rows: resumo, widths: [34, 20, 74], freezeRows: 3, mergeTitleAcross: 3 },
    { name: 'Melhores dias e horários', rows: analise, widths: [27, 22, 22, 20, 12, 12, 12, 12, 12, 12, 12, 12, 12], freezeRows: 3, mergeTitleAcross: 13, charts: graficosAnalise },
    { name: 'Movimento diário', rows: diario, widths: [13, 18, 15, 16, 17, 16, 17, 17, 19, 16, 18, 18, 19, 22], freezeRows: 1, autoFilterRow: 1 },
    { name: 'Dia x faixa', rows: diaFaixa, widths: [19, 21, 16, 21, 18, 18, 19], freezeRows: 1, autoFilterRow: 1 },
    { name: 'Horários', rows: horarios, widths: [20, 13, 13, 30, 17, 22], freezeRows: 1, autoFilterRow: 1 },
    { name: 'Atendimentos', rows: atendimentos, widths: [13, 18, 28, 16, 13, 13, 15, 21, 38], freezeRows: 1, autoFilterRow: 1 },
  ])
  return new Response(arquivo as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio_operacional_${periodo.de}_a_${periodo.ate}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
