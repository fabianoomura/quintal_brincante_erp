import { test } from 'node:test'
import assert from 'node:assert/strict'
import { valorHoraPlay, type PrecoHora } from './grade'
import { horaParaMinutos } from './datas'

// planilha: seg(1)=8 no almoço; sáb(6)=20; célula 16h não existe
const precos: PrecoHora[] = [
  { dia_semana: 1, hora: 12, valor: 8 },
  { dia_semana: 1, hora: 13, valor: 8 },
  { dia_semana: 6, hora: 12, valor: 20 },
  { dia_semana: 6, hora: 19, valor: 20 },
]
const min = horaParaMinutos

test('segunda 12h30 → 8/h', () => {
  assert.equal(valorHoraPlay(1, min('12:30'), precos), 8)
})
test('sábado 19h → 20/h', () => {
  assert.equal(valorHoraPlay(6, min('19:00'), precos), 20)
})
test('hora sem célula → null (fechado)', () => {
  assert.equal(valorHoraPlay(1, min('16:00'), precos), null)
})
test('dia sem células → null', () => {
  assert.equal(valorHoraPlay(0, min('12:00'), precos), null)
})
test('usa a hora cheia (12:59 ainda é 12h)', () => {
  assert.equal(valorHoraPlay(1, min('12:59'), precos), 8)
})
