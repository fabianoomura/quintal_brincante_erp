'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { comporEndereco, formatarCEP, normalizarUF, type EnderecoCampos } from '@/lib/endereco'
import { normalizeE164BR } from '@/lib/fone'
import type { Database } from '@/lib/database.types'

type PapelContato = Database['public']['Enums']['papel_contato']

export type EnderecoInput = EnderecoCampos

export type ContatoInput = EnderecoInput & {
  nome: string
  primeiroNome?: string
  sobrenome?: string
  telefone: string
  email: string
  cpf: string
  rg: string
  papel: PapelContato
}

export type CriancaInput = EnderecoInput & {
  nome: string
  primeiroNome?: string
  sobrenome?: string
  nascimento: string // 'YYYY-MM-DD' ou ''
  saude: string
  contatos: ContatoInput[]
}

type Resultado = { ok: true; id: string } | { ok: false; erro: string }

function textoOuNull(v: string | undefined): string | null {
  const t = v?.trim() ?? ''
  return t === '' ? null : t
}

function comporNome(primeiroNome: string | undefined, sobrenome: string | undefined, legado: string): string {
  const partes = [primeiroNome, sobrenome]
    .map((p) => p?.trim() ?? '')
    .filter(Boolean)
  const composto = partes.join(' ')
  return composto || legado.trim()
}

function enderecoParaBanco(campos: EnderecoInput) {
  return {
    endereco: comporEndereco(campos) ?? textoOuNull(campos.endereco ?? undefined),
    cep: textoOuNull(formatarCEP(campos.cep)),
    logradouro: textoOuNull(campos.logradouro ?? undefined),
    numero: textoOuNull(campos.numero ?? undefined),
    complemento: textoOuNull(campos.complemento ?? undefined),
    bairro: textoOuNull(campos.bairro ?? undefined),
    cidade: textoOuNull(campos.cidade ?? undefined),
    uf: textoOuNull(normalizarUF(campos.uf)),
  }
}

// Insere um contato e o vínculo com a criança. Lança em caso de erro.
async function inserirContato(
  supabase: Awaited<ReturnType<typeof createClient>>,
  criancaId: string,
  c: ContatoInput,
) {
  const nome = comporNome(c.primeiroNome, c.sobrenome, c.nome)
  const telefone = c.telefone.trim() === '' ? null : normalizeE164BR(c.telefone)
  if (c.telefone.trim() !== '' && telefone === null) {
    throw new Error(`Telefone inválido para "${nome}".`)
  }

  const { data: contato, error: errC } = await supabase
    .from('contato')
    .insert({
      nome,
      primeiro_nome: textoOuNull(c.primeiroNome),
      sobrenome: textoOuNull(c.sobrenome),
      ...enderecoParaBanco(c),
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
  const nome = comporNome(input.primeiroNome, input.sobrenome, input.nome)
  if (nome === '') return { ok: false, erro: 'Nome é obrigatório.' }

  const supabase = await createClient()

  const { data: crianca, error } = await supabase
    .from('crianca')
    .insert({
      nome,
      primeiro_nome: textoOuNull(input.primeiroNome),
      sobrenome: textoOuNull(input.sobrenome),
      ...enderecoParaBanco(input),
      nascimento: input.nascimento.trim() === '' ? null : input.nascimento,
      saude: input.saude.trim() === '' ? null : input.saude.trim(),
    })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  try {
    for (const c of input.contatos) {
      if (comporNome(c.primeiroNome, c.sobrenome, c.nome) === '') continue // linha vazia → ignora
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
  input: EnderecoInput & {
    nome: string
    primeiroNome?: string
    sobrenome?: string
    nascimento: string
    saude: string
    ativo: boolean
    foto: string | null
  },
): Promise<Resultado> {
  const nome = comporNome(input.primeiroNome, input.sobrenome, input.nome)
  if (nome === '') return { ok: false, erro: 'Nome é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('crianca')
    .update({
      nome,
      primeiro_nome: textoOuNull(input.primeiroNome),
      sobrenome: textoOuNull(input.sobrenome),
      ...enderecoParaBanco(input),
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
  if (comporNome(c.primeiroNome, c.sobrenome, c.nome) === '')
    return { ok: false, erro: 'Nome do contato é obrigatório.' }

  const supabase = await createClient()
  try {
    await inserirContato(supabase, criancaId, c)
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar contato.' }
  }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true, id: criancaId }
}

// Edita os dados de um contato (e o papel do vínculo, se mudou). O telefone é
// normalizado p/ E.164 — corrigir número errado aqui conserta os avisos WhatsApp.
export async function updateContato(
  criancaId: string,
  contatoId: string,
  papelAtual: PapelContato,
  c: ContatoInput,
): Promise<Resultado> {
  const nome = comporNome(c.primeiroNome, c.sobrenome, c.nome)
  if (nome === '') return { ok: false, erro: 'Nome do contato é obrigatório.' }
  const telefone = c.telefone.trim() === '' ? null : normalizeE164BR(c.telefone)
  if (c.telefone.trim() !== '' && telefone === null) {
    return { ok: false, erro: 'Telefone inválido — informe com DDD.' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('contato')
      .update({
        nome,
        primeiro_nome: textoOuNull(c.primeiroNome),
        sobrenome: textoOuNull(c.sobrenome),
        ...enderecoParaBanco(c),
        telefone,
        email: c.email.trim() === '' ? null : c.email.trim(),
        cpf: c.cpf.trim() === '' ? null : c.cpf.trim(),
        rg: c.rg.trim() === '' ? null : c.rg.trim(),
      })
      .eq('id', contatoId)
      .select('id')
    if (error) return { ok: false, erro: error.message }
    if (!data || data.length === 0) return { ok: false, erro: 'Contato não encontrado.' }

    if (c.papel !== papelAtual) {
      const { error: errV } = await supabase
        .from('crianca_contato')
        .update({ papel: c.papel })
        .eq('crianca_id', criancaId)
        .eq('contato_id', contatoId)
        .eq('papel', papelAtual)
      if (errV) return { ok: false, erro: errV.message }
    }

    revalidatePath(`/criancas/${criancaId}`)
    return { ok: true, id: contatoId }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
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
