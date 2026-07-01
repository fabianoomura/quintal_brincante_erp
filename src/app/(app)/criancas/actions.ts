'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normalizeE164BR } from '@/lib/fone'
import type { Database } from '@/lib/database.types'

type PapelContato = Database['public']['Enums']['papel_contato']

export type ContatoInput = {
  nome: string
  telefone: string
  email: string
  cpf: string
  rg: string
  papel: PapelContato
}

export type CriancaInput = {
  nome: string
  nascimento: string // 'YYYY-MM-DD' ou ''
  saude: string
  contatos: ContatoInput[]
}

type Resultado = { ok: true; id: string } | { ok: false; erro: string }

// Cadastro RÁPIDO (a partir do play): só o essencial, mas na MESMA tabela `crianca`.
// Opcionalmente já cria o responsável (telefone p/ os avisos) e a foto.
export async function cadastroRapido(input: {
  nome: string
  respNome: string
  telefone: string
  foto: string | null
}): Promise<Resultado> {
  if (input.nome.trim() === '') return { ok: false, erro: 'Informe o nome.' }

  const supabase = await createClient()
  const { data: crianca, error } = await supabase
    .from('crianca')
    .insert({ nome: input.nome.trim(), foto: input.foto })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  if (input.telefone.trim() !== '') {
    const telefone = normalizeE164BR(input.telefone)
    if (!telefone) return { ok: false, erro: 'Telefone inválido.' }
    const { data: contato, error: errC } = await supabase
      .from('contato')
      .insert({ nome: input.respNome.trim() || 'Responsável', telefone })
      .select('id')
      .single()
    if (errC) return { ok: false, erro: errC.message }
    await supabase.from('crianca_contato').insert({
      crianca_id: crianca.id,
      contato_id: contato.id,
      papel: 'responsavel',
    })
  }

  revalidatePath('/playground')
  revalidatePath('/kiosk')
  revalidatePath('/criancas')
  return { ok: true, id: crianca.id }
}

// Insere um contato e o vínculo com a criança. Lança em caso de erro.
async function inserirContato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  criancaId: string,
  c: ContatoInput,
) {
  const telefone = c.telefone.trim() === '' ? null : normalizeE164BR(c.telefone)
  if (c.telefone.trim() !== '' && telefone === null) {
    throw new Error(`Telefone inválido para "${c.nome}".`)
  }

  const { data: contato, error: errC } = await supabase
    .from('contato')
    .insert({
      nome: c.nome.trim(),
      telefone,
      email: c.email.trim() === '' ? null : c.email.trim(),
      cpf: c.cpf.trim() === '' ? null : c.cpf.trim(),
      rg: c.rg.trim() === '' ? null : c.rg.trim(),
    })
    .select('id')
    .single()
  if (errC) throw new Error(errC.message)

  const { error: errV } = await supabase.from('crianca_contato').insert({
    crianca_id: criancaId,
    contato_id: contato.id,
    papel: c.papel,
  })
  if (errV) throw new Error(errV.message)
}

export async function createCrianca(input: CriancaInput): Promise<Resultado> {
  if (input.nome.trim() === '') return { ok: false, erro: 'Nome é obrigatório.' }

  const supabase = await createClient()

  const { data: crianca, error } = await supabase
    .from('crianca')
    .insert({
      nome: input.nome.trim(),
      nascimento: input.nascimento.trim() === '' ? null : input.nascimento,
      saude: input.saude.trim() === '' ? null : input.saude.trim(),
    })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  try {
    for (const c of input.contatos) {
      if (c.nome.trim() === '') continue // linha vazia → ignora
      await inserirContato(supabase, crianca.id, c)
    }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar contato.' }
  }

  revalidatePath('/criancas')
  return { ok: true, id: crianca.id }
}

export async function updateCrianca(
  id: string,
  input: { nome: string; nascimento: string; saude: string; ativo: boolean; foto: string | null },
): Promise<Resultado> {
  if (input.nome.trim() === '') return { ok: false, erro: 'Nome é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('crianca')
    .update({
      nome: input.nome.trim(),
      nascimento: input.nascimento.trim() === '' ? null : input.nascimento,
      saude: input.saude.trim() === '' ? null : input.saude.trim(),
      ativo: input.ativo,
      foto: input.foto,
    })
    .eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/criancas')
  revalidatePath(`/criancas/${id}`)
  return { ok: true, id }
}

export async function addContato(
  criancaId: string,
  c: ContatoInput,
): Promise<Resultado> {
  if (c.nome.trim() === '') return { ok: false, erro: 'Nome do contato é obrigatório.' }

  const supabase = await createClient()
  try {
    await inserirContato(supabase, criancaId, c)
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar contato.' }
  }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true, id: criancaId }
}

export async function removeContato(
  criancaId: string,
  contatoId: string,
  papel: PapelContato,
): Promise<Resultado> {
  const supabase = await createClient()
  // Remove só o vínculo desse papel; o contato pode servir a outras crianças/papéis.
  const { error } = await supabase
    .from('crianca_contato')
    .delete()
    .eq('crianca_id', criancaId)
    .eq('contato_id', contatoId)
    .eq('papel', papel)
  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true, id: criancaId }
}
