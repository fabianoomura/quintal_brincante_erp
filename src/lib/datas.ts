// Data/hora no fuso da operação (Brasil). Evita o "pulo de dia" perto da meia-noite
// que aconteceria usando UTC.
const TZ = 'America/Sao_Paulo'

// 'YYYY-MM-DD' de hoje no fuso da operação.
export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

// 'HH:MM' de agora no fuso da operação.
export function agoraHora(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

// 'HH:MM' a partir de um 'HH:MM:SS' do banco (corta os segundos).
export function hhmm(hora: string): string {
  return hora.slice(0, 5)
}

// 'HH:MM(:SS)' → minutos desde a meia-noite.
export function horaParaMinutos(t: string): number {
  const [h, m] = t.split(':')
  return Number(h) * 60 + Number(m)
}

// Dia da semana (0=dom..6=sáb) de uma data 'YYYY-MM-DD'. Meio-dia evita borda de fuso.
export function diaDaSemana(dataISO: string): number {
  return new Date(`${dataISO}T12:00:00`).getDay()
}
