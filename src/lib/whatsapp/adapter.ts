// Adapter de envio WhatsApp (spec §7). Isola o resto do sistema do provedor.
// Hoje: FAKE (dev, sem Meta). Amanhã: Cloud API oficial — só troca a implementação.

export type MensagemWhatsApp = {
  para: string // telefone E.164 do responsável
  template: string // nome do template aprovado na Meta
  variaveis: string[] // valores das {{n}}
  conteudo: string // texto renderizado (auditoria)
}

export type ResultadoEnvio =
  | { ok: true; providerMsgId: string }
  | { ok: false; erro: string }

export interface EnviarWhatsApp {
  enviar(msg: MensagemWhatsApp): Promise<ResultadoEnvio>
}

// Provider FAKE: não chama a Meta; só registra e devolve um id fake. Para dev/testes.
export class FakeSender implements EnviarWhatsApp {
  public enviados: MensagemWhatsApp[] = []

  async enviar(msg: MensagemWhatsApp): Promise<ResultadoEnvio> {
    if (!msg.para) return { ok: false, erro: 'Sem telefone do responsável.' }
    this.enviados.push(msg)
    return { ok: true, providerMsgId: `fake-${crypto.randomUUID()}` }
  }
}

// Fábrica: escolhe o provider por env. Default 'fake' enquanto não há credenciais da Meta.
// Quando o CloudSender existir, aqui vira: case 'cloud' → new CloudSender(env...).
export function getSender(): EnviarWhatsApp {
  const provider = process.env.WHATSAPP_PROVIDER ?? 'fake'
  switch (provider) {
    case 'fake':
      return new FakeSender()
    default:
      throw new Error(
        `Provider WhatsApp '${provider}' ainda não implementado. Use 'fake' até as credenciais da Meta chegarem.`,
      )
  }
}
