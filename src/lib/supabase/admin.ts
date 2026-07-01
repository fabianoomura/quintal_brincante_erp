import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Cliente com service role — bypassa RLS. SÓ no servidor (worker/jobs de fundo, sem sessão
// de usuário). Nunca importar em código client. A chave vem de env (server-only).
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
