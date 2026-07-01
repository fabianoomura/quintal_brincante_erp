// Feriados nacionais do Brasil (fixos + móveis a partir da Páscoa). Puro e testável.
// Datas locais (ex.: aniversário de Londrina) ficam em tabela e são mescladas na app.

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Domingo de Páscoa (algoritmo Anonymous Gregorian / Meeus).
export function pascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

function somaDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Feriados nacionais de um ano → Map<'YYYY-MM-DD', nome>.
export function feriadosNacionais(ano: number): Map<string, string> {
  const m = new Map<string, string>()
  const fixos: [number, number, string][] = [
    [1, 1, 'Confraternização Universal'],
    [4, 21, 'Tiradentes'],
    [5, 1, 'Dia do Trabalho'],
    [9, 7, 'Independência'],
    [10, 12, 'Nossa Senhora Aparecida'],
    [11, 2, 'Finados'],
    [11, 15, 'Proclamação da República'],
    [11, 20, 'Consciência Negra'],
    [12, 25, 'Natal'],
  ]
  for (const [mes, dia, nome] of fixos) m.set(iso(new Date(ano, mes - 1, dia)), nome)

  const p = pascoa(ano)
  m.set(iso(somaDias(p, -47)), 'Carnaval')
  m.set(iso(somaDias(p, -2)), 'Sexta-feira Santa')
  m.set(iso(somaDias(p, 60)), 'Corpus Christi')
  return m
}
