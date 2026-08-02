import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dataISOValida,
  normalizarFiltrosFinanceiros,
  normalizarMes,
  periodoDoMes,
} from './financeiro-filtros'

test('dataISOValida rejeita datas inexistentes', () => {
  assert.equal(dataISOValida('2026-02-28'), true)
  assert.equal(dataISOValida('2026-02-30'), false)
  assert.equal(dataISOValida('02/08/2026'), false)
})

test('normalizarFiltrosFinanceiros aplica opções seguras e detecta período invertido', () => {
  assert.deepEqual(
    normalizarFiltrosFinanceiros({ status: 'hack', origem: 'x', modalidade: 'y' }, '2026-08-02'),
    {
      status: 'pendente',
      origem: 'todos',
      modalidade: 'todos',
      de: '2026-08-02',
      ate: '2026-08-02',
      erro: null,
    },
  )
  assert.equal(
    normalizarFiltrosFinanceiros({ de: '2026-08-10', ate: '2026-08-01' }).erro,
    'A data inicial não pode ser posterior à data final.',
  )
})

test('normalizarMes e periodoDoMes cobrem fevereiro bissexto', () => {
  assert.equal(normalizarMes('2026-13', '2026-08'), '2026-08')
  assert.deepEqual(periodoDoMes('2028-02'), { de: '2028-02-01', ate: '2028-02-29' })
})
