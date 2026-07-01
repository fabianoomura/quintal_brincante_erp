import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vencimentoDoMes } from './mensalidades'

test('dia normal no mês', () => {
  assert.equal(vencimentoDoMes(2026, 1, 10), '2026-01-10')
})

test('dia 31 em fevereiro → último dia (28)', () => {
  assert.equal(vencimentoDoMes(2026, 2, 31), '2026-02-28')
})

test('fevereiro bissexto → 29', () => {
  assert.equal(vencimentoDoMes(2028, 2, 31), '2028-02-29')
})

test('dia 31 em abril (30 dias) → 30', () => {
  assert.equal(vencimentoDoMes(2026, 4, 31), '2026-04-30')
})

test('zero-pad de mês e dia', () => {
  assert.equal(vencimentoDoMes(2026, 3, 5), '2026-03-05')
})
