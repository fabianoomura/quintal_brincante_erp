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
