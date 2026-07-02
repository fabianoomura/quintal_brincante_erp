'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type TipoOcorrencia = Database['public']['Enums']['tipo_ocorrencia']
type Resultado = { ok: true } | { ok: false; erro: string }
const SEM = 'Sem permissão (apenas admin).'

export async function salvarTemplate(
  id: string,
  input: { nome: string; texto: string; categoria: string; status: string; ativo: boolean },
): Promise<Resultado> {
  if (input.texto.trim() === '') return { ok: false, erro: 'O texto não pode ficar vazio.' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mensagem_template')
    .update({
      nome: input.nome.trim(),
      texto: input.texto,
      categoria: input.categoria,
      status_aprovacao: input.status,
      ativo: input.ativo,
    })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM }
  revalidatePath('/mensagens')
  revalidatePath('/playground')
  return { ok: true }
}

export async function criarAvisoRapido(
  nome: string,
  tipoOcorrencia: TipoOcorrencia,
  texto: string,
): Promise<Resultado> {
  if (nome.trim() === '') return { ok: false, erro: 'Informe o rótulo.' }
  if (texto.trim() === '') return { ok: false, erro: 'Informe o texto.' }
  const supabase = await createClient()
  const chave = `${nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)}_${crypto.randomUUID().slice(0, 4)}`
  const { data, error } = await supabase
    .from('mensagem_template')
    .insert({ chave, nome: nome.trim(), tipo: 'aviso_rapido', tipo_ocorrencia: tipoOcorrencia, texto, ordem: 50 })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM }
  revalidatePath('/mensagens')
  revalidatePath('/playground')
  return { ok: true }
}

export async function removerTemplate(id: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('mensagem_template').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }
  revalidatePath('/mensagens')
  return { ok: true }
}
