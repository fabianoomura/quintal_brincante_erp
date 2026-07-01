import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encontrarSlot, dentroDeAlgumPeriodo, type SlotGrade } from './grade'
import { horaParaMinutos } from './datas'

const grade: SlotGrade[] = [
  { id: 'a', nome: '2a-4a almoço', dias_semana: [1, 2, 3], hora_inicio: '11:00', hora_fim: '14:00', valor: 8, capacidade: 2 },
  { id: 'b', nome: '2a-4a jantar', dias_semana: [1, 2, 3], hora_inicio: '18:00', hora_fim: '21:00', valor: 8, capacidade: 5 },
  { id: 'c', nome: 'sábado', dias_semana: [6], hora_inicio: '11:00', hora_fim: '21:00', valor: 20, capacidade: 10 },
]
const min = horaParaMinutos

test('terça no almoço → R$8', () => {
  const s = encontrarSlot(2, min('12:30'), grade)
  assert.equal(s?.valor, 8)
  assert.equal(s?.id, 'a')
})

test('terça no jantar → outro slot R$8 (cap 5)', () => {
  const s = encontrarSlot(2, min('19:00'), grade)
  assert.equal(s?.id, 'b')
  assert.equal(s?.capacidade, 5)
})

test('sábado à tarde → R$20', () => {
  assert.equal(encontrarSlot(6, min('15:00'), grade)?.valor, 20)
})

test('fora do horário → null', () => {
  assert.equal(encontrarSlot(2, min('09:00'), grade), null)
})

test('dia sem grade → null', () => {
  assert.equal(encontrarSlot(0, min('12:00'), grade), null)
})

test('borda: início inclui, fim exclui', () => {
  assert.ok(encontrarSlot(1, min('11:00'), grade)) // 11:00 entra
  assert.equal(encontrarSlot(1, min('14:00'), grade), null) // 14:00 já saiu
})

test('dentroDeAlgumPeriodo: horário de funcionamento (feriado)', () => {
  assert.equal(dentroDeAlgumPeriodo(min('12:00'), grade), true) // dentro do almoço
  assert.equal(dentroDeAlgumPeriodo(min('19:00'), grade), true) // dentro do jantar
  assert.equal(dentroDeAlgumPeriodo(min('22:00'), grade), false) // fora de qualquer janela
})
