// Telefone em E.164 para WhatsApp: +55DDDNUMERO (regra do projeto).
// Normaliza entradas comuns no Brasil; retorna null se não der p/ formar um número válido.
export function normalizeE164BR(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null

  // Já veio em E.164 com +: mantém só os dígitos após o +.
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 11 && digits.length <= 15 ? `+${digits}` : null
  }

  let digits = trimmed.replace(/\D/g, '')

  // Remove o 0 de DDD interurbano (ex.: 011 99999-9999).
  if (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '')
  }

  // DDD + número (10 fixo ou 11 celular) → prefixa 55.
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`
  }

  // Já inclui o 55 (12 ou 13 dígitos).
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return `+${digits}`
  }

  return null
}
