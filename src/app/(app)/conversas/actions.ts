'use server'

import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { getSender } from '@/lib/whatsapp/adapter'
import { obterOuCriarConversa, registrarMensagem } from '@/lib/whatsapp/conversas'

// Envia mensagem digitada pela equipe. Grava SEMPRE no histórico (enviada ou falha) —
// falha aparece marcada no chat, para a equipe tentar de novo.
export async function enviarMensagemConversa(
  conversaId: string,
  texto: string,
  vinculo?: { criancaId?: string | null; presencaId?: string | null },
): Promise<{ ok: true; id: string | null } | { ok: false; erro: string }> {
  const t = texto.trim()
  if (t === '') return { ok: false, erro: 'Escreva a mensagem.' }

  try {
    const supabase = await createClient()
    const colaborador = await getColaboradorAtual()
    if (!colaborador) return { ok: false, erro: 'Sessão sem colaborador ativo.' }

    const { data: conversa } = await supabase
      .from('whatsapp_conversa')
      .select('id, telefone')
      .eq('id', conversaId)
      .maybeSingle()
    if (!conversa) return { ok: false, erro: 'Conversa não encontrada.' }

    const res = await getSender().enviar({
      para: conversa.telefone,
      template: 'conversa_manual',
      variaveis: [],
      conteudo: t,
    })

    const reg = await registrarMensagem(supabase, conversa.id, {
      direcao: 'saida',
      conteudo: t,
      status: res.ok ? 'enviada' : 'falha',
      provider_msg_id: res.ok ? res.providerMsgId : null,
      crianca_id: vinculo?.criancaId ?? null,
      presenca_id: vinculo?.presencaId ?? null,
      enviado_por: colaborador.id,
    })
    if (!reg.ok) return { ok: false, erro: reg.erro }
    if (!res.ok) return { ok: false, erro: `Não foi enviada: ${res.erro}` }
    return { ok: true, id: reg.id }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// Zera o contador de não lidas (chamado quando o chat abre / recebe com o chat aberto).
export async function marcarConversaLida(conversaId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('whatsapp_conversa').update({ nao_lidas: 0 }).eq('id', conversaId)
}

// Abre (ou cria) a conversa do responsável da criança — botão 💬 do card do play.
export async function abrirConversaDoResponsavel(
  criancaId: string,
): Promise<{ ok: true; conversaId: string } | { ok: false; erro: string }> {
  try {
    const supabase = await createClient()
    const { data: vinculo } = await supabase
      .from('crianca_contato')
      .select('contato:contato_id (id, telefone)')
      .eq('crianca_id', criancaId)
      .eq('papel', 'responsavel')
      .limit(1)
      .maybeSingle()
    const telefone = vinculo?.contato?.telefone
    if (!telefone) return { ok: false, erro: 'Responsável sem telefone cadastrado.' }

    const conversa = await obterOuCriarConversa(supabase, telefone)
    return { ok: true, conversaId: conversa.id }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
}
