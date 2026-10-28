import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/database.types'
import { telefoneCanonicoBR, variantesTelefoneBR } from './jid'

type Sb = SupabaseClient<Database>

export type ConversaRef = { id: string; contato_id: string | null }

// Webhook: só importa números presentes no cadastro. A conversa antiga, sozinha,
// não libera um desconhecido. Erro de consulta deve gerar retry, nunca descarte.
export async function obterConversaDeContatoCadastrado(
  sb: Sb,
  telefoneE164: string,
): Promise<ConversaRef | null> {
  const { data: contato, error } = await sb
    .from('contato')
    .select('id')
    .in('telefone', variantesTelefoneBR(telefoneE164))
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!contato) return null
  return obterOuCriarConversa(sb, telefoneE164, contato.id)
}

async function identificarConversa(sb: Sb, existente: ConversaRef, contatoId: string | null): Promise<ConversaRef> {
  if (existente.contato_id || !contatoId) return existente
  const { data: vinculada, error: erroVinculo } = await sb
    .from('whatsapp_conversa')
    .update({ contato_id: contatoId })
    .eq('id', existente.id)
    .is('contato_id', null)
    .select('id, contato_id')
    .maybeSingle()
  if (erroVinculo) throw new Error(erroVinculo.message)
  // Corrida com outra identificação: não sobrescrever o vínculo escolhido.
  if (vinculada) return vinculada
  const { data: atual, error: erroAtual } = await sb
    .from('whatsapp_conversa')
    .select('id, contato_id')
    .eq('id', existente.id)
    .single()
  if (erroAtual) throw new Error(erroAtual.message)
  return atual
}

// Acha (ou cria) a conversa do telefone. Identifica o contato pelo cadastro tentando
// as variantes com/sem o nono dígito; conversa nova guarda o telefone canônico.
// Chamadas explícitas da equipe/sistema continuam permitidas. O webhook usa o
// helper restrito acima. Repara o vínculo quando houve cadastro posterior.
export async function obterOuCriarConversa(
  sb: Sb,
  telefoneE164: string,
  contatoConfirmado?: string,
): Promise<ConversaRef> {
  const canonico = telefoneCanonicoBR(telefoneE164)
  const variantes = variantesTelefoneBR(telefoneE164)

  const { data: existente, error: errBusca } = await sb
    .from('whatsapp_conversa')
    .select('id, contato_id')
    .in('telefone', variantes)
    .limit(1)
    .maybeSingle()
  if (errBusca) throw new Error(errBusca.message)
  if (existente?.contato_id) return existente

  let contatoId = contatoConfirmado ?? null
  if (!contatoId) {
    const { data: contato, error: erroContato } = await sb
      .from('contato')
      .select('id')
      .in('telefone', variantes)
      .limit(1)
      .maybeSingle()
    if (erroContato) throw new Error(erroContato.message)
    contatoId = contato?.id ?? null
  }
  if (existente) {
    return identificarConversa(sb, existente, contatoId)
  }

  const { data: nova, error } = await sb
    .from('whatsapp_conversa')
    .insert({ telefone: canonico, contato_id: contatoId })
    .select('id, contato_id')
    .single()
  if (error) {
    // Corrida: outro processo criou primeiro (unique em telefone) → usa a dele.
    if (error.code === '23505') {
      const { data: criada, error: erroCriada } = await sb
        .from('whatsapp_conversa')
        .select('id, contato_id')
        .eq('telefone', canonico)
        .maybeSingle()
      if (erroCriada) throw new Error(erroCriada.message)
      if (criada) return identificarConversa(sb, criada, contatoId)
    }
    throw new Error(error.message)
  }
  return nova
}

// Não lidas por criança (badge 💬 do playground): soma as conversas dos responsáveis.
export async function naoLidasPorCrianca(
  sb: Sb,
  criancaIds: string[],
): Promise<Map<string, number>> {
  const resultado = new Map<string, number>()
  if (criancaIds.length === 0) return resultado

  const { data: vincs } = await sb
    .from('crianca_contato')
    .select('crianca_id, contato_id')
    .eq('papel', 'responsavel')
    .in('crianca_id', criancaIds)
  const contatoIds = [...new Set((vincs ?? []).map((v) => v.contato_id))]
  if (contatoIds.length === 0) return resultado

  const { data: convs } = await sb
    .from('whatsapp_conversa')
    .select('contato_id, nao_lidas')
    .in('contato_id', contatoIds)
    .gt('nao_lidas', 0)
  const porContato = new Map((convs ?? []).map((c) => [c.contato_id, c.nao_lidas]))

  for (const v of vincs ?? []) {
    const n = porContato.get(v.contato_id)
    if (n) resultado.set(v.crianca_id, (resultado.get(v.crianca_id) ?? 0) + n)
  }
  return resultado
}

export type MensagemRegistro = {
  direcao: Database['public']['Enums']['direcao_mensagem']
  conteudo: string | null
  tipo?: Database['public']['Enums']['tipo_mensagem_whatsapp']
  status?: Database['public']['Enums']['status_notificacao']
  provider_msg_id?: string | null
  resposta_de_msg_id?: string | null
  crianca_id?: string | null
  presenca_id?: string | null
  enviado_por?: string | null // colaborador; null = sistema ou mensagem recebida
  data_mensagem?: string
  raw_payload?: Json
}

export type ResultadoRegistro =
  | { ok: true; id: string | null; duplicada: boolean }
  | { ok: false; erro: string }

// Grava uma mensagem na conversa (o trigger do banco atualiza última mensagem e não
// lidas). Duplicata de provider_msg_id (reentrega do webhook, ou o espelho do sistema
// chegando junto do webhook fromMe) é tratada como sucesso silencioso.
export async function registrarMensagem(
  sb: Sb,
  conversaId: string,
  msg: MensagemRegistro,
): Promise<ResultadoRegistro> {
  const { data, error } = await sb
    .from('whatsapp_mensagem')
    .insert({
      conversa_id: conversaId,
      direcao: msg.direcao,
      conteudo: msg.conteudo,
      tipo: msg.tipo ?? 'texto',
      status: msg.status ?? (msg.direcao === 'entrada' ? 'entregue' : 'pendente'),
      provider_msg_id: msg.provider_msg_id ?? null,
      resposta_de_msg_id: msg.resposta_de_msg_id ?? null,
      crianca_id: msg.crianca_id ?? null,
      presenca_id: msg.presenca_id ?? null,
      enviado_por: msg.enviado_por ?? null,
      data_mensagem: msg.data_mensagem ?? new Date().toISOString(),
      raw_payload: msg.raw_payload ?? null,
    })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { ok: true, id: null, duplicada: true }
    return { ok: false, erro: error.message }
  }
  return { ok: true, id: data.id, duplicada: false }
}
