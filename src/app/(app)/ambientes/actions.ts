'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }
const SEM_PERMISSAO = 'Sem permissão (apenas admin).'

export async function criarAmbiente(
  nome: string,
  capacidade: number | null,
): Promise<Resultado> {
  if (nome.trim() === '') return { ok: false, erro: 'Informe um nome.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ambiente')
    .insert({ nome: nome.trim(), capacidade })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/ambientes')
  return { ok: true }
}

export async function toggleAmbiente(id: string, ativo: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ambiente')
    .update({ ativo })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/ambientes')
  return { ok: true }
}
