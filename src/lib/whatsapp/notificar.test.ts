import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { EnviarWhatsApp } from './adapter'
import { enviarNotificacao, reenviarNotificacao } from './notificar'

type Insert = Record<string, unknown>
type Update = Record<string, unknown>

function supabaseFake(opcoes: { insertError?: string } = {}) {
  const inserts: Insert[] = []
  const updates: Update[] = []

  const sb = {
    inserts,
    updates,
    from(tabela: string) {
      assert.equal(tabela, 'notificacao')
      return {
        insert(payload: Insert) {
          inserts.push(payload)
          return {
            select() {
              return {
                async single() {
                  if (opcoes.insertError) {
                    return { data: null, error: { message: opcoes.insertError } }
                  }
                  return { data: { id: 'notif-1' }, error: null }
                },
              }
            },
          }
        },
        update(payload: Update) {
          updates.push(payload)
          return {
            async eq(coluna: string, valor: string) {
              assert.equal(coluna, 'id')
              assert.equal(valor, 'notif-1')
              return { data: null, error: null }
            },
          }
        },
      }
    },
  }

  return sb as unknown as SupabaseClient<Database> & {
    inserts: Insert[]
    updates: Update[]
  }
}

function senderFake(resultado: Awaited<ReturnType<EnviarWhatsApp['enviar']>>) {
  const chamadas: Parameters<EnviarWhatsApp['enviar']>[0][] = []
  const sender: EnviarWhatsApp = {
    async enviar(payload) {
      chamadas.push(payload)
      return resultado
    },
  }
  return { sender, chamadas }
}

const notificacao = {
  crianca_id: 'crianca-1',
  contato_id: 'contato-1',
  para: '+5543999999999',
  tipo: 'ocorrencia' as const,
  template: 'ocorrencia',
  variaveis: ['Fabiano', 'Helena', 'precisa de ajuda'],
  conteudo: 'Ola Fabiano, sobre Helena: precisa de ajuda',
}

test('enviarNotificacao grava pendente, envia e marca como enviada', async () => {
  const sb = supabaseFake()
  const { sender, chamadas } = senderFake({ ok: true, providerMsgId: 'wamid.1' })

  const res = await enviarNotificacao(sb, sender, notificacao)

  assert.deepEqual(res, { ok: true, id: 'notif-1' })
  assert.equal(chamadas.length, 1)
  assert.deepEqual(chamadas[0].variaveis, ['Fabiano', 'Helena', 'precisa de ajuda'])
  assert.equal(sb.inserts[0].status, 'pendente')
  assert.equal(sb.updates[0].status, 'enviada')
  assert.equal(sb.updates[0].provider_msg_id, 'wamid.1')
  assert.ok(sb.updates[0].enviada_em)
})

test('enviarNotificacao marca falha quando sender recusa', async () => {
  const sb = supabaseFake()
  const { sender } = senderFake({ ok: false, erro: 'telefone invalido' })

  const res = await enviarNotificacao(sb, sender, notificacao)

  assert.deepEqual(res, { ok: false, id: 'notif-1', erro: 'telefone invalido' })
  assert.equal(sb.updates[0].status, 'falha')
})

test('enviarNotificacao nao chama sender se falhar ao gravar auditoria', async () => {
  const sb = supabaseFake({ insertError: 'violou RLS' })
  const { sender, chamadas } = senderFake({ ok: true, providerMsgId: 'wamid.1' })

  const res = await enviarNotificacao(sb, sender, notificacao)

  assert.deepEqual(res, { ok: false, erro: 'violou RLS' })
  assert.equal(chamadas.length, 0)
  assert.equal(sb.updates.length, 0)
})

// ── reenviarNotificacao (retry do aviso que falhou) ──────────────────────────

type UpdateRegistrado = { payload: Update; filtros: [string, unknown][] }

// Fake que cobre os dois updates do reenvio: o CLAIM (update condicional com
// .select().maybeSingle()) e o desfecho (update awaitado direto após .eq('id')).
function supabaseFakeReenvio(opcoes: { claimPerdido?: boolean } = {}) {
  const updates: UpdateRegistrado[] = []

  function builder(payload: Update) {
    const filtros: [string, unknown][] = []
    const b = {
      eq(coluna: string, valor: unknown) {
        filtros.push([coluna, valor])
        return b
      },
      select() {
        return {
          async maybeSingle() {
            updates.push({ payload, filtros })
            if (opcoes.claimPerdido) return { data: null, error: null }
            return { data: { id: 'notif-1' }, error: null }
          },
        }
      },
      then(resolve: (v: { data: null; error: null }) => void) {
        updates.push({ payload, filtros })
        resolve({ data: null, error: null })
      },
    }
    return b
  }

  const sb = {
    updates,
    from(tabela: string) {
      assert.equal(tabela, 'notificacao')
      return { update: builder }
    },
  }
  return sb as unknown as SupabaseClient<Database> & { updates: UpdateRegistrado[] }
}

const msgReenvio = {
  para: '+5543999999999',
  template: 'aviso_tempo',
  variaveis: ['Fabiano', 'Helena', '10'],
  conteudo: 'Ola Fabiano, faltam 10 min para Helena.',
}

test('reenviarNotificacao reclama a tentativa, envia e marca enviada', async () => {
  const sb = supabaseFakeReenvio()
  const { sender, chamadas } = senderFake({ ok: true, providerMsgId: 'wamid.2' })

  const res = await reenviarNotificacao(sb, sender, { id: 'notif-1', tentativas: 1 }, msgReenvio)

  assert.deepEqual(res, { ok: true, id: 'notif-1' })
  assert.equal(chamadas.length, 1)
  // claim: bump de tentativas condicionado a (id, tentativas=1, status=falha)
  assert.equal(sb.updates[0].payload.tentativas, 2)
  assert.equal(sb.updates[0].payload.status, 'pendente')
  assert.deepEqual(sb.updates[0].filtros, [
    ['id', 'notif-1'],
    ['tentativas', 1],
    ['status', 'falha'],
  ])
  // desfecho: enviada com novo provider_msg_id
  assert.equal(sb.updates[1].payload.status, 'enviada')
  assert.equal(sb.updates[1].payload.provider_msg_id, 'wamid.2')
})

test('reenviarNotificacao nao envia se outro processo reclamou a tentativa antes', async () => {
  const sb = supabaseFakeReenvio({ claimPerdido: true })
  const { sender, chamadas } = senderFake({ ok: true, providerMsgId: 'wamid.2' })

  const res = await reenviarNotificacao(sb, sender, { id: 'notif-1', tentativas: 1 }, msgReenvio)

  assert.equal(res.ok, false)
  assert.equal(chamadas.length, 0)
  assert.equal(sb.updates.length, 1) // só a tentativa de claim
})

test('reenviarNotificacao marca falha de novo quando o sender recusa', async () => {
  const sb = supabaseFakeReenvio()
  const { sender } = senderFake({ ok: false, erro: 'instancia desconectada' })

  const res = await reenviarNotificacao(sb, sender, { id: 'notif-1', tentativas: 2 }, msgReenvio)

  assert.deepEqual(res, { ok: false, id: 'notif-1', erro: 'instancia desconectada' })
  assert.equal(sb.updates[0].payload.tentativas, 3)
  assert.equal(sb.updates[1].payload.status, 'falha')
})
