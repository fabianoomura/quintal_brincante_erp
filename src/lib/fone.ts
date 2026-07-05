// Máscara de digitação: formata progressivamente para (DD) XXXXX-XXXX.
// Aceita colar com +55 (descarta o país), com pontuação, espaços etc.
export function formatarTelefoneBR(valor: string): string {
  let d = valor.replace(/\D/g, '')
  if (d.startsWith('55') && d.length > 11) d = d.slice(2) // colou +55 na frente
  d = d.slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` // celular (11 dígitos)
}

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
