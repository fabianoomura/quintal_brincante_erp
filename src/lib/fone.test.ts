import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatarTelefoneBR, normalizeE164BR } from './fone'

test('formatarTelefoneBR: progressivo enquanto digita', () => {
  assert.equal(formatarTelefoneBR(''), '')
  assert.equal(formatarTelefoneBR('4'), '(4')
  assert.equal(formatarTelefoneBR('43'), '(43')
  assert.equal(formatarTelefoneBR('4399'), '(43) 99')
  assert.equal(formatarTelefoneBR('43991203'), '(43) 9912-03')
  assert.equal(formatarTelefoneBR('4399120340'), '(43) 9912-0340') // fixo 10
  assert.equal(formatarTelefoneBR('43991203404'), '(43) 99120-3404') // celular 11
})

test('formatarTelefoneBR: aceita bagunça (pontuação, +55, espaços)', () => {
  assert.equal(formatarTelefoneBR('+55 43 99120-3404'), '(43) 99120-3404')
  assert.equal(formatarTelefoneBR('5543991203404'), '(43) 99120-3404')
  assert.equal(formatarTelefoneBR('(43)99120.3404'), '(43) 99120-3404')
  assert.equal(formatarTelefoneBR('43 99120 3404 999'), '(43) 99120-3404') // corta excesso
})

test('normalizeE164BR: formatos comuns viram +55DDDNUMERO', () => {
  assert.equal(normalizeE164BR('(43) 99120-3404'), '+5543991203404')
  assert.equal(normalizeE164BR('43 99120-3404'), '+5543991203404')
  assert.equal(normalizeE164BR('+55 43 99120-3404'), '+5543991203404')
  assert.equal(normalizeE164BR('5543991203404'), '+5543991203404')
  assert.equal(normalizeE164BR('043991203404'), '+5543991203404') // 0 de interurbano
  assert.equal(normalizeE164BR('4333241234'), '+554333241234') // fixo
})

test('normalizeE164BR: inválidos retornam null (sem DDD, curto demais)', () => {
  assert.equal(normalizeE164BR('99120-3404'), null) // sem DDD
  assert.equal(normalizeE164BR('1234'), null)
  assert.equal(normalizeE164BR(''), null)
  assert.equal(normalizeE164BR(null), null)
})
