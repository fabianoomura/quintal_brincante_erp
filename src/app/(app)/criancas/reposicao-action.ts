'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }

// Troca os dias da semana do mensalista (0=dom..6=sáb). Admin (RLS em mensalidade).
export async function atualizarDiasSemana(
  mensalidadeId: string,
  criancaId: string,
  dias: number[],
): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mensalidade')
    .update({ dias_semana: dias.length > 0 ? dias : null })
    .eq('id', mensalidadeId)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão (apenas admin).' }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}

// Registra uma falta (dia perdido). Operacional.
export async function registrarFalta(
  criancaId: string,
  dataFalta: string,
  obs: string,
): Promise<Resultado> {
  if (!dataFalta) return { ok: false, erro: 'Informe a data da falta.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('reposicao')
    .insert({ crianca_id: criancaId, data_falta: dataFalta, obs: obs.trim() || null })
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}

// Agenda (ou limpa) a data de reposição de uma falta. Operacional.
export async function agendarReposicao(
  reposicaoId: string,
  criancaId: string,
  dataReposicao: string | null,
): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reposicao')
    .update({ data_reposicao: dataReposicao || null })
    .eq('id', reposicaoId)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}

export async function removerReposicao(
  reposicaoId: string,
  criancaId: string,
): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('reposicao').delete().eq('id', reposicaoId)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}
