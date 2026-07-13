// Estado de lotação do espaço, dado o nº de crianças presentes e a capacidade do dia.
// Puro e testável; usado no painel de presença e no gerencial.

export type NivelLotacao = 'sem_limite' | 'ok' | 'quase' | 'lotado'

export type Lotacao = {
  nivel: NivelLotacao
  presentes: number
  capacidade: number | null
  vagas: number | null // null quando não há limite
}

export function calcularLotacao(
  presentes: number,
  capacidade: number | null,
): Lotacao {
  if (capacidade == null || capacidade <= 0) {
    return { nivel: 'sem_limite', presentes, capacidade: null, vagas: null }
  }
  const vagas = capacidade - presentes
  let nivel: NivelLotacao
  if (presentes >= capacidade) nivel = 'lotado'
  else if (presentes >= capacidade * 0.8) nivel = 'quase'
  else nivel = 'ok'
  return { nivel, presentes, capacidade, vagas }
}

// Previsão da próxima vaga do play: menor tempo restante entre os contratados
// (<=0 = alguém já estourou). null = ninguém com tempo contratado (sem previsão).
export function menorRestanteMin(
  presencas: { entradaMin: number; tempoContratadoMin: number | null }[],
  agoraMin: number,
): number | null {
  const restantes = presencas
    .filter((p) => p.tempoContratadoMin != null)
    .map((p) => p.entradaMin + p.tempoContratadoMin! - agoraMin)
  if (restantes.length === 0) return null
  return Math.min(...restantes)
}
