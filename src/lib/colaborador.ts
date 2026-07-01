import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

export type ColaboradorAtual = {
  id: string
  nome: string
  funcao: string | null
  papel_acesso: Database['public']['Enums']['papel_acesso']
}

// Colaborador ativo vinculado ao usuário logado (ou null se não houver ficha).
// Base do gate por papel na UI. A RLS já protege os dados; isto ajusta a interface.
export async function getColaboradorAtual(): Promise<ColaboradorAtual | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('colaborador')
    .select('id, nome, funcao, papel_acesso')
    .eq('user_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  return data
}

export function isAdmin(c: ColaboradorAtual | null): boolean {
  return c?.papel_acesso === 'admin'
}

// Guard p/ páginas só-admin: manda p/ a home quem não é admin.
export async function requireAdmin(): Promise<ColaboradorAtual> {
  const c = await getColaboradorAtual()
  if (!c || c.papel_acesso !== 'admin') redirect('/')
  return c
}
