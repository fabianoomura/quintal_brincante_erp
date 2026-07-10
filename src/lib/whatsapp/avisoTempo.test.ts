import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  deveAvisar,
  selecionarAvisos,
  minutosRestantes,
  limiteAvisoMin,
  situacaoAviso,
  MAX_TENTATIVAS_AVISO,
  type NotificacaoAvisoExistente,
  type PresencaAberta,
} from './avisoTempo'

// Cenário: entrada 14:00 (840 min), contratado 120 min → limite 16:00 (960).
// Antecedência 15 min → avisar a partir de 15:45 (945).
const ANTEC = 15
const base: PresencaAberta = {
  id: 'p1',
  entradaMin: 14 * 60,
  tempoContratadoMin: 120,
  jaAvisado: false,
}

test('limiteAvisoMin = entrada + contratado - antecedência', () => {
  assert.equal(limiteAvisoMin(14 * 60, 120, 15), 15 * 60 + 45)
})

test('antes do limite → não avisa', () => {
  assert.equal(deveAvisar(base, 15 * 60 + 44, ANTEC), false)
})

test('exatamente no limite → avisa', () => {
  assert.equal(deveAvisar(base, 15 * 60 + 45, ANTEC), true)
})

test('depois do limite → avisa', () => {
  assert.equal(deveAvisar(base, 15 * 60 + 50, ANTEC), true)
})

test('idempotência: já avisado → nunca de novo', () => {
  assert.equal(deveAvisar({ ...base, jaAvisado: true }, 16 * 60, ANTEC), false)
})

test('sem tempo_contratado → não avisa', () => {
  assert.equal(
    deveAvisar({ ...base, tempoContratadoMin: null }, 20 * 60, ANTEC),
    false,
  )
})

test('minutosRestantes nunca negativo', () => {
  assert.equal(minutosRestantes(15 * 60 + 45, 14 * 60, 120), 15)
  assert.equal(minutosRestantes(17 * 60, 14 * 60, 120), 0)
})

test('selecionarAvisos filtra só quem cruzou o limite e não foi avisado', () => {
  const lista: PresencaAberta[] = [
    { id: 'no-limite', entradaMin: 14 * 60, tempoContratadoMin: 120, jaAvisado: false }, // avisa
    { id: 'cedo', entradaMin: 15 * 60, tempoContratadoMin: 120, jaAvisado: false }, // ainda não
    { id: 'ja', entradaMin: 14 * 60, tempoContratadoMin: 120, jaAvisado: true }, // idempotente
    { id: 'sem-limite', entradaMin: 14 * 60, tempoContratadoMin: null, jaAvisado: false }, // sem tempo
  ]
  const ids = selecionarAvisos(lista, 15 * 60 + 45, ANTEC).map((p) => p.id)
  assert.deepEqual(ids, ['no-limite'])
})

// ── situacaoAviso (retry do aviso que falhou) ────────────────────────────────

const notif = (
  status: string,
  tentativas = 1,
  tipo = 'aviso_tempo',
): NotificacaoAvisoExistente => ({ id: `n-${status}-${tentativas}`, tipo, status, tentativas })

test('situacaoAviso: sem notificação → novo', () => {
  assert.deepEqual(situacaoAviso([]), { acao: 'novo' })
})

test('situacaoAviso: notificação de OUTRO tipo não conta', () => {
  assert.deepEqual(situacaoAviso([notif('falha', 1, 'boas_vindas')]), { acao: 'novo' })
})

test('situacaoAviso: enviada → resolvido (nunca de novo)', () => {
  assert.deepEqual(situacaoAviso([notif('enviada')]), { acao: 'resolvido' })
})

test('situacaoAviso: pendente → resolvido (pode estar em voo; não arrisca dupla)', () => {
  assert.deepEqual(situacaoAviso([notif('pendente')]), { acao: 'resolvido' })
})

test('situacaoAviso: falha com saldo → reenviar a mesma linha', () => {
  const sit = situacaoAviso([notif('falha', 1)])
  assert.deepEqual(sit, { acao: 'reenviar', notificacaoId: 'n-falha-1', tentativas: 1 })
})

test('situacaoAviso: falha com tentativas esgotadas → resolvido (desiste)', () => {
  assert.deepEqual(situacaoAviso([notif('falha', MAX_TENTATIVAS_AVISO)]), {
    acao: 'resolvido',
  })
})
