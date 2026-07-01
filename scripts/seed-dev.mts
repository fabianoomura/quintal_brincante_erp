// Seed de DADOS DE TESTE (dev). Gera volume realista e DETERMINÍSTICO (PRNG com semente fixa).
// Usa service role (bypassa RLS — é dev). Idempotente: limpa as crianças [seed] e recria.
// Rodar: npm run seed:dev
import { createClient } from '@supabase/supabase-js'
import { encontrarSlot, type SlotGrade } from '../src/lib/grade'
import { precoProporcional } from '../src/lib/tarifador'
import { diaDaSemana, horaParaMinutos } from '../src/lib/datas'
import { FakeSender } from '../src/lib/whatsapp/adapter'
import { enviarNotificacao } from '../src/lib/whatsapp/notificar'
import { tplOcorrencia } from '../src/lib/whatsapp/templates'
import type { Database } from '../src/lib/database.types'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SR =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const sb = createClient<Database>(URL, SR, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const TAG = '[seed]'

// PRNG determinístico (mulberry32).
let _s = 20260701
const rnd = () => {
  _s |= 0
  _s = (_s + 0x6d2b79f5) | 0
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const chance = (p: number) => rnd() < p

const hoje = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())
function diasAtras(n: number): string {
  const d = new Date(hoje + 'T12:00:00')
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
const hhmm = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

type Papel = Database['public']['Enums']['papel_contato']
type Origem = Database['public']['Enums']['origem_presenca']

// ─── limpeza dos dados de seed anteriores ───────────────────────────────────
const { data: antigas } = await sb.from('crianca').select('id').ilike('nome', `%${TAG}%`)
if (antigas?.length) {
  await sb.from('crianca').delete().in('id', antigas.map((c) => c.id))
  console.log(`limpou ${antigas.length} criança(s) de seed anteriores`)
}

// ─── config: capacidade do dia ──────────────────────────────────────────────
await sb.from('config_sistema').update({ capacidade_dia: 25, valor_feriado: 30 }).eq('id', 1)

// ─── planos (só se ainda não houver) ────────────────────────────────────────
const { count: qPlanos } = await sb.from('plano_mensalidade').select('id', { count: 'exact', head: true })
if (!qPlanos) {
  await sb.from('plano_mensalidade').insert([
    { nome: '2x por semana', dias_por_semana: 2, valor: 280 },
    { nome: '3x por semana', dias_por_semana: 3, valor: 380 },
    { nome: 'Todos os dias', dias_por_semana: 5, valor: 560 },
  ])
  console.log('criou 3 planos')
}
const { data: planos } = await sb.from('plano_mensalidade').select('id, valor, dias_por_semana').eq('ativo', true)

// ─── ambientes (só se ainda não houver) ─────────────────────────────────────
const { count: qAmb } = await sb.from('ambiente').select('id', { count: 'exact', head: true })
if (!qAmb) {
  await sb.from('ambiente').insert([
    { nome: 'Ateliê', capacidade: 12 },
    { nome: 'Área externa', capacidade: 25 },
  ])
  console.log('criou 2 ambientes')
}
const { data: ambientes } = await sb.from('ambiente').select('id').eq('ativo', true)

// ─── colônia (só se ainda não houver) ───────────────────────────────────────
const { count: qCol } = await sb.from('colonia').select('id', { count: 'exact', head: true })
if (!qCol) {
  await sb.from('colonia').insert({
    nome: 'Colônia de Julho 2026',
    inicio: '2026-07-14',
    fim: '2026-07-25',
    valor: 650,
    vagas: 20,
  })
  console.log('criou 1 colônia')
}
const { data: colonia } = await sb
  .from('colonia')
  .select('id, valor, nome, inicio')
  .eq('ativo', true)
  .limit(1)
  .maybeSingle()

// grade do play (para precificar as presenças de play pelo período)
const { data: gradeRows } = await sb
  .from('grade_play')
  .select('id, nome, dias_semana, hora_inicio, hora_fim, valor, capacidade')
  .eq('ativo', true)
const grade: SlotGrade[] = (gradeRows ?? []).map((g) => ({ ...g, valor: Number(g.valor) }))

// ─── crianças ───────────────────────────────────────────────────────────────
const NOMES = [
  'Alice Ribeiro', 'Bento Souza', 'Cecília Lima', 'Davi Martins', 'Elisa Ferreira',
  'Theo Nunes', 'Laura Alves', 'Miguel Costa', 'Helena Rocha', 'Arthur Dias',
  'Valentina Melo', 'Gael Pinto', 'Maria Clara Reis', 'Lucas Barros', 'Sophia Cardoso',
]
const RESP = ['Marina', 'Rafael', 'Juliana', 'Carlos', 'Beatriz', 'Sandra', 'Paulo', 'Aline', 'Bruno', 'Camila']
const SAUDE = [null, null, 'Alergia a amendoim', 'Intolerância a lactose', 'Usa bombinha (asma leve)', null]

type Kid = { id: string; nome: string; respId: string | null; respNome: string; respFone: string | null }
const kids: Kid[] = []

for (let i = 0; i < NOMES.length; i++) {
  const nome = `${NOMES[i]} ${TAG}`
  const { data: cri } = await sb
    .from('crianca')
    .insert({
      nome,
      nascimento: `${int(2015, 2021)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      saude: pick(SAUDE),
    })
    .select('id')
    .single()

  const respNome = `${pick(RESP)} ${NOMES[i].split(' ')[1]}`
  const respFone = `+5511${int(90000, 99999)}${int(1000, 9999)}`
  const { data: co } = await sb
    .from('contato')
    .insert({ nome: respNome, telefone: respFone })
    .select('id')
    .single()
  await sb.from('crianca_contato').insert({ crianca_id: cri!.id, contato_id: co!.id, papel: 'responsavel' as Papel })

  // ~40% ganham um contato extra (autorizado ou emergência)
  if (chance(0.4)) {
    const { data: co2 } = await sb
      .from('contato')
      .insert({ nome: `${pick(RESP)} ${NOMES[i].split(' ')[1]}`, telefone: `+5511${int(90000, 99999)}${int(1000, 9999)}` })
      .select('id')
      .single()
    await sb.from('crianca_contato').insert({
      crianca_id: cri!.id,
      contato_id: co2!.id,
      papel: (chance(0.5) ? 'autorizado' : 'emergencia') as Papel,
    })
  }

  kids.push({ id: cri!.id, nome, respId: co!.id, respNome, respFone })
}
console.log(`criou ${kids.length} crianças com contatos`)

// ─── matrículas: ~4 crianças viram mensalistas ──────────────────────────────
const mensalistas = kids.slice(0, 4)
for (const k of mensalistas) {
  const plano = pick(planos ?? [])
  await sb.from('mensalidade').insert({
    crianca_id: k.id,
    plano_id: plano.id,
    valor: plano.valor,
    dia_vencimento: int(5, 15),
    dias_semana: plano.dias_por_semana <= 3 ? [1, 3, 5].slice(0, plano.dias_por_semana) : [1, 2, 3, 4, 5],
    inicio: diasAtras(60),
  })
  // mensalidade do mês passado (paga) e deste mês (pendente)
  for (const [venc, pago] of [[diasAtras(30), true] as const, [diasAtras(0), false] as const]) {
    await sb.from('lancamento').insert({
      crianca_id: k.id,
      descricao: 'Mensalidade',
      valor: plano.valor,
      vencimento: venc,
      origem_tipo: 'mensalidade',
      ...(pago
        ? { status: 'pago' as const, conciliado_por: 'manual', pago_em: new Date(venc + 'T12:00:00Z').toISOString() }
        : {}),
    })
  }
}
console.log(`matriculou ${mensalistas.length} mensalistas (c/ lançamentos)`)

// ─── inscrições na colônia: ~5 crianças ─────────────────────────────────────
if (colonia) {
  const inscritos = kids.slice(3, 8)
  for (const k of inscritos) {
    const { data: insc } = await sb
      .from('inscricao_colonia')
      .insert({ colonia_id: colonia.id, crianca_id: k.id, valor: colonia.valor })
      .select('id')
      .single()
    await sb.from('lancamento').insert({
      crianca_id: k.id,
      descricao: `Colônia — ${colonia.nome}`,
      valor: colonia.valor,
      vencimento: colonia.inicio,
      origem_tipo: 'colonia',
      origem_id: insc!.id,
      ...(chance(0.4)
        ? { status: 'pago' as const, conciliado_por: 'webhook', capture_method: 'pix', pago_em: new Date().toISOString() }
        : {}),
    })
  }
  console.log(`inscreveu ${inscritos.length} na colônia (c/ lançamentos)`)
}

// ─── histórico de presenças: últimos 14 dias ────────────────────────────────
const ORIGENS: Origem[] = ['espaco_kids', 'espaco_kids', 'diaria', 'mensalista', 'colonia']
let nPres = 0
let nLan = 0
for (let d = 14; d >= 0; d--) {
  const data = diasAtras(d)
  const hojeMesmo = d === 0
  const presentesHoje = int(6, 10)
  const escolhidos = [...kids].sort(() => rnd() - 0.5).slice(0, presentesHoje)

  for (const k of escolhidos) {
    const origem = pick(ORIGENS)
    // play cai num período da grade (almoço/jantar); demais em horário livre
    const hEntrada = origem === 'espaco_kids' ? pick([11, 12, 13, 18, 19, 20]) : int(8, 15)
    const mEntrada = pick([0, 15, 30, 45])
    const entrada = hhmm(hEntrada, mEntrada)
    const ambiente_id = origem === 'espaco_kids' && ambientes?.length && chance(0.6) ? pick(ambientes).id : null

    // tarifa/hora do período (grade), travada no "check-in"
    const tarifaHora =
      origem === 'espaco_kids'
        ? (encontrarSlot(diaDaSemana(data), horaParaMinutos(entrada), grade)?.valor ?? null)
        : null

    // hoje: ~metade fica em aberto (aparece em "quem está aqui")
    const aberta = hojeMesmo && chance(0.5)
    let saida: string | null = null
    let valor: number | null = null
    if (!aberta) {
      const dur = int(20, 200)
      const totalMin = hEntrada * 60 + mEntrada + dur
      saida = hhmm(Math.min(23, Math.floor(totalMin / 60)), totalMin % 60)
      if (tarifaHora != null) valor = precoProporcional(dur, tarifaHora)
    }

    const { data: pre } = await sb
      .from('presenca')
      .insert({
        crianca_id: k.id,
        data,
        entrada,
        saida,
        origem,
        tempo_contratado_min: origem === 'espaco_kids' && chance(0.5) ? pick([60, 90, 120]) : null,
        tarifa_hora: tarifaHora,
        valor,
        ambiente_id,
      })
      .select('id')
      .single()
    nPres++

    // play fechado → lançamento (mix de status)
    if (valor != null && pre) {
      const r = rnd()
      const extra =
        r < 0.45
          ? { status: 'pago' as const, conciliado_por: 'manual', pago_em: new Date(data + 'T15:00:00Z').toISOString() }
          : r < 0.6
            ? { status: 'pago' as const, conciliado_por: 'webhook', capture_method: 'pix', transaction_nsu: 'TX' + int(1000, 9999), pago_em: new Date(data + 'T15:00:00Z').toISOString() }
            : {}
      await sb.from('lancamento').insert({
        crianca_id: k.id,
        descricao: `Play — ${data}`,
        valor,
        vencimento: data,
        origem_tipo: 'presenca',
        origem_id: pre.id,
        ...extra,
      })
      nLan++
    }
  }
}
console.log(`gerou ${nPres} presenças e ${nLan} lançamentos de play`)

// ─── ocorrências + notificações (FAKE) p/ algumas crianças ──────────────────
const sender = new FakeSender()
let nOco = 0
for (const k of kids.slice(0, 3)) {
  if (!k.respFone || !k.respId) continue
  const { data: oc } = await sb
    .from('ocorrencia')
    .insert({ crianca_id: k.id, tipo: pick(['nao_adaptou', 'banheiro', 'comportamento'] as const), descricao: 'Registro de exemplo' })
    .select('id')
    .single()
  const render = tplOcorrencia(k.respNome, 'ocorrência', 'Registro de exemplo')
  await enviarNotificacao(sb, sender, {
    crianca_id: k.id,
    contato_id: k.respId,
    para: k.respFone,
    tipo: 'ocorrencia',
    template: render.template,
    variaveis: render.variaveis,
    conteudo: render.conteudo,
    ocorrencia_id: oc!.id,
  })
  nOco++
}
console.log(`gerou ${nOco} ocorrências + notificações`)

console.log('\n✅ Seed robusto concluído. Login admin: equipe@quintal.local / quintal123')
