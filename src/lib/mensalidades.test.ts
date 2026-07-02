import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vencimentoDoMes, indicesIrmaos } from './mensalidades'

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

test('indicesIrmaos: 1º filho = 0, irmãos seguintes >= 1', () => {
  const idx = indicesIrmaos([
    { id: 'a', familyKey: 'fam1', ordem: '2026-01-01' },
    { id: 'b', familyKey: 'fam1', ordem: '2026-02-01' },
    { id: 'c', familyKey: 'fam2', ordem: '2026-01-01' },
  ])
  assert.equal(idx['a'], 0) // 1º da família 1 → sem desconto
  assert.equal(idx['b'], 1) // 2º da família 1 → desconto
  assert.equal(idx['c'], 0) // único da família 2
})
