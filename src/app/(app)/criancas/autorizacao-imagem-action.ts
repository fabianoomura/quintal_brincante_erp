'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }

// Registra a resposta do responsável à autorização de uso de imagem. A pergunta é
// enviada por WhatsApp no check-in do play; a resposta (SIM/NÃO) chega no chip e a
// equipe marca aqui.
export async function registrarAutorizacaoImagem(
  criancaId: string,
  autorizado: boolean,
): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('crianca')
    .update({
      autorizacao_imagem: autorizado,
      autorizacao_imagem_em: new Date().toISOString(),
    })
    .eq('id', criancaId)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão.' }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}

// Volta para "pendente" (ex.: registrou errado). A pergunta automática NÃO é reenviada
// (já foi feita 1×) — a equipe confirma pessoalmente e registra de novo.
export async function limparAutorizacaoImagem(criancaId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('crianca')
    .update({ autorizacao_imagem: null, autorizacao_imagem_em: null })
    .eq('id', criancaId)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão.' }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}
