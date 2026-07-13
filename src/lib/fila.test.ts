import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chamadaExpirou, decidirFila, type EntradaFila } from './fila'

const MIN = 60_000
const T0 = 1_000_000_000_000 // instante base qualquer

function aguardando(id: string, criadaEm: number): EntradaFila {
  return { id, status: 'aguardando', criadaEm, chamadaEm: null }
}

function chamada(id: string, chamadaEm: number): EntradaFila {
  return { id, status: 'chamada', criadaEm: chamadaEm - 5 * MIN, chamadaEm }
}

test('chamadaExpirou: só depois da tolerância cheia', () => {
  assert.equal(chamadaExpirou(T0, T0 + 9 * MIN, 10), false)
  assert.equal(chamadaExpirou(T0, T0 + 10 * MIN, 10), true)
  assert.equal(chamadaExpirou(T0, T0 + 25 * MIN, 10), true)
})

test('sem vaga → ninguém é chamado', () => {
  const d = decidirFila({
    entradas: [aguardando('a', T0)],
    presentes: 20,
    capacidade: 20,
    toleranciaMin: 10,
    agora: T0,
  })
  assert.deepEqual(d, { expirar: [], chamar: [] })
})

test('abriu vaga → chama a primeira da fila (ordem de chegada)', () => {
  const d = decidirFila({
    entradas: [aguardando('b', T0 + MIN), aguardando('a', T0)],
    presentes: 19,
    capacidade: 20,
    toleranciaMin: 10,
    agora: T0 + 2 * MIN,
  })
  assert.deepEqual(d.chamar, ['a'])
})

test('duas vagas → chama duas, na ordem', () => {
  const d = decidirFila({
    entradas: [aguardando('b', T0 + MIN), aguardando('a', T0), aguardando('c', T0 + 2 * MIN)],
    presentes: 18,
    capacidade: 20,
    toleranciaMin: 10,
    agora: T0 + 3 * MIN,
  })
  assert.deepEqual(d.chamar, ['a', 'b'])
})

test('chamada válida reserva a vaga — não chama a próxima por cima', () => {
  const d = decidirFila({
    entradas: [chamada('a', T0), aguardando('b', T0 + MIN)],
    presentes: 19,
    capacidade: 20,
    toleranciaMin: 10,
    agora: T0 + 5 * MIN, // 'a' ainda dentro dos 10 min
  })
  assert.deepEqual(d, { expirar: [], chamar: [] })
})

test('chamada estourou a tolerância → expira e a vaga passa pra próxima', () => {
  const d = decidirFila({
    entradas: [chamada('a', T0), aguardando('b', T0 + MIN)],
    presentes: 19,
    capacidade: 20,
    toleranciaMin: 10,
    agora: T0 + 10 * MIN,
  })
  assert.deepEqual(d, { expirar: ['a'], chamar: ['b'] })
})

test('idempotente: sem mudança de estado, rodar de novo não decide nada', () => {
  const d = decidirFila({
    entradas: [chamada('a', T0 + 10 * MIN)], // recém-chamada (a anterior já expirou e sumiu da lista)
    presentes: 19,
    capacidade: 20,
    toleranciaMin: 10,
    agora: T0 + 10 * MIN,
  })
  assert.deepEqual(d, { expirar: [], chamar: [] })
})

test('capacidade null (sem limite) → chama todo mundo que aguarda', () => {
  const d = decidirFila({
    entradas: [aguardando('a', T0), aguardando('b', T0 + MIN)],
    presentes: 50,
    capacidade: null,
    toleranciaMin: 10,
    agora: T0 + 2 * MIN,
  })
  assert.deepEqual(d.chamar, ['a', 'b'])
})

test('fila vazia com vagas → nada a fazer', () => {
  const d = decidirFila({
    entradas: [],
    presentes: 3,
    capacidade: 20,
    toleranciaMin: 10,
    agora: T0,
  })
  assert.deepEqual(d, { expirar: [], chamar: [] })
})
