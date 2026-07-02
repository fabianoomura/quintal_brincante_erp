'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Flag = 'conciliacao_automatica' | 'aviso_tempo_ativo' | 'desconto_ativo'

export async function setFlag(
  campo: Flag,
  valor: boolean,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const patch: Record<Flag, boolean> = {
    conciliacao_automatica: false,
    aviso_tempo_ativo: false,
    desconto_ativo: false,
  }
  // envia só o campo alterado
  const supabase = await createClient()
  const { error } = await supabase
    .from('config_sistema')
    .update({ [campo]: valor } as Partial<typeof patch>)
    .eq('id', 1)
  if (error) return { ok: false, erro: error.message }

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

// Ajusta a tarifa do play (valores/regras). Só admin (RLS na tabela tarifa).
export async function setTarifa(input: {
  valorHora: number
  valorFracao: number
  tamanhoFracaoMin: number
  minimoMinutos: number
  avisoAntecedenciaMin: number
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!(input.valorHora >= 0) || !(input.valorFracao >= 0))
    return { ok: false, erro: 'Valores inválidos.' }
  if (input.tamanhoFracaoMin < 1 || input.minimoMinutos < 1)
    return { ok: false, erro: 'Minutos devem ser ≥ 1.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tarifa')
    .update({
      valor_hora: input.valorHora,
      valor_fracao: input.valorFracao,
      tamanho_fracao_min: input.tamanhoFracaoMin,
      minimo_minutos: input.minimoMinutos,
      aviso_antecedencia_min: input.avisoAntecedenciaMin,
    })
    .eq('ativo', true)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão (apenas admin).' }

  revalidatePath('/configuracoes')
  revalidatePath('/playground')
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
