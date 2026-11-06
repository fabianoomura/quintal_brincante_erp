import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agendarPosOperacao } from './pos-operacao'

test('resposta não espera iniciar nem concluir mensagens', async () => {
  let callback: (() => Promise<void>) | undefined
  let iniciou = false
  let concluir!: () => void
  const pendente = new Promise<void>(resolve => { concluir = resolve })
  assert.equal(agendarPosOperacao(cb => { callback = cb }, [async () => { iniciou = true; await pendente }]), undefined)
  assert.equal(iniciou, false)
  const trabalho = callback!()
  assert.equal(iniciou, true)
  concluir()
  await trabalho
})

test('falha de mensagem não impede tarefas seguintes nem devolve erro para a operação', async () => {
  let callback: (() => Promise<void>) | undefined
  const calls: string[] = []
  agendarPosOperacao(cb => { callback = cb }, [
    async () => { throw new Error('WhatsApp offline') },
    async () => { calls.push('fila') },
  ], () => { calls.push('falha') })
  await callback!()
  assert.deepEqual(calls, ['falha', 'fila'])
})
