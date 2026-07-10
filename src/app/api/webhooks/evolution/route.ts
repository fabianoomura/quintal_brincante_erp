import { createAdminClient } from '@/lib/supabase/admin'
import { jidParaTelefone, extrairTextoMensagem } from '@/lib/whatsapp/jid'
import { obterOuCriarConversa, registrarMensagem } from '@/lib/whatsapp/conversas'
import { capturarRespostaAutorizacao } from '@/lib/whatsapp/autorizacaoImagem'

// Webhook da Evolution API (evento MESSAGES_UPSERT) — Central de Conversas, fase 1.
// Toda mensagem que passa pelo chip (recebida do responsável OU enviada — fromMe)
// é gravada no ERP: aqui é a fonte de verdade do histórico; a Evolution é só gateway.
//
// Segurança: fail-closed — sem EVOLUTION_WEBHOOK_SECRET configurado, não processa.
// O secret vai na URL configurada na instância (?secret=...).
// Dedupe: índice único (conversa, provider_msg_id) — reentrega da Evolution e o
// duplo registro sistema+webhook (mensagens fromMe já espelhadas pelo notificar)
// caem no mesmo guarda.
//
// Respostas textuais SIM/NÃO atualizam a autorização de imagem pendente. Status de
// entrega/leitura (MESSAGES_UPDATE) continua como evolução futura.

type EvoKey = { remoteJid?: string; fromMe?: boolean; id?: string }
type EvoItem = {
  key?: EvoKey
  message?: unknown
  messageTimestamp?: number | string
}

export async function POST(request: Request) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ erro: 'webhook não configurado' }, { status: 503 })
  }
  const url = new URL(request.url)
  if (url.searchParams.get('secret') !== secret) {
    return Response.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    event?: string
    data?: EvoItem | EvoItem[]
  } | null
  if (!body) return Response.json({ erro: 'payload inválido' }, { status: 400 })

  // Evolution nomeia o evento como 'messages.upsert' (ou MESSAGES_UPSERT na config).
  const evento = String(body.event ?? '').toLowerCase().replace(/_/g, '.')
  if (evento !== 'messages.upsert') {
    return Response.json({ ignored: true, evento })
  }

  const itens = Array.isArray(body.data) ? body.data : [body.data]
  const sb = createAdminClient()
  const resultados: string[] = []

  for (const item of itens) {
    const key = item?.key
    const telefone = jidParaTelefone(key?.remoteJid)
    if (!telefone) {
      resultados.push('ignorada:grupo_ou_jid_invalido')
      continue
    }

    const texto = extrairTextoMensagem(item?.message)
    const quando = item?.messageTimestamp
      ? new Date(Number(item.messageTimestamp) * 1000).toISOString()
      : new Date().toISOString()

    try {
      const conversa = await obterOuCriarConversa(sb, telefone)
      const res = await registrarMensagem(sb, conversa.id, {
        direcao: key?.fromMe ? 'saida' : 'entrada',
        conteudo: texto,
        tipo: texto != null ? 'texto' : 'outro',
        status: 'entregue',
        provider_msg_id: key?.id ?? null,
        data_mensagem: quando,
        raw_payload: JSON.parse(JSON.stringify(item ?? null)),
      })
      if (!res.ok) {
        resultados.push(`falha:${res.erro}`)
        continue
      }

      let captura: Awaited<ReturnType<typeof capturarRespostaAutorizacao>> = null
      if (!res.duplicada && !key?.fromMe) {
        captura = await capturarRespostaAutorizacao(sb, conversa.contato_id, texto, quando)
        if (captura && res.id) {
          await sb
            .from('whatsapp_mensagem')
            .update({ crianca_id: captura.criancaId })
            .eq('id', res.id)
        }
      }

      resultados.push(
        res.duplicada
          ? 'duplicada'
          : captura
            ? `gravada:autorizacao_${captura.autorizado ? 'sim' : 'nao'}`
            : 'gravada',
      )
    } catch (e) {
      resultados.push(`falha:${e instanceof Error ? e.message : 'erro'}`)
    }
  }

  return Response.json({ ok: true, resultados })
}
