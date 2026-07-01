// Cria/atualiza os usuários de DEV e suas fichas de colaborador (com papel de acesso).
// Roda com: npm run setup:users  (necessário após `supabase db reset`, que apaga o auth).
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/database.types'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SR =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient<Database>(URL, SR, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureUser(email: string, password: string): Promise<string> {
  const { data } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (data?.user) return data.user.id
  // já existe → localiza
  const { data: list } = await admin.auth.admin.listUsers()
  const u = list.users.find((x) => x.email === email)
  if (!u) throw new Error(`não consegui criar/achar ${email}`)
  return u.id
}

const contas: {
  email: string
  senha: string
  nome: string
  funcao: string
  papel: Database['public']['Enums']['papel_acesso']
}[] = [
  { email: 'equipe@quintal.local', senha: 'quintal123', nome: 'Equipe Admin', funcao: 'coordenação', papel: 'admin' },
  { email: 'operador@quintal.local', senha: 'operador123', nome: 'Operador Recepção', funcao: 'recepção', papel: 'operador' },
]

for (const c of contas) {
  const uid = await ensureUser(c.email, c.senha)
  const { error } = await admin
    .from('colaborador')
    .upsert(
      { user_id: uid, nome: c.nome, funcao: c.funcao, papel_acesso: c.papel },
      { onConflict: 'user_id' },
    )
  if (error) throw new Error(`colaborador ${c.email}: ${error.message}`)
  console.log(`✔ ${c.papel.padEnd(8)} ${c.email} / ${c.senha}`)
}

console.log('\n✅ Usuários de dev prontos.')
