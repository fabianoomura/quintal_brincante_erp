import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { EnviarWhatsApp } from './adapter'

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

  const res = await sender.enviar({
    para: n.para,
    template: n.template,
    variaveis: n.variaveis,
    conteudo: n.conteudo,
  })

  if (res.ok) {
    await sb
      .from('notificacao')
      .update({
        status: 'enviada',
        provider_msg_id: res.providerMsgId,
        enviada_em: new Date().toISOString(),
      })
      .eq('id', data.id)
    return { ok: true, id: data.id }
  }

  await sb.from('notificacao').update({ status: 'falha' }).eq('id', data.id)
  return { ok: false, id: data.id, erro: res.erro }
}
