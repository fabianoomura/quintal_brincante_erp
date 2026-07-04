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

// Provider CLOUD: Meta WhatsApp Cloud API. Mesmo código para o número de TESTE
// (grátis, sem verificação) e para PRODUÇÃO — só mudam token/phoneId/idioma nas envs.
// Envia template já aprovado, com as {{n}} preenchidas pelo array `variaveis`.
export class CloudSender implements EnviarWhatsApp {
  constructor(
    private token: string,
    private phoneId: string,
    private lang: string = 'pt_BR',
    private version: string = 'v21.0',
  ) {}

  async enviar(msg: MensagemWhatsApp): Promise<ResultadoEnvio> {
    if (!msg.para) return { ok: false, erro: 'Sem telefone do responsável.' }

    const body = {
      messaging_product: 'whatsapp',
      to: msg.para.replace(/\D/g, ''), // Meta quer só dígitos (E.164 sem o +)
      type: 'template',
      template: {
        name: msg.template,
        language: { code: this.lang },
        // sem variáveis (ex.: hello_world) → sem components
        ...(msg.variaveis.length > 0 && {
          components: [
            {
              type: 'body',
              parameters: msg.variaveis.map((text) => ({ type: 'text', text })),
            },
          ],
        }),
      },
    }

    let resp: Response
    try {
      resp = await fetch(`https://graph.facebook.com/${this.version}/${this.phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (e) {
      return { ok: false, erro: `Falha de rede ao chamar a Meta: ${(e as Error).message}` }
    }

    const json = (await resp.json().catch(() => ({}))) as {
      messages?: { id: string }[]
      error?: { message?: string }
    }
    if (!resp.ok) {
      return { ok: false, erro: json.error?.message ?? `Meta respondeu ${resp.status}.` }
    }
    const id = json.messages?.[0]?.id
    if (!id) return { ok: false, erro: 'Meta não retornou id da mensagem.' }
    return { ok: true, providerMsgId: id }
  }
}

// Fábrica: escolhe o provider por env. Default 'fake' enquanto não há credenciais da Meta.
export function getSender(): EnviarWhatsApp {
  const provider = process.env.WHATSAPP_PROVIDER ?? 'fake'
  switch (provider) {
    case 'fake':
      return new FakeSender()
    case 'cloud': {
      const token = process.env.WHATSAPP_TOKEN
      const phoneId = process.env.WHATSAPP_PHONE_ID
      if (!token || !phoneId) {
        throw new Error(
          "Provider 'cloud' exige WHATSAPP_TOKEN e WHATSAPP_PHONE_ID nas variáveis de ambiente.",
        )
      }
      // WHATSAPP_LANG opcional (default pt_BR; use en_US p/ testar com o template hello_world).
      return new CloudSender(token, phoneId, process.env.WHATSAPP_LANG ?? 'pt_BR')
    }
    default:
      throw new Error(
        `Provider WhatsApp '${provider}' desconhecido. Use 'fake' ou 'cloud'.`,
      )
  }
}
