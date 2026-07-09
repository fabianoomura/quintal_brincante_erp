import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { EnviarWhatsApp } from './adapter'
import { enviarNotificacao } from './notificar'

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
