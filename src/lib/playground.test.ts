import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularValorCheckout } from './playground'

test('checkout play: dentro da tolerancia cobra apenas o contratado', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '15:08',
      tarifaHora: 20,
      tempoContratadoMin: 60,
      toleranciaMin: 10,
    }),
    20,
  )
})

test('checkout play: passou da tolerancia cobra o tempo real', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '15:15',
      tarifaHora: 20,
      tempoContratadoMin: 60,
      toleranciaMin: 10,
    }),
    25,
  )
})

test('checkout play: sem tempo contratado cobra o tempo real com piso de 1h', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '14:35',
      tarifaHora: 20,
      tempoContratadoMin: null,
      toleranciaMin: 10,
    }),
    20,
  )
})

test('checkout play: sem tarifa travada nao gera valor nem lancamento', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '16:00',
      tarifaHora: null,
      tempoContratadoMin: 120,
      toleranciaMin: 10,
    }),
    null,
  )
})

test('checkout diaria: usa valor definido no check-in', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'diaria',
      entrada: '08:00',
      saida: '18:00',
      tarifaHora: null,
      tempoContratadoMin: null,
      toleranciaMin: 0,
      valorDiaria: 90,
    }),
    90,
  )
})

test('checkout play: segundos contam como minuto cheio', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00:30',
      saida: '15:00:31',
      tarifaHora: 20,
      tempoContratadoMin: null,
      toleranciaMin: 0,
    }),
    20.33,
  )
})
