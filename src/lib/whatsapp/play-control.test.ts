import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getSender } from './adapter'
import { acordarWhatsAppPlay, ManagedEvolutionSender } from './play-control'

test('adapter gerenciado usa somente controlador e exige confirmação real de envio', async () => {
  const keys = ['PLAY_CONTROL_ENABLED', 'PLAY_CONTROL_URL', 'PLAY_CONTROL_SECRET', 'WHATSAPP_PROVIDER'] as const
  const previous = keys.map(key => process.env[key])
  const original = globalThis.fetch
  const calls: string[] = []
  Object.assign(process.env, {
    PLAY_CONTROL_ENABLED: 'true', PLAY_CONTROL_URL: 'https://controller.test/',
    PLAY_CONTROL_SECRET: 'test-only', WHATSAPP_PROVIDER: 'evolution',
  })
  globalThis.fetch = async (url, init) => {
    calls.push(String(url))
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-only')
    if (String(url).endsWith('/wake')) return Response.json({ ready: true })
    assert.equal(JSON.parse(init?.body as string).conteudo, 'oi')
    return Response.json({ ok: true, providerMsgId: 'evo-id' })
  }
  try {
    const sender = getSender()
    assert.ok(sender instanceof ManagedEvolutionSender)
    await acordarWhatsAppPlay()
    const message = { para: '+5543999999999', conteudo: 'oi', template: 't', variaveis: [] }
    assert.deepEqual(await sender.enviar(message), { ok: true, providerMsgId: 'evo-id' })
    assert.deepEqual(calls, ['https://controller.test/wake', 'https://controller.test/send'])
    globalThis.fetch = async () => Response.json({ skipped: 'disabled' }, { status: 503 })
    assert.equal((await sender.enviar(message)).ok, false)
    globalThis.fetch = async () => Response.json({ ok: true })
    assert.equal((await sender.enviar(message)).ok, false, 'sem id não confirma envio')
    delete process.env.PLAY_CONTROL_SECRET
    assert.equal((await sender.enviar(message)).ok, false, 'sem segredo não envia direto')
  } finally {
    globalThis.fetch = original
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]
      else process.env[key] = previous[index]
    })
  }
})
