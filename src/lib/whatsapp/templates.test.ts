import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderizarTemplate, tplAvisoTempo, tplOcorrencia } from './templates'

test('renderizarTemplate troca variáveis por posição', () => {
  assert.equal(
    renderizarTemplate('Oi {{1}}, {{2}} chegou. Faltam {{3}} min.', ['Ana', 'Beto', '15']),
    'Oi Ana, Beto chegou. Faltam 15 min.',
  )
})

test('renderizarTemplate preserva variáveis sem valor', () => {
  assert.equal(renderizarTemplate('Oi {{1}} {{2}}', ['Ana']), 'Oi Ana {{2}}')
})

test('tplAvisoTempo renderiza texto e variáveis', () => {
  const r = tplAvisoTempo('Ana', 'Beto', 15)
  assert.equal(r.template, 'aviso_tempo')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto', '15'])
  assert.equal(
    r.conteudo,
    'Olá Ana, o tempo do(a) Beto no play está acabando (faltam 15 min).',
  )
})

test('tplAvisoTempo aceita texto vindo do banco', () => {
  const r = tplAvisoTempo('Ana', 'Beto', 15, 'Oi {{1}}: {{2}} tem {{3}} min.')
  assert.equal(r.conteudo, 'Oi Ana: Beto tem 15 min.')
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

test('tplOcorrencia aceita texto vindo do banco', () => {
  const r = tplOcorrencia('Ana', 'banheiro', 'precisa de ajuda', '{{1}} / {{2}} / {{3}}')
  assert.equal(r.conteudo, 'Ana / banheiro / precisa de ajuda')
})
