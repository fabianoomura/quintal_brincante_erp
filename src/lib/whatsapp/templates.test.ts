import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tplAvisoTempo, tplOcorrencia } from './templates'

test('tplAvisoTempo renderiza texto e variáveis', () => {
  const r = tplAvisoTempo('Ana', 'Beto', 15)
  assert.equal(r.template, 'aviso_tempo')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto', '15'])
  assert.equal(
    r.conteudo,
    'Olá Ana, o tempo do(a) Beto no play está acabando (faltam 15 min).',
  )
})

test('tplOcorrencia renderiza texto e variáveis', () => {
  const r = tplOcorrencia('Ana', 'não se adaptou', 'chorou bastante')
  assert.equal(r.template, 'ocorrencia')
  assert.deepEqual(r.variaveis, ['Ana', 'não se adaptou', 'chorou bastante'])
  assert.equal(
    r.conteudo,
    'Olá Ana, sobre não se adaptou: chorou bastante. Pode vir ao espaço?',
  )
})
