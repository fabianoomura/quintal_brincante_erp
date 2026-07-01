'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }

const SEM_PERMISSAO = 'Sem permissão (apenas admin).'

export async function criarPlano(
  nome: string,
  diasPorSemana: number,
  valor: number,
): Promise<Resultado> {
  if (nome.trim() === '') return { ok: false, erro: 'Informe um nome.' }
  if (diasPorSemana < 1 || diasPorSemana > 7)
    return { ok: false, erro: 'Dias por semana deve ser de 1 a 7.' }
  if (!(valor > 0)) return { ok: false, erro: 'Informe um valor.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plano_mensalidade')
    .insert({ nome: nome.trim(), dias_por_semana: diasPorSemana, valor })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/planos')
  return { ok: true }
}

export async function togglePlano(id: string, ativo: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plano_mensalidade')
    .update({ ativo })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/planos')
  return { ok: true }
}
