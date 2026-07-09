import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apenasDigitos, comporEndereco, formatarCEP, normalizarUF } from './endereco'

test('formatarCEP limpa e aplica mascara', () => {
  assert.equal(apenasDigitos('86.050-120'), '86050120')
  assert.equal(formatarCEP('86050120'), '86050-120')
  assert.equal(formatarCEP('8605'), '8605')
})

test('normalizarUF deixa apenas duas letras maiusculas', () => {
  assert.equal(normalizarUF('pr'), 'PR')
  assert.equal(normalizarUF('Parana'), 'PA')
})

test('comporEndereco monta endereco legivel com campos separados', () => {
  assert.equal(
    comporEndereco({
      cep: '86050120',
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Casa 2',
      bairro: 'Centro',
      cidade: 'Londrina',
      uf: 'pr',
    }),
    'Rua das Flores, 123 - Casa 2 - Centro - Londrina/PR - CEP 86050-120',
  )
})

test('comporEndereco retorna null quando nao ha campos preenchidos', () => {
  assert.equal(comporEndereco({}), null)
})
