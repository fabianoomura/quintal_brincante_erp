import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  jidParaTelefone,
  telefoneCanonicoBR,
  variantesTelefoneBR,
  extrairTextoMensagem,
} from './jid'

test('jidParaTelefone converte JID de pessoa em E.164', () => {
  assert.equal(jidParaTelefone('5543991203404@s.whatsapp.net'), '+5543991203404')
  assert.equal(jidParaTelefone('554391203404@s.whatsapp.net'), '+554391203404') // sem o 9
})

test('jidParaTelefone ignora grupos, status e lixo', () => {
  assert.equal(jidParaTelefone('123456789-987654@g.us'), null)
  assert.equal(jidParaTelefone('status@broadcast'), null)
  assert.equal(jidParaTelefone(''), null)
  assert.equal(jidParaTelefone(null), null)
  assert.equal(jidParaTelefone('123@s.whatsapp.net'), null) // curto demais
})

test('jidParaTelefone descarta sufixo de device (:1)', () => {
  assert.equal(jidParaTelefone('5543991203404:2@s.whatsapp.net'), '+5543991203404')
})

test('telefoneCanonicoBR insere o nono dígito em celular sem 9', () => {
  assert.equal(telefoneCanonicoBR('+554391203404'), '+5543991203404')
})

test('telefoneCanonicoBR não mexe em celular com 9, fixo e não-BR', () => {
  assert.equal(telefoneCanonicoBR('+5543991203404'), '+5543991203404')
  assert.equal(telefoneCanonicoBR('+554333241234'), '+554333241234') // fixo (3...)
  assert.equal(telefoneCanonicoBR('+14155552671'), '+14155552671') // EUA
})

test('variantesTelefoneBR cobre com e sem o nono dígito', () => {
  assert.deepEqual(new Set(variantesTelefoneBR('+554391203404')), new Set(['+554391203404', '+5543991203404']))
  assert.deepEqual(new Set(variantesTelefoneBR('+5543991203404')), new Set(['+5543991203404', '+554391203404']))
})

test('extrairTextoMensagem cobre os formatos comuns do Baileys', () => {
  assert.equal(extrairTextoMensagem({ conversation: 'SIM' }), 'SIM')
  assert.equal(extrairTextoMensagem({ extendedTextMessage: { text: 'oi, tudo bem?' } }), 'oi, tudo bem?')
  assert.equal(extrairTextoMensagem({ imageMessage: { caption: 'foto da Helena' } }), 'foto da Helena')
  assert.equal(extrairTextoMensagem({ stickerMessage: {} }), null)
  assert.equal(extrairTextoMensagem(null), null)
})
