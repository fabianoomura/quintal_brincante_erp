// Integração: controle de dias + reposição do mensalista. Rodar: npm run test:it
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient<Database>(URL, SR, { auth: { persistSession: false } })
type DB = SupabaseClient<Database>

async function login(email: string, senha: string): Promise<DB> {
  const c = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
  await c.auth.signInWithPassword({ email, password: senha })
  return c
}

let asAdmin: DB
let asOperador: DB
before(async () => {
  asAdmin = await login('equipe@quintal.local', 'quintal123')
  asOperador = await login('operador@quintal.local', 'operador123')
})

test('Mensalista: trocar dias (admin), registrar falta e repor (operador)', async () => {
  const { data: cri } = await asAdmin.from('crianca').insert({ nome: `Repo ${crypto.randomUUID().slice(0, 6)}` }).select('id').single()
  const cid = cri!.id
  const { data: plano } = await asAdmin.from('plano_mensalidade').select('id, valor').eq('ativo', true).limit(1).single()
  const { data: mens } = await asAdmin
    .from('mensalidade')
    .insert({ crianca_id: cid, plano_id: plano!.id, valor: plano!.valor, dia_vencimento: 10, inicio: '2026-01-01', dias_semana: [2, 5] })
    .select('id')
    .single()

  try {
    // admin troca os dias (Ter/Sex -> Seg/Qua)
    const upd = await asAdmin.from('mensalidade').update({ dias_semana: [1, 3] }).eq('id', mens!.id).select('dias_semana').single()
    assert.deepEqual(upd.data!.dias_semana, [1, 3], 'admin troca os dias')

    // operador NÃO edita dias (Tier B)
    const bloq = await asOperador.from('mensalidade').update({ dias_semana: [0] }).eq('id', mens!.id).select('id')
    assert.equal(bloq.data?.length ?? 0, 0, 'operador não altera dias')

    // operador registra falta (viagem)
    const { data: rep, error: eRep } = await asOperador
      .from('reposicao')
      .insert({ crianca_id: cid, data_falta: '2026-07-07', obs: 'viagem' })
      .select('id, data_reposicao')
      .single()
    assert.equal(eRep, null, 'operador registra falta')
    assert.equal(rep!.data_reposicao, null, 'falta começa sem reposição')

    // operador agenda a reposição em outra data
    const { data: ag } = await asOperador
      .from('reposicao')
      .update({ data_reposicao: '2026-07-09' })
      .eq('id', rep!.id)
      .select('data_reposicao')
      .single()
    assert.equal(ag!.data_reposicao, '2026-07-09', 'reposição agendada')
  } finally {
    await admin.from('crianca').delete().eq('id', cid)
  }
})
