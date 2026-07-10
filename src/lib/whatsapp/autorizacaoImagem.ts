import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Sb = SupabaseClient<Database>

// Aceita somente respostas isoladas para não interpretar um "sim" casual da conversa.
export function interpretarRespostaAutorizacao(texto: string | null): boolean | null {
  if (!texto) return null
  const resposta = texto
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (resposta === 'sim' || resposta === 's') return true
  if (resposta === 'nao' || resposta === 'n') return false
  return null
}

// Aplica a resposta à criança da pergunta de autorização mais recente enviada
// anteriormente para o contato. O update condicional impede sobrescrever SIM/NÃO já
// registrado e torna reentregas/concorrência inofensivas.
export async function capturarRespostaAutorizacao(
  sb: Sb,
  contatoId: string | null,
  texto: string | null,
  recebidaEm: string,
): Promise<{ criancaId: string; autorizado: boolean } | null> {
  const autorizado = interpretarRespostaAutorizacao(texto)
  if (autorizado === null || !contatoId) return null

  const { data: pergunta, error: erroPergunta } = await sb
    .from('notificacao')
    .select('crianca_id')
    .eq('contato_id', contatoId)
    .eq('tipo', 'autorizacao_imagem')
    .eq('status', 'enviada')
    .lte('created_at', recebidaEm)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (erroPergunta || !pergunta) return null

  const { data: atualizada, error: erroUpdate } = await sb
    .from('crianca')
    .update({ autorizacao_imagem: autorizado, autorizacao_imagem_em: recebidaEm })
    .eq('id', pergunta.crianca_id)
    .is('autorizacao_imagem', null)
    .select('id')
    .maybeSingle()
  if (erroUpdate || !atualizada) return null

  return { criancaId: atualizada.id, autorizado }
}
