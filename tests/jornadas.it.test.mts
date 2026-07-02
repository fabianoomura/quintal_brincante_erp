// Testes de USO por papel (jornadas realistas). Rodar: npm run test:it
// Simulam um dia de operador (recepção) e de gestor (admin), exercitando as ações reais.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { precoProporcional } from '@/lib/tarifador'
import { gerarMensalidades } from '@/lib/mensalidades'
import { FakeSender } from '@/lib/whatsapp/adapter'
import { enviarNotificacao } from '@/lib/whatsapp/notificar'
import { tplOcorrencia } from '@/lib/whatsapp/templates'
import { AVISOS_RAPIDOS } from '@/lib/whatsapp/avisosRapidos'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(URL, SR, { auth: { persistSession: false } })
type DB = SupabaseClient<Database>

async function login(email: string, senha: string): Promise<DB> {
  const c = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: senha })
  assert.equal(error, null, `login ${email}`)
  return c
}

let asAdmin: DB
let asOperador: DB
before(async () => {
  asAdmin = await login('equipe@quintal.local', 'quintal123')
  asOperador = await login('operador@quintal.local', 'operador123')
})

const uid = () => crypto.randomUUID().slice(0, 8)
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

// ══════════════════════ JORNADA DO OPERADOR (recepção) ══════════════════════
test('Jornada OPERADOR: recebe, avisa no WhatsApp, cobra e baixa', async () => {
  // Prep: uma criança com responsável (via admin)
  const { data: cri } = await asAdmin.from('crianca').insert({ nome: `Jornada Op ${uid()}` }).select('id').single()
  const cid = cri!.id
  const { data: co } = await asAdmin.from('contato').insert({ nome: 'Mãe Jornada', telefone: '+5511900001111' }).select('id').single()
  await asAdmin.from('crianca_contato').insert({ crianca_id: cid, contato_id: co!.id, papel: 'responsavel' })

  try {
    // 1) Vê quem está aqui hoje (lista abre sem erro)
    const { error: eLista } = await asOperador.from('presenca').select('id').eq('data', hoje()).is('saida', null)
    assert.equal(eLista, null, 'operador vê a lista de presença')

    // 2) Check-in no playground (espaco_kids, 60min contratado)
    const { data: pre, error: eIn } = await asOperador
      .from('presenca')
      .insert({ crianca_id: cid, data: hoje(), entrada: '14:00', origem: 'espaco_kids', tempo_contratado_min: 60, tarifa_hora: 20 })
      .select('id')
      .single()
    assert.equal(eIn, null, 'operador faz check-in')

    // 3) Avisa o responsável (aviso rápido do play: "banheiro")
    const aviso = AVISOS_RAPIDOS.find((a) => a.id === 'banheiro')!
    const { data: vinc } = await asOperador
      .from('crianca_contato')
      .select('contato:contato_id (id, nome, telefone)')
      .eq('crianca_id', cid)
      .eq('papel', 'responsavel')
      .single()
    const resp = vinc!.contato!
    const { data: oc } = await asOperador
      .from('ocorrencia')
      .insert({ crianca_id: cid, tipo: aviso.tipo, descricao: aviso.texto, presenca_id: pre!.id })
      .select('id')
      .single()
    const render = tplOcorrencia(resp.nome, 'aviso', aviso.texto)
    const env = await enviarNotificacao(asOperador, new FakeSender(), {
      crianca_id: cid, contato_id: resp.id, para: resp.telefone!, tipo: 'ocorrencia',
      template: render.template, variaveis: render.variaveis, conteudo: render.conteudo, ocorrencia_id: oc!.id, presenca_id: pre!.id,
    })
    assert.ok(env.ok, 'operador dispara aviso ao responsável')
    const { data: notif } = await asAdmin.from('notificacao').select('status').eq('ocorrencia_id', oc!.id).single()
    assert.equal(notif!.status, 'enviada')

    // 4) Check-out → preço proporcional (tarifa/hora travada no check-in) → lançamento
    const valor = precoProporcional(70, 20) // 1h10 a 20/h = 23.33
    await asOperador.from('presenca').update({ saida: '15:10', valor }).eq('id', pre!.id)
    await asOperador.from('lancamento').insert({ crianca_id: cid, descricao: 'Play', valor, vencimento: hoje(), origem_tipo: 'presenca', origem_id: pre!.id })

    // 5) Baixa manual
    const { data: baixa } = await asOperador
      .from('lancamento')
      .update({ status: 'pago', conciliado_por: 'manual', pago_em: new Date().toISOString() })
      .eq('origem_id', pre!.id).eq('status', 'pendente').select('status').single()
    assert.equal(baixa!.status, 'pago', 'operador dá baixa manual')

    // 6) Operador NÃO faz gestão: criar plano e editar tarifa são bloqueados
    const plano = await asOperador.from('plano_mensalidade').insert({ nome: 'x', dias_por_semana: 2, valor: 1 }).select('id')
    assert.equal(plano.data?.length ?? 0, 0, 'operador não cria plano')
    const tar = await asOperador.from('preco_hora').update({ valor: 999 }).eq('dia_semana', 1).eq('hora', 11).select('valor')
    assert.equal(tar.data?.length ?? 0, 0, 'operador não edita a planilha de preços')
  } finally {
    await admin.from('crianca').delete().eq('id', cid)
    await admin.from('contato').delete().eq('id', co!.id)
  }
})

// ══════════════════════ JORNADA DO GESTOR (admin) ══════════════════════
test('Jornada GESTOR: cria plano, matricula, gera mensalidade, ajusta tarifa e capacidade', async () => {
  const { data: cri } = await asAdmin.from('crianca').insert({ nome: `Jornada Gestor ${uid()}` }).select('id').single()
  const cid = cri!.id
  let planoId: string | null = null

  // guarda a capacidade original p/ restaurar
  const { data: cfgOrig } = await admin.from('config_sistema').select('capacidade_dia').eq('id', 1).single()

  try {
    // 1) Painel gerencial: lê agregados
    const { error: eGer } = await asAdmin.from('lancamento').select('valor, status, origem_tipo')
    assert.equal(eGer, null, 'admin lê o gerencial')

    // 2) Cria um plano
    const { data: plano, error: eP } = await asAdmin
      .from('plano_mensalidade')
      .insert({ nome: `Plano Gestor ${uid()}`, dias_por_semana: 3, valor: 400 })
      .select('id, valor').single()
    assert.equal(eP, null, 'admin cria plano')
    planoId = plano!.id

    // 3) Matricula a criança
    const { error: eM } = await asAdmin.from('mensalidade').insert({
      crianca_id: cid, plano_id: plano!.id, valor: plano!.valor, dia_vencimento: 10, inicio: '2026-01-01', ativo: true,
    })
    assert.equal(eM, null, 'admin matricula')

    // 4) Gera a mensalidade do mês (recorrência) e confere o lançamento
    const [ay, am] = hoje().split('-').map(Number)
    await gerarMensalidades(admin, ay, am)
    const { data: lanMens } = await asAdmin
      .from('lancamento').select('valor, origem_tipo').eq('crianca_id', cid).eq('origem_tipo', 'mensalidade')
    assert.ok((lanMens?.length ?? 0) >= 1, 'recorrência gerou a mensalidade')
    assert.equal(Number(lanMens![0].valor), 400)

    // 5) Ajusta a planilha de preços do play (admin pode)
    const { data: tarUpd } = await asAdmin
      .from('preco_hora')
      .upsert({ dia_semana: 1, hora: 11, valor: 22.5 }, { onConflict: 'dia_semana,hora' })
      .select('valor')
    assert.equal(tarUpd?.length, 1, 'admin ajusta a planilha')
    assert.equal(Number(tarUpd![0].valor), 22.5)
    await asAdmin.from('preco_hora').update({ valor: 8 }).eq('dia_semana', 1).eq('hora', 11) // restaura

    // 6) Ajusta a capacidade do dia
    const { data: capUpd } = await asAdmin.from('config_sistema').update({ capacidade_dia: 30 }).eq('id', 1).select('capacidade_dia')
    assert.equal(capUpd?.length, 1, 'admin ajusta capacidade')

    // 7) Cria colônia e inscreve
    const { data: col } = await asAdmin.from('colonia').insert({ nome: `Col Gestor ${uid()}`, inicio: '2026-12-01', fim: '2026-12-05', valor: 300, vagas: 10 }).select('id, valor').single()
    const { data: insc, error: eI } = await asAdmin.from('inscricao_colonia').insert({ colonia_id: col!.id, crianca_id: cid, valor: col!.valor }).select('id').single()
    assert.equal(eI, null, 'admin inscreve na colônia')
    assert.ok(insc?.id)
    await admin.from('colonia').delete().eq('id', col!.id)
  } finally {
    // restaura capacidade e limpa
    await admin.from('config_sistema').update({ capacidade_dia: cfgOrig?.capacidade_dia ?? null }).eq('id', 1)
    await admin.from('crianca').delete().eq('id', cid)
    if (planoId) await admin.from('plano_mensalidade').delete().eq('id', planoId)
  }
})
