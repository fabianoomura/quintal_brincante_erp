'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }
const SEM_PERMISSAO = 'Sem permissão (apenas admin).'

export async function criarColonia(input: {
  nome: string
  inicio: string
  fim: string
  valor: number
  vagas: number | null
}): Promise<Resultado> {
  if (input.nome.trim() === '') return { ok: false, erro: 'Informe o nome.' }
  if (!input.inicio || !input.fim) return { ok: false, erro: 'Informe o período.' }
  if (input.fim < input.inicio) return { ok: false, erro: 'Fim antes do início.' }
  if (!(input.valor > 0)) return { ok: false, erro: 'Informe o valor.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('colonia')
    .insert({
      nome: input.nome.trim(),
      inicio: input.inicio,
      fim: input.fim,
      valor: input.valor,
      vagas: input.vagas,
    })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/colonias')
  return { ok: true }
}

export async function toggleColonia(id: string, ativo: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('colonia')
    .update({ ativo })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO }

  revalidatePath('/colonias')
  return { ok: true }
}

// Inscreve uma criança na colônia e gera o lançamento pendente. Respeita vagas e não duplica.
export async function inscrever(coloniaId: string, criancaId: string): Promise<Resultado> {
  if (!criancaId) return { ok: false, erro: 'Selecione uma criança.' }

  const supabase = await createClient()
  const { data: colonia, error: errCol } = await supabase
    .from('colonia')
    .select('id, nome, valor, inicio, vagas')
    .eq('id', coloniaId)
    .maybeSingle()
  if (errCol) return { ok: false, erro: errCol.message }
  if (!colonia) return { ok: false, erro: 'Colônia não encontrada.' }

  if (colonia.vagas != null) {
    const { count } = await supabase
      .from('inscricao_colonia')
      .select('id', { count: 'exact', head: true })
      .eq('colonia_id', coloniaId)
    if ((count ?? 0) >= colonia.vagas) return { ok: false, erro: 'Sem vagas.' }
  }

  const { data: insc, error: errIns } = await supabase
    .from('inscricao_colonia')
    .insert({ colonia_id: coloniaId, crianca_id: criancaId, valor: colonia.valor })
    .select('id')
    .single()
  if (errIns) {
    const dup = errIns.code === '23505'
    return { ok: false, erro: dup ? 'Essa criança já está inscrita.' : errIns.message }
  }

  const { error: errLan } = await supabase.from('lancamento').insert({
    crianca_id: criancaId,
    descricao: `Colônia — ${colonia.nome}`,
    valor: colonia.valor,
    vencimento: colonia.inicio,
    origem_tipo: 'colonia',
    origem_id: insc.id,
  })
  if (errLan) return { ok: false, erro: errLan.message }

  revalidatePath(`/colonias/${coloniaId}`)
  return { ok: true }
}

export async function removerInscricao(
  inscricaoId: string,
  coloniaId: string,
): Promise<Resultado> {
  const supabase = await createClient()
  // Remove o lançamento pendente ligado (paga não mexe).
  await supabase
    .from('lancamento')
    .delete()
    .eq('origem_tipo', 'colonia')
    .eq('origem_id', inscricaoId)
    .eq('status', 'pendente')

  const { error } = await supabase.from('inscricao_colonia').delete().eq('id', inscricaoId)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/colonias/${coloniaId}`)
  return { ok: true }
}
