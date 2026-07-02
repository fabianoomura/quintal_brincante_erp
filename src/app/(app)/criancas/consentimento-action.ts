'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }

// Registra o consentimento LGPD do responsável (recepção coleta a assinatura/aceite).
export async function registrarConsentimento(
  criancaId: string,
  responsavel: string,
): Promise<Resultado> {
  if (responsavel.trim() === '')
    return { ok: false, erro: 'Informe quem consentiu (responsável).' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('crianca')
    .update({ consentimento_em: new Date().toISOString(), consentimento_por: responsavel.trim() })
    .eq('id', criancaId)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão.' }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}

export async function revogarConsentimento(criancaId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('crianca')
    .update({ consentimento_em: null, consentimento_por: null })
    .eq('id', criancaId)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão.' }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}
