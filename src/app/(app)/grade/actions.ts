'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }
const SEM_PERMISSAO = 'Sem permissão (apenas admin).'

export async function criarGradePlay(input: {
  nome: string
  diasSemana: number[]
  horaInicio: string
  horaFim: string
  valor: number
  capacidade: number | null
}): Promise<Resultado> {
  if (input.nome.trim() === '') return { ok: false, erro: 'Informe um nome.' }
  if (input.diasSemana.length === 0) return { ok: false, erro: 'Escolha ao menos um dia.' }
  if (!input.horaInicio || !input.horaFim) return { ok: false, erro: 'Informe o horário.' }
  if (input.horaFim <= input.horaInicio) return { ok: false, erro: 'Fim deve ser após o início.' }
  if (!(input.valor >= 0)) return { ok: false, erro: 'Valor inválido.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grade_play')
    .insert({
      nome: input.nome.trim(),
      dias_semana: input.diasSemana,
      hora_inicio: input.horaInicio,
      hora_fim: input.horaFim,
      valor: input.valor,
      capacidade: input.capacidade,
    })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/grade')
  return { ok: true }
}

// Edita valor / capacidade / horário de um período. Capacidade null = sem limite.
export async function atualizarGradePlay(
  id: string,
  input: { valor: number; capacidade: number | null; horaInicio: string; horaFim: string },
): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grade_play')
    .update({
      valor: input.valor,
      capacidade: input.capacidade,
      hora_inicio: input.horaInicio,
      hora_fim: input.horaFim,
    })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/grade')
  revalidatePath('/playground')
  return { ok: true }
}

export async function toggleGradePlay(id: string, ativo: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('grade_play').update({ ativo }).eq('id', id).select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/grade')
  return { ok: true }
}
