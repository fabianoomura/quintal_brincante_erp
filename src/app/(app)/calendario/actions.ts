'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }
const SEM = 'Sem permissão (apenas admin).'

export async function setValorFeriado(valor: number | null): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('config_sistema')
    .update({ valor_feriado: valor })
    .eq('id', 1)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM }
  revalidatePath('/calendario')
  return { ok: true }
}

export async function addFeriado(data: string, nome: string): Promise<Resultado> {
  if (!data) return { ok: false, erro: 'Escolha a data.' }
  if (nome.trim() === '') return { ok: false, erro: 'Dê um nome ao feriado.' }
  const supabase = await createClient()
  const { data: r, error } = await supabase
    .from('feriado')
    .insert({ data, nome: nome.trim() })
    .select('id')
  if (error) {
    const dup = error.code === '23505'
    return { ok: false, erro: dup ? 'Essa data já está cadastrada.' : error.message }
  }
  if (!r || r.length === 0) return { ok: false, erro: SEM }
  revalidatePath('/calendario')
  return { ok: true }
}

export async function removerFeriado(id: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('feriado').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/calendario')
  return { ok: true }
}
