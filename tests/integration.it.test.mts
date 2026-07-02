// Testes de INTEGRAÇÃO contra o Supabase local. Rodar: npm run test:it
// Pré-requisitos: `supabase start`, `npm run setup:users` (cria admin+operador).
// Cobrem RLS, RBAC e os fluxos de negócio ponta a ponta.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { precoProporcional } from '@/lib/tarifador'
import { gerarMensalidades } from '@/lib/mensalidades'
import { POST as webhookPOST } from '@/app/api/webhook/infinitepay/route'
import { POST as avisoTempoPOST } from '@/app/api/worker/aviso-tempo/route'
import { POST as mensalidadesPOST } from '@/app/api/worker/mensalidades/route'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CRON = process.env.CRON_SECRET!
const IPAY = process.env.INFINITEPAY_WEBHOOK_SECRET!

const admin = createClient<Database>(URL, SR, { auth: { persistSession: false } })
type DB = SupabaseClient<Database>

async function comoUsuario(email: string, senha: string): Promise<DB> {
  const c = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: senha })
  assert.equal(error, null, `login ${email}`)
  return c
}

let asAdmin: DB
let asOperador: DB
const anon = createClient<Database>(URL, ANON, { auth: { persistSession: false } })

before(async () => {
  asAdmin = await comoUsuario('equipe@quintal.local', 'quintal123')
  asOperador = await comoUsuario('operador@quintal.local', 'operador123')
})

const uid = () => crypto.randomUUID().slice(0, 8)
const hoje = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

// helper: cria uma criança (service role) e devolve id
async function novaCrianca(nome = `IT ${uid()}`) {
  const { data } = await admin.from('crianca').insert({ nome }).select('id').single()
  return data!.id
}

// ───────────────────────── RLS ─────────────────────────
test('RLS: anônimo lê 0 linhas nas tabelas sensíveis', async () => {
  for (const tabela of ['crianca', 'contato', 'presenca', 'lancamento', 'notificacao'] as const) {
    const { data } = await anon.from(tabela).select('*').limit(5)
    assert.deepEqual(data, [], `anon deveria ver [] em ${tabela}`)
  }
})

test('RLS: anônimo não escreve', async () => {
  const { data, error } = await anon.from('crianca').insert({ nome: 'hacker' }).select('id')
  assert.ok(error || (data?.length ?? 0) === 0, 'anon não deve inserir')
})

test('RLS: usuário autenticado SEM ficha de colaborador vê 0 linhas', async () => {
  const email = `it-noffloat-${uid()}@quintal.local`
  const { data: created } = await admin.auth.admin.createUser({ email, password: 'senha123', email_confirm: true })
  if (!created?.user) throw new Error('não criou usuário de teste')
  const uidNovo = created.user.id
  try {
    const semFicha = await comoUsuario(email, 'senha123')
    const { data } = await semFicha.from('crianca').select('id').limit(3)
    assert.deepEqual(data, [], 'sem colaborador → 0 linhas')
  } finally {
    await admin.auth.admin.deleteUser(uidNovo)
  }
})

// ───────────────────────── RBAC ─────────────────────────
test('RBAC: operador faz operacional (cria criança)', async () => {
  const { data, error } = await asOperador.from('crianca').insert({ nome: `IT op ${uid()}` }).select('id')
  assert.equal(error, null)
  assert.ok(data?.[0]?.id)
  await admin.from('crianca').delete().eq('id', data![0].id)
})

test('RBAC: operador NÃO escreve config (admin-only)', async () => {
  const { data } = await asOperador.from('config_sistema').update({ aviso_tempo_ativo: true }).eq('id', 1).select('id')
  assert.equal(data?.length ?? 0, 0, 'operador bloqueado em config')
})

test('RBAC: operador NÃO cria plano nem colônia (admin-only)', async () => {
  const p = await asOperador.from('plano_mensalidade').insert({ nome: 'x', dias_por_semana: 2, valor: 1 }).select('id')
  assert.equal(p.data?.length ?? 0, 0)
  const c = await asOperador.from('colonia').insert({ nome: 'x', inicio: '2026-07-01', fim: '2026-07-02', valor: 1 }).select('id')
  assert.equal(c.data?.length ?? 0, 0)
})

test('RBAC: admin escreve config e tarifa', async () => {
  const { data } = await asAdmin.from('config_sistema').update({ aviso_tempo_ativo: true }).eq('id', 1).select('id')
  assert.equal(data?.length, 1, 'admin altera config')
})

test('RBAC: operador não se auto-promove a admin', async () => {
  const { data } = await asOperador
    .from('colaborador')
    .update({ papel_acesso: 'admin' })
    .eq('papel_acesso', 'operador')
    .select('id')
  assert.equal(data?.length ?? 0, 0)
})

// ───────────────────────── Cadastro ─────────────────────────
test('Cadastro: criança + contato + vínculo e busca por nome', async () => {
  const nome = `IT Busca ${uid()}`
  const cid = await novaCrianca(nome)
  const { data: co } = await asAdmin.from('contato').insert({ nome: 'Resp IT', telefone: '+5511999990000' }).select('id').single()
  await asAdmin.from('crianca_contato').insert({ crianca_id: cid, contato_id: co!.id, papel: 'responsavel' })

  const { data: achou } = await asAdmin.from('crianca').select('id, nome').ilike('nome', `%${nome.slice(3, 9)}%`)
  assert.ok((achou ?? []).some((c) => c.id === cid), 'busca ilike encontra')
  await admin.from('crianca').delete().eq('id', cid)
  await admin.from('contato').delete().eq('id', co!.id)
})

// ───────────────────────── Presença + tarifador + lançamento ─────────────────────────
test('Presença: check-in play → valor proporcional → lançamento pendente', async () => {
  const cid = await novaCrianca()
  // check-in trava a tarifa/hora (como a action faz pela planilha); aqui fixamos 20/h
  const { data: pre } = await asOperador
    .from('presenca')
    .insert({ crianca_id: cid, data: hoje(), entrada: '14:00', origem: 'espaco_kids', tempo_contratado_min: 120, tarifa_hora: 20 })
    .select('id')
    .single()

  // check-out (replica a action): piso 1h + proporcional → 1h10 a 20/h = 23.33
  const valor = precoProporcional(70, 20)
  assert.equal(valor, 23.33)
  await asOperador.from('presenca').update({ saida: '15:10', valor }).eq('id', pre!.id)
  await asOperador.from('lancamento').insert({
    crianca_id: cid, descricao: 'Play IT', valor, vencimento: hoje(), origem_tipo: 'presenca', origem_id: pre!.id,
  })

  const { data: lanc } = await asAdmin.from('lancamento').select('status, valor').eq('origem_id', pre!.id).single()
  assert.equal(lanc!.status, 'pendente')
  assert.ok(Number(lanc!.valor) > 0)

  // baixa manual
  const { data: baixa } = await asOperador
    .from('lancamento')
    .update({ status: 'pago', conciliado_por: 'manual', pago_em: new Date().toISOString() })
    .eq('origem_id', pre!.id)
    .eq('status', 'pendente')
    .select('status, conciliado_por')
    .single()
  assert.equal(baixa!.status, 'pago')
  assert.equal(baixa!.conciliado_por, 'manual')

  await admin.from('crianca').delete().eq('id', cid)
})

// ───────────────────────── Consentimento LGPD ─────────────────────────
test('LGPD: operador registra e revoga o consentimento', async () => {
  const cid = await novaCrianca()
  try {
    const { data: reg } = await asOperador
      .from('crianca')
      .update({ consentimento_em: new Date().toISOString(), consentimento_por: 'Mãe IT' })
      .eq('id', cid)
      .select('consentimento_por')
      .single()
    assert.equal(reg!.consentimento_por, 'Mãe IT', 'operador registra consentimento')

    const { data: rev } = await asOperador
      .from('crianca')
      .update({ consentimento_em: null, consentimento_por: null })
      .eq('id', cid)
      .select('consentimento_em')
      .single()
    assert.equal(rev!.consentimento_em, null, 'revogação limpa o registro')
  } finally {
    await admin.from('crianca').delete().eq('id', cid)
  }
})

test('Presença: "quem está aqui hoje" traz só as abertas de hoje', async () => {
  const cid = await novaCrianca()
  const { data: aberta } = await asOperador.from('presenca').insert({ crianca_id: cid, data: hoje(), entrada: '09:00', origem: 'diaria' }).select('id').single()
  const { data: lista } = await asAdmin.from('presenca').select('id').eq('data', hoje()).is('saida', null)
  assert.ok((lista ?? []).some((p) => p.id === aberta!.id))
  await admin.from('crianca').delete().eq('id', cid)
})

// ───────────────────────── Matrícula ─────────────────────────
test('Matrícula: admin cria; operador é bloqueado', async () => {
  const cid = await novaCrianca()
  const { data: plano } = await asAdmin.from('plano_mensalidade').select('id, valor').eq('ativo', true).limit(1).single()

  const ok = await asAdmin.from('mensalidade').insert({ crianca_id: cid, plano_id: plano!.id, valor: plano!.valor, dia_vencimento: 10, inicio: hoje() }).select('id')
  assert.equal(ok.data?.length, 1, 'admin matricula')

  const bloq = await asOperador.from('mensalidade').insert({ crianca_id: cid, plano_id: plano!.id, valor: 1, dia_vencimento: 5, inicio: hoje() }).select('id')
  assert.equal(bloq.data?.length ?? 0, 0, 'operador bloqueado')

  await admin.from('crianca').delete().eq('id', cid)
})

// ───────────────────────── Colônia ─────────────────────────
test('Colônia: vagas + inscrição gera lançamento + duplicidade bloqueada', async () => {
  const { data: col } = await admin.from('colonia').insert({ nome: `IT Col ${uid()}`, inicio: '2026-12-01', fim: '2026-12-10', valor: 500, vagas: 1 }).select('id, valor').single()
  const c1 = await novaCrianca()
  const c2 = await novaCrianca()
  try {
    // inscreve c1 (como operador) + lançamento
    const { data: i1 } = await asOperador.from('inscricao_colonia').insert({ colonia_id: col!.id, crianca_id: c1, valor: col!.valor }).select('id').single()
    assert.ok(i1?.id, 'operador inscreve')
    await asOperador.from('lancamento').insert({ crianca_id: c1, descricao: 'Colônia IT', valor: col!.valor, vencimento: '2026-12-01', origem_tipo: 'colonia', origem_id: i1!.id })
    const { data: lan } = await asAdmin.from('lancamento').select('id').eq('origem_id', i1!.id)
    assert.equal(lan?.length, 1, 'inscrição gerou lançamento')

    // duplicidade (mesma criança) → 23505
    const dup = await asOperador.from('inscricao_colonia').insert({ colonia_id: col!.id, crianca_id: c1, valor: col!.valor }).select('id')
    assert.equal(dup.error?.code, '23505', 'duplicidade bloqueada')

    // vagas cheias: c2 não deveria caber (regra na action; aqui checamos a contagem)
    const { count } = await asAdmin.from('inscricao_colonia').select('id', { count: 'exact', head: true }).eq('colonia_id', col!.id)
    assert.equal(count, 1, 'vaga única ocupada')
  } finally {
    await admin.from('crianca').delete().in('id', [c1, c2])
    await admin.from('colonia').delete().eq('id', col!.id)
  }
})

// ───────────────────────── Recorrência de mensalidade ─────────────────────────
test('Recorrência: gerarMensalidades é idempotente', async () => {
  const cid = await novaCrianca()
  const { data: plano } = await admin.from('plano_mensalidade').select('id, valor').eq('ativo', true).limit(1).single()
  const { data: m } = await admin.from('mensalidade').insert({ crianca_id: cid, plano_id: plano!.id, valor: plano!.valor, dia_vencimento: 10, inicio: '2026-01-01', ativo: true }).select('id').single()
  try {
    const [ay, am] = hoje().split('-').map(Number)
    const r1 = await gerarMensalidades(admin, ay, am)
    const r2 = await gerarMensalidades(admin, ay, am)
    // pelo menos a nossa foi gerada na 1ª e pulada na 2ª
    assert.ok(r1.geradas >= 1, 'gerou ao menos 1')
    const { data: lan } = await admin.from('lancamento').select('id').eq('origem_tipo', 'mensalidade').eq('origem_id', m!.id)
    assert.equal(lan?.length, 1, 'idempotente: exatamente 1 lançamento p/ a matrícula no mês')
    assert.ok(r2.puladas >= 1)
  } finally {
    await admin.from('crianca').delete().eq('id', cid) // cascade remove matrícula; lançamento tem crianca_id cascade
  }
})

test('Recorrência: worker exige CRON_SECRET', async () => {
  const semSecret = await mensalidadesPOST(new Request('http://x/api/worker/mensalidades', { method: 'POST' }))
  assert.equal(semSecret.status, 401)
  const comSecret = await mensalidadesPOST(new Request('http://x/api/worker/mensalidades', { method: 'POST', headers: { authorization: `Bearer ${CRON}` } }))
  assert.equal(comSecret.status, 200)
})

// ───────────────────────── Aviso de tempo (worker) ─────────────────────────
test('Aviso de tempo: dispara 1x no limite e é idempotente', async () => {
  const cid = await novaCrianca()
  const { data: co } = await admin.from('contato').insert({ nome: 'Resp Aviso', telefone: '+5511988880000' }).select('id').single()
  await admin.from('crianca_contato').insert({ crianca_id: cid, contato_id: co!.id, papel: 'responsavel' })
  const { data: pre } = await admin.from('presenca').insert({ crianca_id: cid, data: hoje(), entrada: '14:00', origem: 'espaco_kids', tempo_contratado_min: 120 }).select('id').single()
  await admin.from('config_sistema').update({ aviso_tempo_ativo: true }).eq('id', 1)
  try {
    const url = `http://x/api/worker/aviso-tempo?agora=15:45&data=${hoje()}`
    const r1 = await (await avisoTempoPOST(new Request(url, { method: 'POST', headers: { authorization: `Bearer ${CRON}` } }))).json()
    const avisadasP = (r1.detalhes ?? []).filter((d: { presenca: string }) => d.presenca === pre!.id)
    assert.equal(avisadasP.length, 1, 'nossa presença foi avisada')

    const r2 = await (await avisoTempoPOST(new Request(url, { method: 'POST', headers: { authorization: `Bearer ${CRON}` } }))).json()
    const de2 = (r2.detalhes ?? []).filter((d: { presenca: string }) => d.presenca === pre!.id)
    assert.equal(de2.length, 0, 'idempotente: não avisa de novo')

    const { data: nots } = await admin.from('notificacao').select('id, status, tipo').eq('presenca_id', pre!.id).eq('tipo', 'aviso_tempo')
    assert.equal(nots?.length, 1, 'exatamente 1 notificação')
    assert.equal(nots![0].status, 'enviada')
  } finally {
    await admin.from('crianca').delete().eq('id', cid)
    await admin.from('contato').delete().eq('id', co!.id)
  }
})

// ───────────────────────── Webhook InfinitePay (flag) ─────────────────────────
test('Webhook: 401 sem token; flag off ignora; flag on concilia; idempotente', async () => {
  const cid = await novaCrianca()
  const order = `IT-ORDER-${uid()}`
  const { data: lanc } = await admin.from('lancamento').insert({ crianca_id: cid, descricao: 'Play IT wh', valor: 30, vencimento: hoje(), order_nsu: order }).select('id').single()
  const payload = JSON.stringify({ order_nsu: order, transaction_nsu: 'TX-IT', capture_method: 'pix', receipt_url: 'https://r/x' })
  const req = (secret?: string) =>
    new Request('http://x/api/webhook/infinitepay', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(secret ? { 'x-infinitepay-token': secret } : {}) },
      body: payload,
    })
  try {
    // 401
    assert.equal((await webhookPOST(req())).status, 401)

    // flag OFF → ignora
    await admin.from('config_sistema').update({ conciliacao_automatica: false }).eq('id', 1)
    const off = await (await webhookPOST(req(IPAY))).json()
    assert.equal(off.ignored, true)
    const { data: aindaPend } = await admin.from('lancamento').select('status').eq('id', lanc!.id).single()
    assert.equal(aindaPend!.status, 'pendente')

    // flag ON → concilia
    await admin.from('config_sistema').update({ conciliacao_automatica: true }).eq('id', 1)
    const on = await (await webhookPOST(req(IPAY))).json()
    assert.equal(on.ok, true)
    const { data: pago } = await admin.from('lancamento').select('status, conciliado_por, transaction_nsu').eq('id', lanc!.id).single()
    assert.equal(pago!.status, 'pago')
    assert.equal(pago!.conciliado_por, 'webhook')

    // idempotente
    const again = await (await webhookPOST(req(IPAY))).json()
    assert.equal(again.jaPago, true)
  } finally {
    await admin.from('config_sistema').update({ conciliacao_automatica: false }).eq('id', 1)
    await admin.from('crianca').delete().eq('id', cid)
  }
})
