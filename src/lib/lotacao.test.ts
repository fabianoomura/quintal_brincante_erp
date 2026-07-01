import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularLotacao } from './lotacao'

test('sem capacidade → sem_limite', () => {
  const l = calcularLotacao(5, null)
  assert.equal(l.nivel, 'sem_limite')
  assert.equal(l.vagas, null)
})

test('abaixo de 80% → ok', () => {
  const l = calcularLotacao(10, 20)
  assert.equal(l.nivel, 'ok')
  assert.equal(l.vagas, 10)
})

test('entre 80% e 100% → quase', () => {
  assert.equal(calcularLotacao(16, 20).nivel, 'quase')
  assert.equal(calcularLotacao(19, 20).nivel, 'quase')
})

test('no limite ou acima → lotado', () => {
  assert.equal(calcularLotacao(20, 20).nivel, 'lotado')
  assert.equal(calcularLotacao(22, 20).nivel, 'lotado')
  assert.equal(calcularLotacao(22, 20).vagas, -2)
})
