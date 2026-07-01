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
