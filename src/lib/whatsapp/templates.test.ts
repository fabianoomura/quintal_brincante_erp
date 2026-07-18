import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nomePessoaMensagem,
  nomeResponsavelMensagem,
  renderizarTemplate,
  tplAgradecimentoCheckout,
  tplAutorizacaoImagem,
  tplAvisoTempo,
  tplBoasVindas,
  tplDesculpaEngano,
  tplOcorrencia,
} from './templates'

test('renderizarTemplate troca variáveis por posição', () => {
  assert.equal(
    renderizarTemplate('Oi {{1}}, {{2}} chegou. Faltam {{3}} min.', ['Ana', 'Beto', '15']),
    'Oi Ana, Beto chegou. Faltam 15 min.',
  )
})

test('renderizarTemplate troca variáveis nomeadas padronizadas', () => {
  assert.equal(
    renderizarTemplate('Oi {{responsavel_nome}}, {{crianca_nome}} chegou.', [], {
      responsavel_nome: 'Ana',
      crianca_nome: 'Beto',
    }),
    'Oi Ana, Beto chegou.',
  )
})

test('renderizarTemplate preserva variáveis sem valor', () => {
  assert.equal(renderizarTemplate('Oi {{1}} {{2}}', ['Ana']), 'Oi Ana {{2}}')
  assert.equal(renderizarTemplate('Oi {{responsavel_nome}}'), 'Oi {{responsavel_nome}}')
})

test('nomeResponsavelMensagem prefere primeiro_nome e usa fallback do nome completo', () => {
  assert.equal(nomePessoaMensagem('Helena Omura'), 'Helena')
  assert.equal(nomePessoaMensagem('Helena Omura', 'Helena Maria'), 'Helena Maria')
  assert.equal(nomeResponsavelMensagem('Fabiano Omura'), 'Fabiano')
  assert.equal(nomeResponsavelMensagem('Fabiano Omura', 'Biano'), 'Biano')
})

test('tplAvisoTempo renderiza texto e variáveis', () => {
  const r = tplAvisoTempo('Ana Silva', 'Beto Souza', 15)
  assert.equal(r.template, 'aviso_tempo')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto', '15'])
  assert.equal(
    r.conteudo,
    'Olá Ana, o tempo de Beto no play está chegando ao fim. Faltam 15 min. Pode vir se aproximando, por favor?',
  )
})

test('tplAvisoTempo aceita texto antigo por posição vindo do banco', () => {
  const r = tplAvisoTempo('Ana', 'Beto Souza', 15, 'Oi {{1}}: {{2}} tem {{3}} min.')
  assert.equal(r.conteudo, 'Oi Ana: Beto tem 15 min.')
})

test('tplAvisoTempo prefere o primeiro_nome separado do banco', () => {
  const r = tplAvisoTempo('Ana Clara Silva', 'Beto Souza', 15, undefined, 'Ana Clara', 'Beto')
  assert.deepEqual(r.variaveis, ['Ana Clara', 'Beto', '15'])
})

test('tplOcorrencia renderiza texto e variáveis', () => {
  const r = tplOcorrencia('Ana Silva', 'Beto Souza', 'chorou bastante')
  assert.equal(r.template, 'ocorrencia')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto', 'chorou bastante'])
  assert.equal(r.conteudo, 'Olá Ana, sobre Beto: chorou bastante')
})

test('tplOcorrencia aceita detalhe com variável nomeada', () => {
  const r = tplOcorrencia('Ana', 'Helena Omura', '{{crianca_nome}} precisa de ajuda')
  assert.equal(r.conteudo, 'Olá Ana, sobre Helena: Helena precisa de ajuda')
})

test('tplBoasVindas renderiza variáveis nomeadas e posicionais', () => {
  const r = tplBoasVindas('Ana Silva', 'Beto Souza', 'Oi {{responsavel_nome}}/{{1}}: {{crianca_nome}}/{{2}}')
  assert.equal(r.template, 'boas_vindas')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto'])
  assert.equal(r.conteudo, 'Oi Ana/Ana: Beto/Beto')
})

test('tplAgradecimentoCheckout renderiza agradecimento', () => {
  const r = tplAgradecimentoCheckout('Ana Silva', 'Beto Souza')
  assert.equal(r.template, 'agradecimento_checkout')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto'])
  assert.equal(r.conteudo, 'Obrigado pela visita, Ana! Beto já saiu do play. Até a próxima! 💚')
})

test('tplDesculpaEngano renderiza a desculpa por engano no check-out', () => {
  const r = tplDesculpaEngano('Ana Silva', 'Beto Souza')
  assert.equal(r.template, 'desculpa_engano')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto'])
  assert.ok(r.conteudo.includes('Ana'))
  assert.ok(r.conteudo.includes('Beto continua aqui no play'))
})

test('tplAutorizacaoImagem pergunta com resposta por texto (sem botões)', () => {
  const r = tplAutorizacaoImagem('Ana Silva', 'Beto Souza')
  assert.equal(r.template, 'autorizacao_imagem')
  assert.deepEqual(r.variaveis, ['Ana', 'Beto'])
  assert.ok(r.conteudo.includes('Ana'))
  assert.ok(r.conteudo.includes('imagem de Beto'))
  assert.ok(r.conteudo.includes('*SIM* ou *NÃO*'))
})
