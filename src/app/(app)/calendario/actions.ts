'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }
const SEM = 'Sem permissão (apenas admin).'

// Cria/atualiza um feriado (nacional ou local) com seu VALOR/hora próprio. Admin.
export async function upsertFeriado(
  data: string,
  nome: string,
  valor: number | null,
): Promise<Resultado> {
  if (!data) return { ok: false, erro: 'Escolha a data.' }
  if (nome.trim() === '') return { ok: false, erro: 'Dê um nome ao feriado.' }
  const supabase = await createClient()
  const { data: r, error } = await supabase
    .from('feriado')
    .upsert({ data, nome: nome.trim(), valor, ativo: true }, { onConflict: 'data' })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!r || r.length === 0) return { ok: false, erro: SEM }
  revalidatePath('/calendario')
  revalidatePath('/grade')
  return { ok: true }
}

export async function removerFeriado(id: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('feriado').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/calendario')
  return { ok: true }
}
