import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nomeResponsavelMensagem,
  renderizarTemplate,
  tplAvisoTempo,
  tplOcorrencia,
} from './templates'

test('renderizarTemplate troca variáveis por posição', () => {
  assert.equal(
    renderizarTemplate('Oi {{1}}, {{2}} chegou. Faltam {{3}} min.', ['Ana', 'Beto', '15']),
    'Oi Ana, Beto chegou. Faltam 15 min.',
  )
})

test('renderizarTemplate preserva variáveis sem valor', () => {
  assert.equal(renderizarTemplate('Oi {{1}} {{2}}', ['Ana']), 'Oi Ana {{2}}')
})

test('nomeResponsavelMensagem prefere primeiro_nome e usa fallback do nome completo', () => {
  assert.equal(nomeResponsavelMensagem('Fabiano Omura'), 'Fabiano')
  assert.equal(nomeResponsavelMensagem('Fabiano Omura', 'Biano'), 'Biano')
})

test('tplAvisoTempo renderiza texto e variáveis', () => {
  const r = tplAvisoTempo('Ana Silva', 'Beto', 15)
  assert.equal(r.template, 'aviso_tempo')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto', '15'])
  assert.equal(
    r.conteudo,
    'Olá Ana, o tempo de Beto no play está chegando ao fim. Faltam 15 min. Pode vir se aproximando, por favor?',
  )
})

test('tplAvisoTempo aceita texto vindo do banco', () => {
  const r = tplAvisoTempo('Ana', 'Beto', 15, 'Oi {{1}}: {{2}} tem {{3}} min.')
  assert.equal(r.conteudo, 'Oi Ana: Beto tem 15 min.')
})

test('tplAvisoTempo prefere o primeiro_nome separado do banco', () => {
  const r = tplAvisoTempo('Ana Clara Silva', 'Beto', 15, undefined, 'Ana Clara')
  assert.deepEqual(r.variaveis, ['Ana Clara', 'Beto', '15'])
})

test('tplOcorrencia renderiza texto e variáveis', () => {
  const r = tplOcorrencia('Ana Silva', 'Beto', 'chorou bastante')
  assert.equal(r.template, 'ocorrencia')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto', 'chorou bastante'])
  assert.equal(
    r.conteudo,
    'Olá Ana, sobre Beto: chorou bastante',
  )
})

test('tplOcorrencia aceita texto vindo do banco', () => {
  const r = tplOcorrencia('Ana', 'banheiro', 'precisa de ajuda', '{{1}} / {{2}} / {{3}}')
  assert.equal(r.conteudo, 'Ana / banheiro / precisa de ajuda')
})
