import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CloudSender, EvolutionSender, FakeSender } from './adapter'

test('FakeSender registra e devolve id fake', async () => {
  const s = new FakeSender()
  const r = await s.enviar({ para: '+5543999999999', template: 'aviso_tempo', variaveis: ['Ana'], conteudo: 'oi' })
  assert.ok(r.ok && r.providerMsgId.startsWith('fake-'))
  assert.equal(s.enviados.length, 1)
})

test('FakeSender falha sem telefone', async () => {
  const r = await new FakeSender().enviar({ para: '', template: 't', variaveis: [], conteudo: '' })
  assert.equal(r.ok, false)
})

// Mock de fetch: captura a chamada e devolve a resposta que quisermos.
function mockFetch(resposta: { status: number; json: unknown }) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return {
      ok: resposta.status >= 200 && resposta.status < 300,
      status: resposta.status,
      json: async () => resposta.json,
    } as Response
  }
  return { fn: fn as unknown as typeof fetch, calls }
}

test('CloudSender monta o payload da Cloud API e extrai o id', async () => {
  const { fn, calls } = mockFetch({ status: 200, json: { messages: [{ id: 'wamid.ABC' }] } })
  const orig = globalThis.fetch
  globalThis.fetch = fn
  try {
    const s = new CloudSender('TOKEN', '123456', 'pt_BR')
    const r = await s.enviar({
      para: '+55 (43) 99999-9999',
      template: 'aviso_tempo',
      variaveis: ['Ana', 'Beto', '15'],
      conteudo: 'x',
    })
    assert.deepEqual(r, { ok: true, providerMsgId: 'wamid.ABC' })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://graph.facebook.com/v21.0/123456/messages')
    const headers = calls[0].init.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Bearer TOKEN')
    const body = JSON.parse(calls[0].init.body as string)
    assert.equal(body.messaging_product, 'whatsapp')
    assert.equal(body.to, '5543999999999') // só dígitos
    assert.equal(body.template.name, 'aviso_tempo')
    assert.equal(body.template.language.code, 'pt_BR')
    assert.deepEqual(body.template.components[0].parameters, [
      { type: 'text', text: 'Ana' },
      { type: 'text', text: 'Beto' },
      { type: 'text', text: '15' },
    ])
  } finally {
    globalThis.fetch = orig
  }
})

test('CloudSender sem variáveis omite components (ex.: hello_world)', async () => {
  const { fn, calls } = mockFetch({ status: 200, json: { messages: [{ id: 'wamid.X' }] } })
  const orig = globalThis.fetch
  globalThis.fetch = fn
  try {
    await new CloudSender('T', '1', 'en_US').enviar({ para: '+5543999999999', template: 'hello_world', variaveis: [], conteudo: '' })
    const body = JSON.parse(calls[0].init.body as string)
    assert.equal('components' in body.template, false)
    assert.equal(body.template.language.code, 'en_US')
  } finally {
    globalThis.fetch = orig
  }
})

test('CloudSender devolve erro quando a Meta recusa', async () => {
  const { fn } = mockFetch({ status: 400, json: { error: { message: 'Template not found' } } })
  const orig = globalThis.fetch
  globalThis.fetch = fn
  try {
    const r = await new CloudSender('T', '1').enviar({ para: '+5543999999999', template: 't', variaveis: ['a'], conteudo: '' })
    assert.deepEqual(r, { ok: false, erro: 'Template not found' })
  } finally {
    globalThis.fetch = orig
  }
})

test('EvolutionSender manda texto renderizado pro endpoint da instância', async () => {
  const { fn, calls } = mockFetch({ status: 201, json: { key: { id: 'BAE5F1A2B3C4' } } })
  const orig = globalThis.fetch
  globalThis.fetch = fn
  try {
    const s = new EvolutionSender('https://evo.exemplo.com/', 'CHAVE', 'quintal')
    const r = await s.enviar({
      para: '+55 (43) 99999-9999',
      template: 'ocorrencia',
      variaveis: ['Ana', 'banheiro', 'precisa de ajuda'],
      conteudo: 'Olá Ana, sobre banheiro: precisa de ajuda. Pode vir ao espaço?',
    })
    assert.deepEqual(r, { ok: true, providerMsgId: 'BAE5F1A2B3C4' })
    assert.equal(calls[0].url, 'https://evo.exemplo.com/message/sendText/quintal')
    const headers = calls[0].init.headers as Record<string, string>
    assert.equal(headers.apikey, 'CHAVE')
    const body = JSON.parse(calls[0].init.body as string)
    assert.equal(body.number, '5543999999999') // só dígitos
    assert.equal(body.text, 'Olá Ana, sobre banheiro: precisa de ajuda. Pode vir ao espaço?')
  } finally {
    globalThis.fetch = orig
  }
})

test('EvolutionSender devolve erro quando a API recusa', async () => {
  const { fn } = mockFetch({ status: 400, json: { response: { message: ['number not on whatsapp'] } } })
  const orig = globalThis.fetch
  globalThis.fetch = fn
  try {
    const r = await new EvolutionSender('https://evo.x.com', 'K', 'i').enviar({
      para: '+5543999999999',
      template: 't',
      variaveis: [],
      conteudo: 'oi',
    })
    assert.equal(r.ok, false)
    assert.match((r as { erro: string }).erro, /Evolution recusou/)
  } finally {
    globalThis.fetch = orig
  }
})

test('EvolutionSender falha sem telefone', async () => {
  const r = await new EvolutionSender('https://evo.x.com', 'K', 'i').enviar({ para: '', template: 't', variaveis: [], conteudo: 'oi' })
  assert.equal(r.ok, false)
})
