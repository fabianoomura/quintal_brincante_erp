import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpretarRespostaAutorizacao } from './autorizacaoImagem'

test('interpreta respostas afirmativas de autorização', () => {
  for (const resposta of ['SIM', 'Sim', 'sim', 's', 'S', '  sim  ']) {
    assert.equal(interpretarRespostaAutorizacao(resposta), true, resposta)
  }
})

test('interpreta respostas negativas com e sem acento', () => {
  for (const resposta of ['NÃO', 'NAO', 'Não', 'Nao', 'não', 'nao', 'n', 'N', '  não  ']) {
    assert.equal(interpretarRespostaAutorizacao(resposta), false, resposta)
  }
})

test('ignora texto vazio e respostas que não são isoladas', () => {
  for (const resposta of [null, '', 'sim, autorizo', 'não sei', 'ok', 'talvez']) {
    assert.equal(interpretarRespostaAutorizacao(resposta), null, String(resposta))
  }
})
