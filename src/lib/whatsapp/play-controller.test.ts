import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle, PlayController, productionIO, type ControlIO, type Snapshot } from '../../../infra/railway-play-controller'

function setup() {
  const calls: string[] = []
  const snapshot: Snapshot = { enabled: true, revision: 1, idle_seconds: 601, blockers: 0, margin_seconds: 600 }
  const status: Record<string, string> = { pg: 'SUCCESS', evo: 'SUCCESS' }
  let time = 0
  let claimed = false
  const io: ControlIO = {
    now: () => time,
    pause: async () => { time += 2000 },
    state: async (action) => {
      if (action === 'claim') { if (claimed) return null; claimed = true }
      if (action === 'release') { calls.push('release'); claimed = false; return null }
      if (action === 'touch') { calls.push('touch'); snapshot.revision++ }
      return { ...snapshot }
    },
    latest: async service => ({ id: service, status: status[service] }),
    start: async id => { calls.push(`start:${id}`); status[id] = 'SUCCESS' },
    stop: async id => { calls.push(`stop:${id}`); status[id] = 'REMOVED' },
    connected: async () => { calls.push('connected'); return true },
    send: async () => { calls.push('send'); return { ok: true, providerMsgId: 'real-id' } },
  }
  return { calls, snapshot, status, io, controller: new PlayController(io, 'pg', 'evo') }
}

test('último checkout: margem inteira antes de desligar Evolution, depois Postgres', async () => {
  const s = setup()
  s.snapshot.idle_seconds = 599
  assert.deepEqual(await s.controller.run('tick'), { skipped: 'margin' })
  assert.deepEqual(s.calls, ['release'])
  s.calls.length = 0
  s.snapshot.idle_seconds = 600
  assert.deepEqual(await s.controller.run('tick'), { stopped: true })
  assert.deepEqual(s.calls, ['stop:evo', 'stop:pg', 'release'])
})

test('primeiro checkin: inicia Postgres antes de Evolution e espera WhatsApp open', async () => {
  const s = setup()
  s.status.pg = s.status.evo = 'REMOVED'
  let attempts = 0
  s.io.connected = async () => { s.calls.push('connected'); return ++attempts === 2 }
  assert.deepEqual(await s.controller.run('wake'), { ready: true })
  assert.deepEqual(s.calls, ['touch', 'start:pg', 'start:evo', 'connected', 'connected', 'release'])
})

test('presença, fila ou envio pendente/falho bloqueia desligamento e recupera serviços', async () => {
  const s = setup()
  s.snapshot.blockers = 1
  s.status.pg = s.status.evo = 'REMOVED'
  assert.deepEqual(await s.controller.run('tick'), { skipped: 'busy' })
  assert.ok(!s.calls.some(c => c.startsWith('stop:')))
  assert.equal(s.status.evo, 'SUCCESS')
})

test('novo checkin durante parada causa religamento antes de liberar o lock', async () => {
  for (const target of ['evo', 'pg']) {
    const s = setup()
    const stop = s.io.stop
    s.io.stop = async id => {
      await stop(id)
      if (id === target) { s.snapshot.blockers = 1; s.snapshot.revision++ }
    }
    assert.deepEqual(await s.controller.run('tick'), { skipped: 'new_activity' })
    assert.equal(s.status.pg, 'SUCCESS')
    assert.equal(s.status.evo, 'SUCCESS')
    assert.equal(s.calls.at(-1), 'release')
  }
})

test('envio tem lock até confirmação e renova margem mesmo se falhar', async () => {
  const s = setup()
  s.io.send = async () => {
    s.calls.push('send')
    assert.equal(await s.io.state('claim', 'another'), null)
    throw new Error('rede')
  }
  await assert.rejects(s.controller.run('send', { para: '+5543999999999', conteudo: 'oi' }))
  assert.deepEqual(s.calls, ['touch', 'connected', 'send', 'touch', 'release'])
})

test('erro de leitura ou lock perdido nunca autoriza parar Postgres', async () => {
  const s = setup()
  const state = s.io.state
  let reads = 0
  s.io.state = async (action, owner) => {
    if (action === 'check' && ++reads === 3) return null
    return state(action, owner)
  }
  await assert.rejects(s.controller.run('tick'), /Lock/)
  assert.ok(!s.calls.includes('stop:pg'))
  assert.equal(s.calls.at(-1), 'release')
})

test('desabilitado não envia nem altera serviços', async () => {
  const s = setup()
  s.snapshot.enabled = false
  assert.deepEqual(await s.controller.run('send', { para: '55', conteudo: 'oi' }), { skipped: 'disabled' })
  assert.deepEqual(s.calls, ['release'])
})

test('estado desconhecido falha fechado', async () => {
  const s = setup()
  s.status.evo = 'FUTURE_STATUS'
  assert.deepEqual(await s.controller.run('tick'), { skipped: 'deployment_in_progress' })
  assert.ok(!s.calls.includes('stop:pg'))
})

test('endpoints exigem segredo inclusive quando configuração está ausente', async () => {
  const old = process.env.PLAY_CONTROL_SECRET
  delete process.env.PLAY_CONTROL_SECRET
  try {
    assert.equal((await handle(new Request('https://controller/tick', { method: 'POST' }))).status, 401)
  } finally { if (old !== undefined) process.env.PLAY_CONTROL_SECRET = old }
})

test('HTTP 200 com erro GraphQL não é sucesso', async () => {
  const oldFetch = globalThis.fetch
  const oldToken = process.env.RAILWAY_PROJECT_TOKEN
  process.env.RAILWAY_PROJECT_TOKEN = 'test-only'
  globalThis.fetch = async () => Response.json({ errors: [{ message: 'Not Authorized' }] })
  try {
    await assert.rejects(productionIO(AbortSignal.timeout(1000)).stop('id'), /GraphQL/)
  } finally {
    globalThis.fetch = oldFetch
    if (oldToken === undefined) delete process.env.RAILWAY_PROJECT_TOKEN
    else process.env.RAILWAY_PROJECT_TOKEN = oldToken
  }
})
