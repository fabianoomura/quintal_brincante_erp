// Tarifador do play — modelo "estacionamento", por HORA INICIADA.
// DECISÃO (2026-07-14): cada hora começada é cobrada CHEIA — 1h01 já conta a 2ª hora.
// A tolerância (config_sistema.tolerancia_min) perdoa até X min após cada hora fechada.
// Função PURA; dinheiro em centavos (inteiro) para nunca usar float. O valor/hora vem
// da grade `preco_hora` — aqui nada é hardcode de regra de negócio.

// Minutos entre dois horários 'HH:MM' ou 'HH:MM:SS'. Fração de minuto conta como minuto
// cheio (ceil aplicado por quem chama). Mesmo dia (MVP).
export function duracaoMinutos(entrada: string, saida: string): number {
  const min = (t: string) => {
    const [h, m, s = '0'] = t.split(':')
    return Number(h) * 60 + Number(m) + Number(s) / 60
  }
  return min(saida) - min(entrada)
}

function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100)
}

// Horas INICIADAS a cobrar: piso de 1h; passou da hora fechada além da tolerância →
// a hora seguinte conta cheia. Ex. (tol 0): 30min→1 · 1h→1 · 1h01→2 · 2h05→3.
export function horasCobraveis(minutos: number, toleranciaMin = 0): number {
  return Math.max(1, Math.ceil((minutos - toleranciaMin) / 60))
}

// Preço do play por hora iniciada. Ex. (valorHora=10, tol 0): 40min→10 · 1h→10 · 1h01→20.
export function precoHoraCheia(
  minutos: number,
  valorHora: number,
  toleranciaMin = 0,
): number {
  const centavos = horasCobraveis(minutos, toleranciaMin) * reaisParaCentavos(valorHora)
  return centavos / 100
}
