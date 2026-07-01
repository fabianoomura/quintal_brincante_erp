// Grade do play em planilha: valor/hora por (dia da semana, hora). Puro e testável.
export type PrecoHora = { dia_semana: number; hora: number; valor: number }

// Valor/hora do play para um dia da semana (0-6) e uma hora (minutos do dia).
// Usa a hora cheia da entrada. Retorna null se a célula não existe (fechado).
export function valorHoraPlay(
  diaSemana: number,
  horaMin: number,
  precos: PrecoHora[],
): number | null {
  const hora = Math.floor(horaMin / 60)
  const c = precos.find((p) => p.dia_semana === diaSemana && p.hora === hora)
  return c ? c.valor : null
}
