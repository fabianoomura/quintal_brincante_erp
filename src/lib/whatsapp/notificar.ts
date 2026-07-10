import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { EnviarWhatsApp, MensagemWhatsApp } from './adapter'

type Tipo = Database['public']['Enums']['tipo_notificacao']

export type NotificacaoNova = {
  crianca_id: string
  contato_id: string
  para: string // telefone E.164 do responsável
  tipo: Tipo
  template: string
  variaveis: string[]
  conteudo: string
  ocorrencia_id?: string | null
  presenca_id?: string | null
}

export type ResultadoNotificacao =
  | { ok: true; id: string }
  | { ok: false; id?: string; erro: string }

// Grava a notificação (pendente), envia pelo adapter e atualiza o status.
// Usado tanto pela ocorrência (sessão do usuário) quanto pelo worker (service role).
export async function enviarNotificacao(
  sb: SupabaseClient<Database>,
  sender: EnviarWhatsApp,
  n: NotificacaoNova,
): Promise<ResultadoNotificacao> {
  const { data, error } = await sb
    .from('notificacao')
    .insert({
      crianca_id: n.crianca_id,
      contato_id: n.contato_id,
      tipo: n.tipo,
      template: n.template,
      conteudo: n.conteudo,
      ocorrencia_id: n.ocorrencia_id ?? null,
      presenca_id: n.presenca_id ?? null,
      status: 'pendente',
    })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  return dispararEAtualizar(sb, sender, data.id, {
    para: n.para,
    template: n.template,
    variaveis: n.variaveis,
    conteudo: n.conteudo,
  })
}

// Reenvio de uma notificação que FALHOU (usado pelo aviso de tempo): reclama a tentativa
// com update condicional — só um processo consegue subir tentativas de N para N+1 — e
// dispara de novo atualizando a MESMA linha (o índice único por presença continua valendo).
export async function reenviarNotificacao(
  sb: SupabaseClient<Database>,
  sender: EnviarWhatsApp,
  alvo: { id: string; tentativas: number },
  msg: MensagemWhatsApp,
): Promise<ResultadoNotificacao> {
  const { data: claimed, error } = await sb
    .from('notificacao')
    .update({ tentativas: alvo.tentativas + 1, status: 'pendente', conteudo: msg.conteudo })
    .eq('id', alvo.id)
    .eq('tentativas', alvo.tentativas)
    .eq('status', 'falha')
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, id: alvo.id, erro: error.message }
  if (!claimed) return { ok: false, id: alvo.id, erro: 'reenvio já reclamado por outro processo' }

  return dispararEAtualizar(sb, sender, alvo.id, msg)
}

// Dispara pelo adapter e grava o desfecho (enviada/falha) na linha já criada.
async function dispararEAtualizar(
  sb: SupabaseClient<Database>,
  sender: EnviarWhatsApp,
  id: string,
  msg: MensagemWhatsApp,
): Promise<ResultadoNotificacao> {
  const res = await sender.enviar(msg)

  if (res.ok) {
    await sb
      .from('notificacao')
      .update({
        status: 'enviada',
        provider_msg_id: res.providerMsgId,
        enviada_em: new Date().toISOString(),
      })
      .eq('id', id)
    return { ok: true, id }
  }

  await sb.from('notificacao').update({ status: 'falha' }).eq('id', id)
  return { ok: false, id, erro: res.erro }
}
