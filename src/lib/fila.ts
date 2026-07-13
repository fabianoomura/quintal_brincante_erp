// Lógica da fila de espera do play. PURA e testável — a execução real (queries,
// WhatsApp) mora em src/lib/fila-processar.ts; aqui só a decisão de quem expira
// e quem é chamado quando abre vaga.

export type EntradaFila = {
  id: string
  status: 'aguardando' | 'chamada'
  criadaEm: number // epoch ms (ordem de chegada)
  chamadaEm: number | null // epoch ms; preenchido quando status = 'chamada'
}

export type DecisaoFila = {
  expirar: string[] // chamadas cujo prazo de chegada estourou
  chamar: string[] // aguardando promovidas a chamada (em ordem de chegada)
}

// Uma chamada expira quando passou a tolerância desde o aviso.
export function chamadaExpirou(
  chamadaEm: number,
  agora: number,
  toleranciaMin: number,
): boolean {
  return agora - chamadaEm >= toleranciaMin * 60_000
}

// Decide o próximo passo da fila. Vagas = capacidade − presentes − chamadas ainda
// válidas (quem foi chamado tem vaga reservada até chegar ou expirar).
// capacidade null = sem limite → todo mundo que aguarda é chamado.
export function decidirFila(input: {
  entradas: EntradaFila[]
  presentes: number
  capacidade: number | null
  toleranciaMin: number
  agora: number
}): DecisaoFila {
  const { entradas, presentes, capacidade, toleranciaMin, agora } = input

  const expirar = entradas
    .filter(
      (e) =>
        e.status === 'chamada' &&
        e.chamadaEm != null &&
        chamadaExpirou(e.chamadaEm, agora, toleranciaMin),
    )
    .map((e) => e.id)

  const chamadasValidas = entradas.filter(
    (e) => e.status === 'chamada' && !expirar.includes(e.id),
  ).length

  const aguardando = entradas
    .filter((e) => e.status === 'aguardando')
    .sort((a, b) => a.criadaEm - b.criadaEm)

  const vagas =
    capacidade == null
      ? aguardando.length
      : Math.max(0, capacidade - presentes - chamadasValidas)

  return { expirar, chamar: aguardando.slice(0, vagas).map((e) => e.id) }
}
