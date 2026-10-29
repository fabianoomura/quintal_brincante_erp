import type { EnviarWhatsApp, MensagemWhatsApp, ResultadoEnvio } from './adapter'

async function request(action: 'wake' | 'send', message?: MensagemWhatsApp) {
  const url = process.env.PLAY_CONTROL_URL
  const secret = process.env.PLAY_CONTROL_SECRET
  if (!url || !secret) throw new Error('PLAY_CONTROL_URL e PLAY_CONTROL_SECRET são obrigatórios.')
  const response = await fetch(`${url.replace(/\/$/, '')}/${action}`, {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: message ? JSON.stringify(message) : undefined,
    signal: AbortSignal.timeout(180_000), cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok) throw new Error('Controle do WhatsApp indisponível.')
  return result
}

export async function acordarWhatsAppPlay() {
  if (process.env.PLAY_CONTROL_ENABLED !== 'true') return
  const result = await request('wake')
  if (!result.ready) throw new Error('Controle do WhatsApp desabilitado.')
}

export class ManagedEvolutionSender implements EnviarWhatsApp {
  async enviar(message: MensagemWhatsApp): Promise<ResultadoEnvio> {
    if (!message.para) return { ok: false, erro: 'Sem telefone do responsável.' }
    try {
      const result = await request('send', message)
      if (result.ok === true && typeof result.providerMsgId === 'string') return result
      return { ok: false, erro: 'Evolution não confirmou o envio.' }
    } catch {
      return { ok: false, erro: 'Controle do WhatsApp indisponível; tente reenviar.' }
    }
  }
}
