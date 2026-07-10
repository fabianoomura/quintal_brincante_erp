// Lógica do aviso de tempo do play (spec §7). PURA e testável — o disparo real (query +
// adapter) mora no endpoint do worker; aqui só a decisão de "quem avisar" e "quanto falta".

export type PresencaAberta = {
  id: string
  entradaMin: number // entrada em minutos do dia
  tempoContratadoMin: number | null // null = play sem limite → não avisa
  jaAvisado: boolean // já existe notificacao aviso_tempo p/ essa presença?
}

// Minuto do dia em que o aviso deve começar: limite − antecedência.
export function limiteAvisoMin(
  entradaMin: number,
  tempoContratadoMin: number,
  antecedenciaMin: number,
): number {
  return entradaMin + tempoContratadoMin - antecedenciaMin
}

// Minutos que ainda faltam p/ o limite (nunca negativo) — vira a variável {{3}} do template.
export function minutosRestantes(
  agoraMin: number,
  entradaMin: number,
  tempoContratadoMin: number,
): number {
  return Math.max(0, entradaMin + tempoContratadoMin - agoraMin)
}

// Decide se ESTA presença deve ser avisada agora. Idempotente: já avisado → nunca de novo.
export function deveAvisar(
  p: PresencaAberta,
  agoraMin: number,
  antecedenciaMin: number,
): boolean {
  if (p.tempoContratadoMin == null) return false
  if (p.jaAvisado) return false
  return agoraMin >= limiteAvisoMin(p.entradaMin, p.tempoContratadoMin, antecedenciaMin)
}

// Filtra, de uma lista de presenças abertas, as que devem ser avisadas agora.
export function selecionarAvisos(
  presencas: PresencaAberta[],
  agoraMin: number,
  antecedenciaMin: number,
): PresencaAberta[] {
  return presencas.filter((p) => deveAvisar(p, agoraMin, antecedenciaMin))
}

// ── Retry do aviso que FALHOU ────────────────────────────────────────────────
// Teto de tentativas de envio (1ª + reenvios). Passou disso, desiste — problema
// crônico de envio é assunto do sinal de vida dos workers, não de loop de retry.
export const MAX_TENTATIVAS_AVISO = 3

export type NotificacaoAvisoExistente = {
  id: string
  tipo: string
  status: string
  tentativas: number
}

export type SituacaoAviso =
  | { acao: 'novo' } // nunca tentou → insere e envia
  | { acao: 'reenviar'; notificacaoId: string; tentativas: number } // falhou, tem saldo → reenvia a MESMA linha
  | { acao: 'resolvido' } // enviado/pendente/esgotado → não mexe

// O que fazer com o aviso de tempo desta presença, dado o histórico de notificações.
// 'pendente' conta como resolvido: ou está em voo agora, ou é resto de crash raro —
// nunca reenviar por cima para não arriscar mensagem dupla.
export function situacaoAviso(notifs: NotificacaoAvisoExistente[]): SituacaoAviso {
  const avisos = notifs.filter((n) => n.tipo === 'aviso_tempo')
  if (avisos.length === 0) return { acao: 'novo' }
  const falha = avisos.find(
    (n) => n.status === 'falha' && n.tentativas < MAX_TENTATIVAS_AVISO,
  )
  if (falha) return { acao: 'reenviar', notificacaoId: falha.id, tentativas: falha.tentativas }
  return { acao: 'resolvido' }
}
