import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { POST } from './route'

const originalFetch = globalThis.fetch
const envKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EVOLUTION_WEBHOOK_SECRET'] as const
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]))

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://retencao.invalid'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-somente-teste'
  process.env.EVOLUTION_WEBHOOK_SECRET = 'segredo-teste'
  globalThis.fetch = async () => assert.fail('Consulta de banco não prevista')
})
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

function request(secret = 'segredo-teste') {
  return new Request(`http://localhost/api/webhooks/evolution?secret=${secret}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'messages.upsert', data: {
      key: { remoteJid: '5543999991111@s.whatsapp.net', id: 'mensagem-teste', fromMe: false },
      message: { conversation: 'Olá' }, messageTimestamp: 1_792_000_000,
    } }),
  })
}

type Consulta = { tabela: string; metodo: string; data: unknown; status?: number }
function banco(consultas: Consulta[]) {
  const fila = [...consultas]
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://retencao.invalid', 'nunca acessa banco real')
    const consulta = fila.shift()
    assert.ok(consulta, 'Consulta não prevista')
    assert.equal(url.pathname, `/rest/v1/${consulta.tabela}`)
    assert.equal(init?.method ?? 'GET', consulta.metodo)
    return new Response(JSON.stringify(consulta.data), {
      status: consulta.status ?? 200, headers: { 'Content-Type': 'application/json' },
    })
  }
  return () => assert.equal(fila.length, 0, 'todas as consultas esperadas executadas')
}

test('webhook não importa conteúdo nem conversa de número sem cadastro', async () => {
  const conferir = banco([{ tabela: 'contato', metodo: 'GET', data: [] }])
  const response = await POST(request())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, resultados: ['ignorada:telefone_sem_cadastro'] })
  conferir()
})

test('webhook devolve erro recuperável quando cadastro fica indisponível', async () => {
  const conferir = banco([{ tabela: 'contato', metodo: 'GET', data: { code: 'XX000', message: 'Banco indisponível' }, status: 500 }])
  const response = await POST(request())
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { ok: false, resultados: ['falha:Banco indisponível'] })
  conferir()
})

test('webhook continua importando mensagens de responsável cadastrado', async () => {
  const conferir = banco([
    { tabela: 'contato', metodo: 'GET', data: [{ id: 'responsavel' }] },
    { tabela: 'whatsapp_conversa', metodo: 'GET', data: [{ id: 'conversa', contato_id: 'responsavel' }] },
    { tabela: 'whatsapp_mensagem', metodo: 'POST', data: { id: 'mensagem' }, status: 201 },
  ])
  const response = await POST(request())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, resultados: ['gravada'] })
  conferir()
})

test('reentrega de mensagem conhecida permanece deduplicada', async () => {
  const conferir = banco([
    { tabela: 'contato', metodo: 'GET', data: [{ id: 'responsavel' }] },
    { tabela: 'whatsapp_conversa', metodo: 'GET', data: [{ id: 'conversa', contato_id: 'responsavel' }] },
    { tabela: 'whatsapp_mensagem', metodo: 'POST', data: { code: '23505', message: 'Duplicada' }, status: 409 },
  ])
  const response = await POST(request())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, resultados: ['duplicada'] })
  conferir()
})

test('webhook sem segredo válido não acessa o banco', async () => {
  assert.equal((await POST(request('incorreto'))).status, 401)
  delete process.env.EVOLUTION_WEBHOOK_SECRET
  assert.equal((await POST(request())).status, 503)
})
