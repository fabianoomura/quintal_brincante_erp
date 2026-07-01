import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pascoa, feriadosNacionais } from './feriados'

test('Páscoa 2026 = 5 de abril', () => {
  const p = pascoa(2026)
  assert.equal(p.getMonth(), 3) // abril (0-based)
  assert.equal(p.getDate(), 5)
})

test('feriados fixos de 2026', () => {
  const f = feriadosNacionais(2026)
  assert.equal(f.get('2026-12-25'), 'Natal')
  assert.equal(f.get('2026-04-21'), 'Tiradentes')
  assert.equal(f.get('2026-11-20'), 'Consciência Negra')
})

test('feriados móveis de 2026 (a partir da Páscoa 05/04)', () => {
  const f = feriadosNacionais(2026)
  assert.equal(f.get('2026-04-03'), 'Sexta-feira Santa') // Páscoa - 2
  assert.equal(f.get('2026-02-17'), 'Carnaval') // Páscoa - 47
  assert.equal(f.get('2026-06-04'), 'Corpus Christi') // Páscoa + 60
})

test('dia comum não é feriado', () => {
  assert.equal(feriadosNacionais(2026).has('2026-07-15'), false)
})
