import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularValorPlay, duracaoMinutos, precoProporcional, type TarifaCalculo } from './tarifador'

// FIXTURE — valores fictícios só para o teste (NÃO são a tarifa real; essa vem da tabela
// `tarifa` e ainda está pendente de confirmação do dono). Aqui: X=valor_hora, Y=valor_fracao.
const X = 20 // valor_hora fixture
const Y = 10 // valor_fracao fixture
const tarifa: TarifaCalculo = {
  minimo_minutos: 60,
  valor_hora: X,
  tamanho_fracao_min: 30,
  valor_fracao: Y,
}

const valor = (entrada: string, saida: string) =>
  calcularValorPlay(entrada, saida, tarifa).valor

test('duracaoMinutos: diferença simples', () => {
  assert.equal(duracaoMinutos('14:00', '15:10'), 70)
})

// Preço proporcional (piso 1h + proporcional), valor/hora = 20 — exemplos do dono
test('precoProporcional: 40min → piso 1h = 20', () => {
  assert.equal(precoProporcional(40, 20), 20)
})
test('precoProporcional: 1h = 20', () => {
  assert.equal(precoProporcional(60, 20), 20)
})
test('precoProporcional: 1h15 = 25', () => {
  assert.equal(precoProporcional(75, 20), 25)
})
test('precoProporcional: 2h = 40', () => {
  assert.equal(precoProporcional(120, 20), 40)
})
test('precoProporcional: rate diferente (8/h), 1h30 = 12', () => {
  assert.equal(precoProporcional(90, 8), 12)
})

// Tabela da spec §6 / §11
test('0h20 → piso de 1h = X', () => {
  assert.equal(valor('14:00', '14:20'), X)
})

test('1h10 → 1h + 1 fração = X + Y', () => {
  assert.equal(valor('14:00', '15:10'), X + Y)
})

test('2h00 → 2h = 2X', () => {
  assert.equal(valor('14:00', '16:00'), 2 * X)
})

test('2h05 → 2h + 1 fração = 2X + Y', () => {
  assert.equal(valor('14:00', '16:05'), 2 * X + Y)
})

// Arredondamento da fração pra cima
test('1h31 → 1h + 2 frações (31min → ceil(31/30)=2) = X + 2Y', () => {
  assert.equal(valor('14:00', '15:31'), X + 2 * Y)
})

test('hora exata (1h00) não cobra fração = X', () => {
  assert.equal(valor('14:00', '15:00'), X)
})

test('abaixo do piso (5 min) cobra o mínimo de 1h = X', () => {
  assert.equal(valor('14:00', '14:05'), X)
})

// minutosCobrados respeita o piso
test('minutosCobrados aplica o piso', () => {
  assert.equal(calcularValorPlay('14:00', '14:05', tarifa).minutosCobrados, 60)
})

// Sem float: 0.10 + 0.20 típico não estoura (usando centavos)
test('sem erro de float com valores quebrados', () => {
  const t: TarifaCalculo = {
    minimo_minutos: 60,
    valor_hora: 12.5,
    tamanho_fracao_min: 15,
    valor_fracao: 3.33,
  }
  // 1h + 1 fração de 15min → 12.50 + 3.33 = 15.83 exato
  assert.equal(calcularValorPlay('10:00', '11:10', t).valor, 15.83)
})
