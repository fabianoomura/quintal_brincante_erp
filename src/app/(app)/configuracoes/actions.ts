'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Flag = 'conciliacao_automatica' | 'aviso_tempo_ativo'

export async function setFlag(
  campo: Flag,
  valor: boolean,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const patch =
    campo === 'conciliacao_automatica'
      ? { conciliacao_automatica: valor }
      : { aviso_tempo_ativo: valor }

  const supabase = await createClient()
  const { error } = await supabase.from('config_sistema').update(patch).eq('id', 1)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/configuracoes')
  return { ok: true }
}

// Capacidade máxima de crianças no dia. null = sem limite. Só admin (RLS).
export async function setCapacidade(
  valor: number | null,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('config_sistema')
    .update({ capacidade_dia: valor })
    .eq('id', 1)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) {
    return { ok: false, erro: 'Sem permissão (apenas admin).' }
  }
  revalidatePath('/configuracoes')
  revalidatePath('/presenca')
  return { ok: true }
}
