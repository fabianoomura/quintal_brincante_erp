import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  deveAvisar,
  selecionarAvisos,
  minutosRestantes,
  limiteAvisoMin,
  type PresencaAberta,
} from './avisoTempo'

// Cenário: entrada 14:00 (840 min), contratado 120 min → limite 16:00 (960).
// Antecedência 15 min → avisar a partir de 15:45 (945).
const ANTEC = 15
const base: PresencaAberta = {
  id: 'p1',
  entradaMin: 14 * 60,
  tempoContratadoMin: 120,
  jaAvisado: false,
}

test('limiteAvisoMin = entrada + contratado - antecedência', () => {
  assert.equal(limiteAvisoMin(14 * 60, 120, 15), 15 * 60 + 45)
})

test('antes do limite → não avisa', () => {
  assert.equal(deveAvisar(base, 15 * 60 + 44, ANTEC), false)
})

test('exatamente no limite → avisa', () => {
  assert.equal(deveAvisar(base, 15 * 60 + 45, ANTEC), true)
})

test('depois do limite → avisa', () => {
  assert.equal(deveAvisar(base, 15 * 60 + 50, ANTEC), true)
})

test('idempotência: já avisado → nunca de novo', () => {
  assert.equal(deveAvisar({ ...base, jaAvisado: true }, 16 * 60, ANTEC), false)
})

test('sem tempo_contratado → não avisa', () => {
  assert.equal(
    deveAvisar({ ...base, tempoContratadoMin: null }, 20 * 60, ANTEC),
    false,
  )
})

test('minutosRestantes nunca negativo', () => {
  assert.equal(minutosRestantes(15 * 60 + 45, 14 * 60, 120), 15)
  assert.equal(minutosRestantes(17 * 60, 14 * 60, 120), 0)
})

test('selecionarAvisos filtra só quem cruzou o limite e não foi avisado', () => {
  const lista: PresencaAberta[] = [
    { id: 'no-limite', entradaMin: 14 * 60, tempoContratadoMin: 120, jaAvisado: false }, // avisa
    { id: 'cedo', entradaMin: 15 * 60, tempoContratadoMin: 120, jaAvisado: false }, // ainda não
    { id: 'ja', entradaMin: 14 * 60, tempoContratadoMin: 120, jaAvisado: true }, // idempotente
    { id: 'sem-limite', entradaMin: 14 * 60, tempoContratadoMin: null, jaAvisado: false }, // sem tempo
  ]
  const ids = selecionarAvisos(lista, 15 * 60 + 45, ANTEC).map((p) => p.id)
  assert.deepEqual(ids, ['no-limite'])
})
