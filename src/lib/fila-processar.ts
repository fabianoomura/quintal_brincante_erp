import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { decidirFila } from '@/lib/fila'
import { hojeISO } from '@/lib/datas'
import type { EnviarWhatsApp } from '@/lib/whatsapp/adapter'
import { enviarNotificacao } from '@/lib/whatsapp/notificar'
import { tplFilaSuaVez } from '@/lib/whatsapp/templates'

export type ResumoFila = {
  expiradas: number
  chamadas: number
  detalhes: { fila: string; status: string }[]
}

// Roda um passo da fila: expira chamadas estouradas e chama as próximas quando há
// vaga, avisando o responsável por WhatsApp. Chamado pelo worker (pg_cron) e,
// best-effort, após check-out/desistência (vaga liberada não espera o cron).
// Idempotente: promover aguardando→chamada é update condicional — só o processo
// que ganhar a corrida envia a mensagem.
export async function processarFila(
  sb: SupabaseClient<Database>,
  sender: EnviarWhatsApp,
  agora = Date.now(),
): Promise<ResumoFila> {
  const hoje = hojeISO()

  const [{ data: cfg }, { data: ativas }, { count: presentes }] = await Promise.all([
    sb.from('config_sistema').select('capacidade_play, fila_tolerancia_min').eq('id', 1).maybeSingle(),
    sb
      .from('fila_espera')
      .select('id, data, status, chamada_em, created_at, crianca_id')
      .in('status', ['aguardando', 'chamada'])
      .order('created_at', { ascending: true }),
    sb
      .from('presenca')
      .select('id', { count: 'exact', head: true })
      .eq('data', hoje)
      .eq('origem', 'espaco_kids')
      .is('saida', null),
  ])

  const detalhes: ResumoFila['detalhes'] = []

  // Restos de dias anteriores: expira para liberar a criança a reentrar hoje
  // (o índice único só permite uma entrada ativa por criança).
  const antigas = (ativas ?? []).filter((e) => e.data < hoje)
  for (const e of antigas) {
    await sb
      .from('fila_espera')
      .update({ status: 'expirada', encerrada_em: new Date(agora).toISOString() })
      .eq('id', e.id)
      .in('status', ['aguardando', 'chamada'])
    detalhes.push({ fila: e.id, status: 'expirada_dia_anterior' })
  }

  const deHoje = (ativas ?? []).filter((e) => e.data === hoje)
  const decisao = decidirFila({
    entradas: deHoje.map((e) => ({
      id: e.id,
      status: e.status as 'aguardando' | 'chamada',
      criadaEm: new Date(e.created_at).getTime(),
      chamadaEm: e.chamada_em ? new Date(e.chamada_em).getTime() : null,
    })),
    presentes: presentes ?? 0,
    capacidade: cfg?.capacidade_play ?? null,
    toleranciaMin: cfg?.fila_tolerancia_min ?? 10,
    agora,
  })

  let expiradas = 0
  for (const id of decisao.expirar) {
    const { data: ok } = await sb
      .from('fila_espera')
      .update({ status: 'expirada', encerrada_em: new Date(agora).toISOString() })
      .eq('id', id)
      .eq('status', 'chamada')
      .select('id')
      .maybeSingle()
    if (ok) {
      expiradas++
      detalhes.push({ fila: id, status: 'expirada' })
    }
  }

  let chamadas = 0
  const { data: tpl } = await sb
    .from('mensagem_template')
    .select('texto')
    .eq('chave', 'fila_sua_vez')
    .eq('ativo', true)
    .maybeSingle()

  for (const id of decisao.chamar) {
    // Guard de corrida: só quem promover a linha envia o WhatsApp.
    const { data: claimed } = await sb
      .from('fila_espera')
      .update({ status: 'chamada', chamada_em: new Date(agora).toISOString() })
      .eq('id', id)
      .eq('status', 'aguardando')
      .select('id, crianca_id')
      .maybeSingle()
    if (!claimed) {
      detalhes.push({ fila: id, status: 'ja_processada' })
      continue
    }
    chamadas++

    const [{ data: crianca }, { data: vinculo }] = await Promise.all([
      sb.from('crianca').select('nome, primeiro_nome').eq('id', claimed.crianca_id).single(),
      sb
        .from('crianca_contato')
        .select('contato:contato_id (id, nome, primeiro_nome, telefone)')
        .eq('crianca_id', claimed.crianca_id)
        .eq('papel', 'responsavel')
        .limit(1)
        .maybeSingle(),
    ])
    const responsavel = vinculo?.contato
    if (!responsavel?.telefone || !crianca) {
      detalhes.push({ fila: id, status: 'chamada_sem_telefone' })
      continue
    }

    const render = tplFilaSuaVez(
      responsavel.nome,
      crianca.nome,
      cfg?.fila_tolerancia_min ?? 10,
      tpl?.texto,
      responsavel.primeiro_nome,
      crianca.primeiro_nome,
    )
    const res = await enviarNotificacao(sb, sender, {
      crianca_id: claimed.crianca_id,
      contato_id: responsavel.id,
      para: responsavel.telefone,
      tipo: 'fila_sua_vez',
      template: render.template,
      variaveis: render.variaveis,
      conteudo: render.conteudo,
    })
    detalhes.push({ fila: id, status: res.ok ? 'chamada_avisada' : `chamada_falha:${res.erro}` })
  }

  return { expiradas, chamadas, detalhes }
}
