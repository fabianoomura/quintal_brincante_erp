'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getColaboradorAtual } from '@/lib/colaborador'
import type { Database } from '@/lib/database.types'

type Papel = Database['public']['Enums']['papel_acesso']
type Resultado = { ok: true } | { ok: false; erro: string }

async function exigirAdmin() {
  const me = await getColaboradorAtual()
  if (!me || me.papel_acesso !== 'admin') return null
  return me
}

// Cria o usuário de login (auth) + a ficha de colaborador. Usa service role — por isso
// checamos que quem chama é admin ANTES de qualquer coisa.
export async function criarColaborador(input: {
  nome: string
  funcao: string
  email: string
  senha: string
  papel: Papel
}): Promise<Resultado> {
  const me = await exigirAdmin()
  if (!me) return { ok: false, erro: 'Apenas admin pode criar colaboradores.' }
  if (input.nome.trim() === '') return { ok: false, erro: 'Informe o nome.' }
  if (input.email.trim() === '') return { ok: false, erro: 'Informe o e-mail.' }
  if (input.senha.length < 6) return { ok: false, erro: 'Senha de ao menos 6 caracteres.' }

  const admin = createAdminClient()
  const { data: created, error: errU } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.senha,
    email_confirm: true,
  })
  if (errU || !created?.user) {
    return { ok: false, erro: errU?.message ?? 'Falha ao criar o login.' }
  }

  const { error: errC } = await admin.from('colaborador').insert({
    user_id: created.user.id,
    nome: input.nome.trim(),
    funcao: input.funcao.trim() === '' ? null : input.funcao.trim(),
    papel_acesso: input.papel,
  })
  if (errC) {
    // desfaz o auth user órfão se a ficha falhar
    await admin.auth.admin.deleteUser(created.user.id)
    return { ok: false, erro: errC.message }
  }

  revalidatePath('/colaboradores')
  return { ok: true }
}

export async function setColaboradorAtivo(id: string, ativo: boolean): Promise<Resultado> {
  const me = await exigirAdmin()
  if (!me) return { ok: false, erro: 'Apenas admin.' }
  if (id === me.id && !ativo) return { ok: false, erro: 'Você não pode se desativar.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('colaborador')
    .update({ ativo })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão.' }

  revalidatePath('/colaboradores')
  return { ok: true }
}

export async function setColaboradorPapel(id: string, papel: Papel): Promise<Resultado> {
  const me = await exigirAdmin()
  if (!me) return { ok: false, erro: 'Apenas admin.' }
  if (id === me.id && papel !== 'admin')
    return { ok: false, erro: 'Você não pode rebaixar a si mesmo.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('colaborador')
    .update({ papel_acesso: papel })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão.' }

  revalidatePath('/colaboradores')
  return { ok: true }
}
