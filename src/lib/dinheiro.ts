// Formata valor (numeric do Postgres pode vir como string) em BRL.
export function formatBRL(valor: number | string | null): string {
  const n = typeof valor === 'string' ? Number(valor) : (valor ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
