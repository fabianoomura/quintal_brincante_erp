import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularRelatorioGerencial, type PresencaRelatorio } from './gerencial-relatorio'
import {
  calcularViabilidade,
  classificarMovimento,
  periodosViabilidade,
  type OperacaoPlayDia,
} from './viabilidade'

const presencas: PresencaRelatorio[] = [
  { id: '1', data: '2026-07-03', entrada: '12:10', saida: '13:00', origem: 'espaco_kids', criancaId: 'a', criancaNome: 'Ana' },
  { id: '2', data: '2026-07-03', entrada: '18:10', saida: '19:00', origem: 'espaco_kids', criancaId: 'b', criancaNome: 'Bia' },
  { id: '3', data: '2026-07-03', entrada: '18:20', saida: '19:30', origem: 'espaco_kids', criancaId: 'c', criancaNome: 'Caio' },
  { id: '4', data: '2026-07-04', entrada: '18:30', saida: '20:00', origem: 'espaco_kids', criancaId: 'd', criancaNome: 'Duda' },
]

const operacoes: OperacaoPlayDia[] = [
  { data: '2026-07-03', aberto: true, abertura: '12:00', fechamento: '22:00', pessoas: 2, custoPessoal: 200, custoAlimentacao: 20, outrosCustos: 30, clima: 'sol', temperaturaMedia: 25, observacao: null },
  { data: '2026-07-04', aberto: true, abertura: '12:00', fechamento: '22:00', pessoas: 2, custoPessoal: 200, custoAlimentacao: 10, outrosCustos: 30, clima: 'chuva', temperaturaMedia: 19, observacao: null },
  { data: '2026-07-05', aberto: true, abertura: '12:00', fechamento: '20:00', pessoas: 3, custoPessoal: 240, custoAlimentacao: 15, outrosCustos: 20, clima: 'sol', temperaturaMedia: 24, observacao: 'abriu sem movimento' },
]

test('periodos de viabilidade separam mês anterior, atual parcial e consolidado', () => {
  const periodos = periodosViabilidade('2026-08-05')
  assert.deepEqual(periodos.map((p) => [p.chave, p.de, p.ate, p.parcial]), [
    ['anterior', '2026-07-01', '2026-07-31', false],
    ['atual', '2026-08-01', '2026-08-05', true],
    ['consolidado', '2026-07-01', '2026-08-05', true],
  ])
})

test('classificação usa vermelho abaixo de 70%, cinza no entorno e pico acima de 130%', () => {
  assert.equal(classificarMovimento(6, 10), 'ruim')
  assert.equal(classificarMovimento(10, 10), 'medio')
  assert.equal(classificarMovimento(14, 10), 'pico')
  assert.equal(classificarMovimento(0, 0), 'sem_dados')
})

test('viabilidade inclui dia aberto sem atendimento e cruza receita, equipe e custos', () => {
  const relatorio = calcularRelatorioGerencial(presencas, { hoje: '2026-08-05', agoraMin: 1000 })
  const r = calcularViabilidade(relatorio, operacoes, [
    { data: '2026-07-03', gerado: 150, recebido: 150, pendente: 0 },
    { data: '2026-07-04', gerado: 50, recebido: 30, pendente: 20 },
  ])
  assert.equal(r.diasFuncionamento, 3)
  assert.equal(r.diasAbertosSemMovimento, 1)
  assert.equal(r.totalAtendimentos, 4)
  assert.equal(r.mediaAtendimentosDia, 4 / 3)
  assert.equal(r.faturamentoGerado, 200)
  assert.equal(r.receita, 180)
  assert.equal(r.aReceber, 20)
  assert.equal(r.custoPessoal, 640)
  assert.equal(r.custoAlimentacao, 45)
  assert.equal(r.outrosCustos, 80)
  assert.equal(r.custoTotal, 765)
  assert.equal(r.saldoCaixa, -585)
  assert.equal(r.resultadoOperacional, -565)
  assert.equal(r.diasSemCustoInformado, 0)
  assert.equal(r.diasComClimaInformado, 3)
  assert.equal(r.diasSemClimaInformado, 0)
  assert.equal(r.mediaPessoas, 7 / 3)
  assert.equal(r.pessoasHora, 64)
  assert.deepEqual(r.demonstrativoDias.map((d) => d.data), ['2026-07-03', '2026-07-04', '2026-07-05'])
  assert.deepEqual(
    r.demonstrativoDias.find((d) => d.data === '2026-07-03'),
    {
      data: '2026-07-03', diaSemana: 'sexta-feira', funcionou: true, situacao: 'informado',
      abertura: '12:00', fechamento: '22:00', criancasUnicas: 3, atendimentos: 3,
      faturamentoGerado: 150, receitaRecebida: 150, aReceber: 0,
      pessoas: 2, custoPessoal: 200, custoAlimentacao: 20, gastosExtras: 30, custoTotal: 250,
      saldoCaixa: -100, resultado: -100, resultadoParcial: false, margemPercentual: -100 / 150,
      clima: 'sol', temperaturaMedia: 25, observacao: null,
    },
  )
  assert.equal(r.demonstrativoDias.find((d) => d.data === '2026-07-05')?.criancasUnicas, 0)
  assert.deepEqual(r.porClima.map((item) => item.clima), ['sol', 'chuva'])
  assert.equal(r.porClima.find((item) => item.clima === 'sol')?.temperaturaMedia, 24.5)
})

test('dias com movimento sem cadastro operacional são inferidos e deixam custo pendente', () => {
  const relatorio = calcularRelatorioGerencial(presencas, { hoje: '2026-08-05', agoraMin: 1000 })
  const r = calcularViabilidade(relatorio, operacoes.slice(0, 1), [])
  assert.equal(r.diasFuncionamento, 2)
  assert.equal(r.diasInferidosPorMovimento, 1)
  assert.equal(r.diasSemCustoInformado, 1)
  assert.equal(r.diasSemClimaInformado, 1)
  const inferido = r.demonstrativoDias.find((d) => d.data === '2026-07-04')!
  assert.equal(inferido.situacao, 'inferido')
  assert.equal(inferido.custoPessoal, null)
  assert.equal(inferido.resultadoParcial, true)
})

test('dia cadastrado com custo ainda vazio mantém resultado como parcial', () => {
  const relatorio = calcularRelatorioGerencial(presencas.slice(0, 3), { hoje: '2026-08-05', agoraMin: 1000 })
  const r = calcularViabilidade(relatorio, [{ ...operacoes[0], custoPessoal: null }], [])
  assert.equal(r.diasFuncionamento, 1)
  assert.equal(r.diasComCustoInformado, 0)
  assert.equal(r.diasSemCustoInformado, 1)
  assert.equal(r.custoPessoal, 0)
})

test('mapa dia e horário mede média por ocorrência aberta do dia da semana', () => {
  const relatorio = calcularRelatorioGerencial(presencas, { hoje: '2026-08-05', agoraMin: 1000 })
  const r = calcularViabilidade(relatorio, operacoes, [])
  const sexta = r.mapaDiaHorario.find((d) => d.dia === 5)!
  assert.equal(sexta.diasAbertos, 1)
  assert.equal(sexta.horarios.find((h) => h.hora === 18)?.entradas, 2)
  assert.equal(r.horarios.find((h) => h.hora === 12)?.entradas, 1)
})

test('receita sem presença preserva o dia no demonstrativo e infere funcionamento', () => {
  const relatorio = calcularRelatorioGerencial([], { hoje: '2026-08-05', agoraMin: 1000 })
  const r = calcularViabilidade(relatorio, [], [{ data: '2026-07-10', gerado: 75, recebido: 50, pendente: 25 }])
  assert.equal(r.diasFuncionamento, 1)
  assert.equal(r.demonstrativoDias[0].faturamentoGerado, 75)
  assert.equal(r.demonstrativoDias[0].receitaRecebida, 50)
  assert.equal(r.demonstrativoDias[0].aReceber, 25)
  assert.equal(r.demonstrativoDias[0].situacao, 'inferido')
})
