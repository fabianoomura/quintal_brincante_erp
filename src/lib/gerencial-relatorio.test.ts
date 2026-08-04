import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularRelatorioGerencial,
  duracaoHumana,
  minutosComoHora,
  normalizarPeriodoGerencial,
  type PresencaRelatorio,
} from './gerencial-relatorio'

const base: PresencaRelatorio[] = [
  { id: '1', data: '2026-07-03', entrada: '12:00', saida: '14:30', origem: 'espaco_kids', criancaId: 'a', criancaNome: 'Ana' },
  { id: '2', data: '2026-07-03', entrada: '13:00', saida: '15:00', origem: 'espaco_kids', criancaId: 'b', criancaNome: 'Bia' },
  { id: '3', data: '2026-07-03', entrada: '18:10', saida: '19:10', origem: 'espaco_kids', criancaId: 'a', criancaNome: 'Ana' },
  { id: '4', data: '2026-07-04', entrada: '18:30', saida: '20:00', origem: 'diaria', criancaId: 'c', criancaNome: 'Caio' },
]

test('relatorio separa visitas, criancas unicas e dias com movimento', () => {
  const r = calcularRelatorioGerencial(base, { hoje: '2026-08-04', agoraMin: 1000 })
  assert.equal(r.totalAtendimentos, 4)
  assert.equal(r.criancasUnicas, 3)
  assert.equal(r.diasComMovimento, 2)
  assert.equal(r.mediaAtendimentosDia, 2)
  assert.equal(r.diaMaisMovimento?.data, '2026-07-03')
  assert.equal(r.diaMenosMovimento?.data, '2026-07-04')
})

test('pico simultaneo usa intervalo de entrada e saida sem somar trocas no mesmo minuto', () => {
  const trocas: PresencaRelatorio[] = [
    { ...base[0], id: 'a', entrada: '12:00', saida: '13:00' },
    { ...base[1], id: 'b', entrada: '13:00', saida: '14:00' },
    { ...base[2], id: 'c', entrada: '13:30', saida: '14:30' },
  ]
  const r = calcularRelatorioGerencial(trocas, { hoje: '2026-08-04', agoraMin: 1000 })
  assert.equal(r.dias[0].picoSimultaneo, 2)
  assert.equal(r.dias[0].picoEm, 13 * 60 + 30)
})

test('relatorio identifica faixas antes das 14, tarde e apos 18', () => {
  const r = calcularRelatorioGerencial(base, { hoje: '2026-08-04', agoraMin: 1000 })
  const sexta = r.diasSemana.find((d) => d.dia === 5)!
  assert.deepEqual(
    { antes14: sexta.antes14, entre14e18: sexta.entre14e18, apos18: sexta.apos18 },
    { antes14: 2, entre14e18: 0, apos18: 1 },
  )
  assert.equal(r.horarioMaisEntradas?.hora, 18)
  assert.deepEqual(r.faixas.map((f) => [f.label, f.atendimentos]), [
    ['Até 14h', 2], ['14h às 18h', 0], ['Após 18h', 2],
  ])
  assert.equal(r.faixas[2].percentual, 0.5)
})

test('rankings priorizam media do dia da semana e volume de datas e horarios', () => {
  const r = calcularRelatorioGerencial(base, { hoje: '2026-08-04', agoraMin: 1000 })
  assert.equal(r.rankingDiasSemana[0].label, 'sexta-feira')
  assert.equal(r.rankingDiasSemana[0].mediaPorDia, 3)
  assert.equal(r.rankingDatas[0].data, '2026-07-03')
  assert.equal(r.rankingHorarios[0].hora, 18)
  assert.equal(r.faixaMaisForte?.atendimentos, 2)
})

test('horarios medem entradas, sobreposicao e crianca-horas', () => {
  const r = calcularRelatorioGerencial(base, { hoje: '2026-08-04', agoraMin: 1000 })
  const h13 = r.horarios[13]
  assert.equal(h13.entradas, 1)
  assert.equal(h13.atendimentosNoHorario, 2)
  assert.equal(h13.criancaHoras, 2)
  assert.equal(h13.picoSimultaneo, 2)
})

test('check-out antigo ausente e sinalizado sem inflar lotacao', () => {
  const r = calcularRelatorioGerencial([
    { ...base[0], saida: null },
  ], { hoje: '2026-08-04', agoraMin: 1200 })
  assert.equal(r.incompletas, 1)
  assert.equal(r.criancaHoras, 0)
  assert.equal(r.picoLotacao, null)
})

test('saida invalida tambem e sinalizada como pendente no relatorio', () => {
  const r = calcularRelatorioGerencial([
    { ...base[0], entrada: '15:00', saida: '14:00' },
  ], { hoje: '2026-08-04', agoraMin: 1200 })
  assert.equal(r.incompletas, 1)
  assert.equal(r.presencas[0].duracaoMin, null)
})

test('presenca aberta hoje conta ate a hora atual', () => {
  const r = calcularRelatorioGerencial([
    { ...base[0], data: '2026-08-04', entrada: '10:00', saida: null },
  ], { hoje: '2026-08-04', agoraMin: 11 * 60 + 30 })
  assert.equal(r.incompletas, 0)
  assert.equal(r.presencas[0].duracaoMin, 90)
  assert.equal(r.dias[0].picoSimultaneo, 1)
})

test('periodo aceita datas livres, preserva compatibilidade com mes e rejeita inversao', () => {
  assert.deepEqual(
    normalizarPeriodoGerencial({ de: '2026-07-01', ate: '2026-07-31' }, '2026-08-04'),
    { de: '2026-07-01', ate: '2026-07-31', erro: null },
  )
  assert.deepEqual(
    normalizarPeriodoGerencial({ mes: '2026-02' }, '2026-08-04'),
    { de: '2026-02-01', ate: '2026-02-28', erro: null },
  )
  assert.ok(normalizarPeriodoGerencial({ de: '2026-08-10', ate: '2026-08-01' }, '2026-08-04').erro)
})

test('formatadores apresentam hora e duracao sem depender de fuso', () => {
  assert.equal(minutosComoHora(18 * 60 + 5), '18:05')
  assert.equal(duracaoHumana(125), '2h05')
  assert.equal(duracaoHumana(null), '—')
})
