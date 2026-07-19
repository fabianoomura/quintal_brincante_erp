import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularDescontoBaixa,
  valorLiquidoLancamento,
  valorMovimentadoLancamento,
} from './financeiro'

test('calcularDescontoBaixa ignora desconto manual quando flag esta desligada', () => {
  assert.equal(
    calcularDescontoBaixa({
      valor: 100,
      descontoAtual: 5,
      descontoReais: 20,
      descontoAtivo: false,
    }),
    5,
  )
})

test('calcularDescontoBaixa soma desconto manual quando flag esta ligada', () => {
  assert.equal(
    calcularDescontoBaixa({
      valor: 100,
      descontoAtual: 5,
      descontoReais: 20,
      descontoAtivo: true,
    }),
    25,
  )
})

test('calcularDescontoBaixa limita desconto ao valor do lancamento', () => {
  assert.equal(
    calcularDescontoBaixa({
      valor: 30,
      descontoAtual: 10,
      descontoReais: 50,
      descontoAtivo: true,
    }),
    30,
  )
})

test('calcularDescontoBaixa nao aceita desconto negativo', () => {
  assert.equal(
    calcularDescontoBaixa({
      valor: 100,
      descontoAtual: 7,
      descontoReais: -50,
      descontoAtivo: true,
    }),
    7,
  )
})

test('valorLiquidoLancamento nunca fica negativo', () => {
  assert.equal(valorLiquidoLancamento(100, 12.345), 87.66)
  assert.equal(valorLiquidoLancamento(30, 50), 0)
})

test('cortesia mantém o valor registrado sem movimentar receita', () => {
  assert.equal(valorMovimentadoLancamento(50, 0, 'cortesia'), 0)
  assert.equal(valorMovimentadoLancamento(50, 5, 'pix'), 45)
})
