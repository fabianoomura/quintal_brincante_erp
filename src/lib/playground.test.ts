import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularValorCheckout, validarSaidaManual } from './playground'

// Hora INICIADA conta cheia; o tempo contratado não muda o valor (só o aviso).

test('checkout play: até 1h cobra 1 hora (piso)', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '14:35',
      tarifaHora: 20,
      toleranciaMin: 0,
    }),
    20,
  )
})

test('checkout play: passou 1 minuto da hora → 2ª hora cheia', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '15:01',
      tarifaHora: 20,
      toleranciaMin: 0,
    }),
    40,
  )
})

test('checkout play: 2h05 → 3 horas cheias', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '16:05',
      tarifaHora: 20,
      toleranciaMin: 0,
    }),
    60,
  )
})

test('checkout play: tolerância perdoa passadinha da hora', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00',
      saida: '15:08',
      tarifaHora: 20,
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
      toleranciaMin: 0,
      valorDiaria: 90,
    }),
    90,
  )
})

test('checkout play: segundos contam como minuto cheio (1h00m01s → 2h)', () => {
  assert.equal(
    calcularValorCheckout({
      origem: 'espaco_kids',
      entrada: '14:00:30',
      saida: '15:00:31',
      tarifaHora: 20,
      toleranciaMin: 0,
    }),
    40,
  )
})

// ── validarSaidaManual (check-out esquecido) ─────────────────────────────────

test('saida manual valida: depois da entrada, formato HH:MM', () => {
  assert.deepEqual(validarSaidaManual('14:00:00', '16:30'), { ok: true })
})

test('saida manual invalida: formato errado', () => {
  assert.equal(validarSaidaManual('14:00:00', '16h30').ok, false)
})

test('saida manual invalida: antes ou igual a entrada', () => {
  assert.equal(validarSaidaManual('14:00:00', '13:59').ok, false)
  assert.equal(validarSaidaManual('14:00:00', '14:00').ok, false)
})
