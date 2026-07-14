import { test } from 'node:test'
import assert from 'node:assert/strict'
import { duracaoMinutos, horasCobraveis, precoHoraCheia } from './tarifador'

test('duracaoMinutos: diferença simples', () => {
  assert.equal(duracaoMinutos('14:00', '15:10'), 70)
})

// Hora INICIADA conta cheia (decisão do dono 2026-07-14): 1h01 já é a 2ª hora.
test('horasCobraveis: piso de 1 hora', () => {
  assert.equal(horasCobraveis(5), 1)
  assert.equal(horasCobraveis(30), 1)
  assert.equal(horasCobraveis(60), 1)
})

test('horasCobraveis: passou 1 minuto da hora → hora seguinte cheia', () => {
  assert.equal(horasCobraveis(61), 2)
  assert.equal(horasCobraveis(120), 2)
  assert.equal(horasCobraveis(121), 3)
  assert.equal(horasCobraveis(125), 3)
})

test('horasCobraveis: tolerância perdoa até X min após a hora fechada', () => {
  assert.equal(horasCobraveis(68, 10), 1) // 1h08 com tol 10 → 1h
  assert.equal(horasCobraveis(70, 10), 1) // exatamente na tolerância
  assert.equal(horasCobraveis(71, 10), 2) // passou → 2h
  assert.equal(horasCobraveis(130, 10), 2) // 2h10 com tol 10 → 2h
  assert.equal(horasCobraveis(131, 10), 3)
})

// Exemplo do dono: primeira hora R$ 10; passou 1 minuto → 2ª hora cheia.
test('precoHoraCheia: exemplo do dono (10/h)', () => {
  assert.equal(precoHoraCheia(40, 10), 10)
  assert.equal(precoHoraCheia(60, 10), 10)
  assert.equal(precoHoraCheia(61, 10), 20)
  assert.equal(precoHoraCheia(125, 10), 30)
})

test('precoHoraCheia: tarifa quebrada não estoura float (12.5/h → 2h = 25)', () => {
  assert.equal(precoHoraCheia(61, 12.5), 25)
  assert.equal(precoHoraCheia(61, 3.33), 6.66)
})

test('precoHoraCheia: respeita tolerância', () => {
  assert.equal(precoHoraCheia(68, 20, 10), 20)
  assert.equal(precoHoraCheia(71, 20, 10), 40)
})
