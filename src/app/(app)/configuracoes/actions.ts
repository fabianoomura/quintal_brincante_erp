'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Flag = 'conciliacao_automatica' | 'aviso_tempo_ativo' | 'desconto_ativo'

export async function setFlag(
  campo: Flag,
  valor: boolean,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('config_sistema')
    .update({ [campo]: valor } as Partial<Record<Flag, boolean>>)
    .eq('id', 1)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão (apenas admin).' }

  revalidatePath('/configuracoes')
  return { ok: true }
}

// % de desconto por irmão (2º filho em diante). null = desligado.
export async function setDescontoIrmao(
  pct: number | null,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('config_sistema')
    .update({ desconto_irmao_percentual: pct })
    .eq('id', 1)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão (apenas admin).' }
  revalidatePath('/configuracoes')
  return { ok: true }
}

// Antecedência do aviso de tempo (minutos antes do limite). Só admin (RLS).
export async function setAntecedencia(
  minutos: number,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!(minutos >= 0)) return { ok: false, erro: 'Valor inválido.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('config_sistema')
    .update({ aviso_antecedencia_min: Math.round(minutos) })
    .eq('id', 1)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão (apenas admin).' }
  revalidatePath('/configuracoes')
  return { ok: true }
}

// Tolerância após o tempo contratado do play (min). Passou até X min do contratado
// → cobra só o contratado; além disso → cobra blocos de 30 min. Só admin (RLS).
export async function setTolerancia(
  minutos: number,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!(minutos >= 0)) return { ok: false, erro: 'Valor inválido.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('config_sistema')
    .update({ tolerancia_min: Math.round(minutos) })
    .eq('id', 1)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão (apenas admin).' }
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
