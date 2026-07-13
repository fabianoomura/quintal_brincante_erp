import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularLotacao, menorRestanteMin } from './lotacao'

test('sem capacidade → sem_limite', () => {
  const l = calcularLotacao(5, null)
  assert.equal(l.nivel, 'sem_limite')
  assert.equal(l.vagas, null)
})

test('abaixo de 80% → ok', () => {
  const l = calcularLotacao(10, 20)
  assert.equal(l.nivel, 'ok')
  assert.equal(l.vagas, 10)
})

test('entre 80% e 100% → quase', () => {
  assert.equal(calcularLotacao(16, 20).nivel, 'quase')
  assert.equal(calcularLotacao(19, 20).nivel, 'quase')
})

test('no limite ou acima → lotado', () => {
  assert.equal(calcularLotacao(20, 20).nivel, 'lotado')
  assert.equal(calcularLotacao(22, 20).nivel, 'lotado')
  assert.equal(calcularLotacao(22, 20).vagas, -2)
})

test('menorRestanteMin: menor tempo entre os contratados; estourado fica negativo', () => {
  // entradas 10:00 e 10:30, contratos 60 e 120, agora 10:50 → restam 10 e 100
  assert.equal(
    menorRestanteMin(
      [
        { entradaMin: 600, tempoContratadoMin: 60 },
        { entradaMin: 630, tempoContratadoMin: 120 },
      ],
      650,
    ),
    10,
  )
  assert.equal(menorRestanteMin([{ entradaMin: 600, tempoContratadoMin: 30 }], 650), -20)
})

test('menorRestanteMin: sem contratados → null (sem previsão)', () => {
  assert.equal(menorRestanteMin([{ entradaMin: 600, tempoContratadoMin: null }], 650), null)
  assert.equal(menorRestanteMin([], 650), null)
})
