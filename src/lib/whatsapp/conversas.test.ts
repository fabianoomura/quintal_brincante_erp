import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { obterConversaDeContatoCadastrado, obterOuCriarConversa } from './conversas'

type Result = { data: unknown; error: { message: string; code?: string } | null }
function mock(respostas: Result[]) {
  const chamadas: { tabela: string; metodo: string; args: unknown[] }[] = []
  const sb = {
    from(tabela: string) {
      const chain = new Proxy({}, {
        get(_target, metodo: string) {
          return (...args: unknown[]) => {
            chamadas.push({ tabela, metodo, args })
            if (metodo === 'maybeSingle' || metodo === 'single') {
              assert.ok(respostas.length, 'Consulta não prevista no teste')
              return Promise.resolve(respostas.shift())
            }
            return chain
          }
        },
      })
      return chain
    },
  } as unknown as SupabaseClient<Database>
  return { sb, chamadas }
}
const ok = (data: unknown): Result => ({ data, error: null })

test('webhook ignora desconhecido antes de consultar/criar conversa', async () => {
  const { sb, chamadas } = mock([ok(null)])
  assert.equal(await obterConversaDeContatoCadastrado(sb, '+5543999991111'), null)
  assert.ok(chamadas.every(c => c.tabela === 'contato'))
  assert.ok(!chamadas.some(c => c.metodo === 'insert'))
})

test('falha ao consultar cadastro não vira desconhecido silencioso', async () => {
  const { sb } = mock([{ data: null, error: { message: 'Banco indisponível' } }])
  await assert.rejects(obterConversaDeContatoCadastrado(sb, '+5543999991111'), /Banco indisponível/)
})

test('importa conhecido e tenta telefone com e sem nono dígito', async () => {
  const ref = { id: 'conversa', contato_id: 'responsavel' }
  const { sb, chamadas } = mock([ok({ id: 'responsavel' }), ok(ref)])
  assert.deepEqual(await obterConversaDeContatoCadastrado(sb, '+554399991111'), ref)
  const busca = chamadas.find(c => c.tabela === 'contato' && c.metodo === 'in')
  assert.deepEqual(busca?.args, ['telefone', ['+554399991111', '+5543999991111']])
})

test('vincula automaticamente conversa não identificada cadastrada depois', async () => {
  const ref = { id: 'conversa', contato_id: 'responsavel' }
  const { sb, chamadas } = mock([ok({ id: 'responsavel' }), ok({ id: 'conversa', contato_id: null }), ok(ref)])
  assert.deepEqual(await obterConversaDeContatoCadastrado(sb, '+5543999991111'), ref)
  assert.ok(chamadas.some(c => c.metodo === 'update' && JSON.stringify(c.args) === '[{"contato_id":"responsavel"}]'))
  assert.ok(chamadas.some(c => c.metodo === 'is' && c.args[0] === 'contato_id'))
})

test('erro de identificação não permite gravar conversa como desconhecida', async () => {
  const { sb } = mock([ok({ id: 'responsavel' }), ok({ id: 'conversa', contato_id: null }), { data: null, error: { message: 'Falhou vínculo' } }])
  await assert.rejects(obterConversaDeContatoCadastrado(sb, '+5543999991111'), /Falhou vínculo/)
})

test('cadastro confirmado cria conversa já identificada', async () => {
  const ref = { id: 'nova', contato_id: 'responsavel' }
  const { sb, chamadas } = mock([ok({ id: 'responsavel' }), ok(null), ok(ref)])
  assert.deepEqual(await obterConversaDeContatoCadastrado(sb, '+5543999991111'), ref)
  assert.ok(chamadas.some(c => c.metodo === 'insert' && JSON.stringify(c.args).includes('responsavel')))
})

test('conflito na identificação não sobrescreve o vínculo já escolhido', async () => {
  const ref = { id: 'conversa', contato_id: 'outro-cadastro' }
  const { sb } = mock([ok({ id: 'responsavel' }), ok({ id: 'conversa', contato_id: null }), ok(null), ok(ref)])
  assert.deepEqual(await obterConversaDeContatoCadastrado(sb, '+5543999991111'), ref)
})

test('criação explícita pela equipe continua permitida, mesmo sem cadastro', async () => {
  const ref = { id: 'nova', contato_id: null }
  const { sb } = mock([ok(null), ok(null), ok(ref)])
  assert.deepEqual(await obterOuCriarConversa(sb, '+5543999991111'), ref)
})

test('criação concorrente também identifica conversa criada antes sem vínculo', async () => {
  const ref = { id: 'conversa-concorrente', contato_id: 'responsavel' }
  const { sb } = mock([
    ok({ id: 'responsavel' }), ok(null),
    { data: null, error: { code: '23505', message: 'Outro processo criou' } },
    ok({ id: ref.id, contato_id: null }), ok(ref),
  ])
  assert.deepEqual(await obterConversaDeContatoCadastrado(sb, '+5543999991111'), ref)
})

test('erro na releitura após criação concorrente não é ocultado', async () => {
  const { sb } = mock([
    ok({ id: 'responsavel' }), ok(null),
    { data: null, error: { code: '23505', message: 'Outro processo criou' } },
    { data: null, error: { message: 'Falha na releitura' } },
  ])
  await assert.rejects(obterConversaDeContatoCadastrado(sb, '+5543999991111'), /Falha na releitura/)
})
