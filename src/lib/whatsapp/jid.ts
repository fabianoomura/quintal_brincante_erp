// Telefones no mundo Evolution/Baileys — PURO e testável.
// Pegadinha do NONO DÍGITO: o JID de quem manda pode vir sem o 9 (cadastro antigo
// no WhatsApp): '554391203404@s.whatsapp.net' para o mesmo número que o ERP guarda
// como '+5543991203404'. Todo casamento com o cadastro precisa tentar as duas formas.

// '5543991203404@s.whatsapp.net' → '+5543991203404'.
// null para grupos (@g.us), status/broadcast e JIDs que não são de pessoa.
export function jidParaTelefone(jid: string | null | undefined): string | null {
  if (!jid || !jid.endsWith('@s.whatsapp.net')) return null
  const digits = jid.split('@')[0].split(':')[0].replace(/\D/g, '')
  if (digits.length < 11 || digits.length > 15) return null
  return `+${digits}`
}

// Forma canônica BR para CHAVEAR a conversa: celular sempre COM o 9.
// 55 + DDD + 8 dígitos começando em 6-9 (celular sem o 9) → insere o 9.
// Fixos (começam em 2-5) e números não-BR passam intactos.
export function telefoneCanonicoBR(e164: string): string {
  const d = e164.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('55') && '6789'.includes(d[4])) {
    return `+${d.slice(0, 4)}9${d.slice(4)}`
  }
  return `+${d}`
}

// Variantes para casar com o telefone do cadastro (com e sem o nono dígito).
export function variantesTelefoneBR(e164: string): string[] {
  const original = `+${e164.replace(/\D/g, '')}`
  const canonico = telefoneCanonicoBR(e164)
  const variantes = new Set([original, canonico])
  const d = canonico.slice(1)
  // celular COM 9 → variante sem (cadastro pode ter sido salvo na forma antiga)
  if (d.length === 13 && d.startsWith('55') && d[4] === '9') {
    variantes.add(`+${d.slice(0, 4)}${d.slice(5)}`)
  }
  return [...variantes]
}

// Texto de uma mensagem do payload messages.upsert (Baileys). null = sem texto (mídia,
// figurinha, enquete etc.) — a mensagem é gravada mesmo assim, com tipo 'outro'.
type PayloadMensagem = {
  conversation?: string
  extendedTextMessage?: { text?: string }
  imageMessage?: { caption?: string }
  videoMessage?: { caption?: string }
}

export function extrairTextoMensagem(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null
  const m = message as PayloadMensagem
  const texto =
    m.conversation ?? m.extendedTextMessage?.text ?? m.imageMessage?.caption ?? m.videoMessage?.caption
  return texto && texto.trim() !== '' ? texto : null
}
