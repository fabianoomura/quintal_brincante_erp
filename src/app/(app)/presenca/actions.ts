'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, agoraHora, diaDaSemana, horaParaMinutos } from '@/lib/datas'
import { valorHoraPlay } from '@/lib/grade'
import { calcularValorCheckout, validarSaidaManual } from '@/lib/playground'
import { getSender } from '@/lib/whatsapp/adapter'
import { enviarNotificacao } from '@/lib/whatsapp/notificar'
import {
  tplAgradecimentoCheckout,
  tplAutorizacaoImagem,
  tplBoasVindas,
} from '@/lib/whatsapp/templates'
import type { Database } from '@/lib/database.types'

type Origem = Database['public']['Enums']['origem_presenca']

// semTarifa: play sem valor na grade p/ o horário — entra, mas NÃO será cobrado (avisar operador)
type Resultado = { ok: true; id: string; semTarifa?: boolean } | { ok: false; erro: string }
type ResultadoCheckout =
  | { ok: true; id: string; valor: number | null; lancamentoId: string | null; nome: string }
  | { ok: false; erro: string }

export type CheckInInput = {
  criancaId: string
  origem: Origem
  entrada: string // 'HH:MM'
  tempoContratadoMin: number | null // só faz sentido p/ espaco_kids
  ambienteId?: string | null // opcional (sala/espaço)
  valorDiaria?: number | null // diária: valor a cobrar (null = experimental, não cobra)
}

export async function checkIn(input: CheckInInput): Promise<Resultado> {
  if (!input.criancaId) return { ok: false, erro: 'Selecione uma criança.' }
  if (!input.entrada) return { ok: false, erro: 'Informe o horário de entrada.' }

  try {
    const supabase = await createClient()
    const data = hojeISO()

    // Play: trava a TARIFA/HORA pela planilha (dia+hora) — ou o valor do FERIADO da data.
    // O valor final (piso 1h + proporcional) é calculado no check-out.
    let tarifaHora: number | null = null
    if (input.origem === 'espaco_kids') {
      const horaMin = horaParaMinutos(input.entrada)
      const [{ data: precos }, { data: fer }] = await Promise.all([
        supabase.from('preco_hora').select('dia_semana, hora, valor'),
        supabase.from('feriado').select('valor').eq('data', data).eq('ativo', true).maybeSingle(),
      ])
      if (fer?.valor != null) {
        tarifaHora = Number(fer.valor) // feriado tem valor próprio
      } else {
        tarifaHora = valorHoraPlay(
          diaDaSemana(data),
          horaMin,
          (precos ?? []).map((p) => ({ ...p, valor: Number(p.valor) })),
        )
      }
    }

    // Diária: valor definido no check-in (null = aula experimental / não cobra).
    const valorDiaria =
      input.origem === 'diaria' && input.valorDiaria != null && input.valorDiaria > 0
        ? Math.round(input.valorDiaria * 100) / 100
        : null

    const { data: novo, error } = await supabase
      .from('presenca')
      .insert({
        crianca_id: input.criancaId,
        data,
        entrada: input.entrada,
        origem: input.origem,
        tempo_contratado_min:
          input.origem === 'espaco_kids' ? input.tempoContratadoMin : null,
        ambiente_id: input.ambienteId ?? null,
        tarifa_hora: tarifaHora,
        valor: valorDiaria,
      })
      .select('id')
      .single()
    if (error) return { ok: false, erro: error.message }

    // Boas-vindas ("combinados") em TODA entrada no play e, se o cadastro ainda
    // não tem resposta, a pergunta de autorização de imagem também em toda entrada.
    // Best-effort: falha de envio NÃO quebra o check-in (fica na auditoria como falha).
    if (input.origem === 'espaco_kids') {
      try {
        await enviarBoasVindas(supabase, input.criancaId, novo.id)
      } catch {
        // silencioso por design — o check-in já foi feito
      }
      try {
        await enviarAutorizacaoImagem(supabase, input.criancaId, novo.id)
      } catch {
        // idem
      }
    }

    revalidatePath('/presenca')
    revalidatePath('/playground')
    return {
      ok: true,
      id: novo.id,
      semTarifa: input.origem === 'espaco_kids' && tarifaHora == null,
    }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// Envia a mensagem de boas-vindas com os combinados (template editável em /mensagens,
// chave 'boas_vindas') em TODA entrada no play. {{1}}=responsável, {{2}}=criança.
async function enviarBoasVindas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  criancaId: string,
  presencaId: string,
) {
  const [{ data: tpl }, { data: crianca }, { data: vinculo }] = await Promise.all([
    supabase
      .from('mensagem_template')
      .select('texto')
      .eq('chave', 'boas_vindas')
      .eq('ativo', true)
      .maybeSingle(),
    supabase.from('crianca').select('nome, primeiro_nome').eq('id', criancaId).single(),
    supabase
      .from('crianca_contato')
      .select('contato:contato_id (id, nome, primeiro_nome, telefone)')
      .eq('crianca_id', criancaId)
      .eq('papel', 'responsavel')
      .limit(1)
      .maybeSingle(),
  ])
  const responsavel = vinculo?.contato
  if (!tpl || !responsavel?.telefone || !crianca) return

  const render = tplBoasVindas(
    responsavel.nome,
    crianca.nome,
    tpl.texto,
    responsavel.primeiro_nome,
    crianca.primeiro_nome,
  )

  await enviarNotificacao(supabase, getSender(), {
    crianca_id: criancaId,
    contato_id: responsavel.id,
    para: responsavel.telefone,
    tipo: 'boas_vindas',
    template: render.template,
    variaveis: render.variaveis,
    conteudo: render.conteudo,
    presenca_id: presencaId,
  })
}

// Pergunta de AUTORIZAÇÃO DE IMAGEM (template 'autorizacao_imagem'): enviada em
// TODO check-in do play enquanto o cadastro não tem resposta. Assim que a equipe
// registra SIM ou NÃO na ficha, os próximos check-ins deixam de enviar.
async function enviarAutorizacaoImagem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  criancaId: string,
  presencaId: string,
) {
  const { data: crianca } = await supabase
    .from('crianca')
    .select('nome, primeiro_nome, autorizacao_imagem')
    .eq('id', criancaId)
    .single()
  if (!crianca || crianca.autorizacao_imagem !== null) return

  const [{ data: tpl }, { data: vinculo }] = await Promise.all([
    supabase
      .from('mensagem_template')
      .select('texto')
      .eq('chave', 'autorizacao_imagem')
      .eq('ativo', true)
      .maybeSingle(),
    supabase
      .from('crianca_contato')
      .select('contato:contato_id (id, nome, primeiro_nome, telefone)')
      .eq('crianca_id', criancaId)
      .eq('papel', 'responsavel')
      .limit(1)
      .maybeSingle(),
  ])
  const responsavel = vinculo?.contato
  if (!tpl || !responsavel?.telefone) return

  const render = tplAutorizacaoImagem(
    responsavel.nome,
    crianca.nome,
    tpl.texto,
    responsavel.primeiro_nome,
    crianca.primeiro_nome,
  )

  await enviarNotificacao(supabase, getSender(), {
    crianca_id: criancaId,
    contato_id: responsavel.id,
    para: responsavel.telefone,
    tipo: 'autorizacao_imagem',
    template: render.template,
    variaveis: render.variaveis,
    conteudo: render.conteudo,
    presenca_id: presencaId,
  })
}

async function enviarAgradecimentoCheckout(
  supabase: Awaited<ReturnType<typeof createClient>>,
  criancaId: string,
  presencaId: string,
) {
  const { count } = await supabase
    .from('notificacao')
    .select('id', { count: 'exact', head: true })
    .eq('presenca_id', presencaId)
    .eq('tipo', 'agradecimento_checkout')
  if ((count ?? 0) > 0) return

  const [{ data: tpl }, { data: crianca }, { data: vinculo }] = await Promise.all([
    supabase
      .from('mensagem_template')
      .select('texto')
      .eq('chave', 'agradecimento_checkout')
      .eq('ativo', true)
      .maybeSingle(),
    supabase.from('crianca').select('nome, primeiro_nome').eq('id', criancaId).single(),
    supabase
      .from('crianca_contato')
      .select('contato:contato_id (id, nome, primeiro_nome, telefone)')
      .eq('crianca_id', criancaId)
      .eq('papel', 'responsavel')
      .limit(1)
      .maybeSingle(),
  ])
  const responsavel = vinculo?.contato
  if (!tpl || !responsavel?.telefone || !crianca) return

  const render = tplAgradecimentoCheckout(
    responsavel.nome,
    crianca.nome,
    tpl.texto,
    responsavel.primeiro_nome,
    crianca.primeiro_nome,
  )

  await enviarNotificacao(supabase, getSender(), {
    crianca_id: criancaId,
    contato_id: responsavel.id,
    para: responsavel.telefone,
    tipo: 'agradecimento_checkout',
    template: render.template,
    variaveis: render.variaveis,
    conteudo: render.conteudo,
    presenca_id: presencaId,
  })
}

// Cobrança retroativa: sessão concluída SEM valor (ex.: grade vazia no check-in).
// Grava o valor na presença e gera o lançamento pendente — daí o Receber funciona.
export async function cobrarPresenca(
  presencaId: string,
  valor: number,
): Promise<{ ok: true; lancamentoId: string; nome: string } | { ok: false; erro: string }> {
  if (!(valor > 0)) return { ok: false, erro: 'Informe o valor.' }
  try {
    const supabase = await createClient()
    const { data: p, error: errP } = await supabase
      .from('presenca')
      .select('id, crianca_id, data, origem, saida, crianca:crianca_id (nome)')
      .eq('id', presencaId)
      .maybeSingle()
    if (errP) return { ok: false, erro: errP.message }
    if (!p) return { ok: false, erro: 'Presença não encontrada.' }
    if (!p.saida) return { ok: false, erro: 'Faça o check-out antes de cobrar.' }

    const { data: jaTem } = await supabase
      .from('lancamento')
      .select('id')
      .eq('origem_tipo', 'presenca')
      .eq('origem_id', presencaId)
      .limit(1)
    if (jaTem && jaTem.length > 0) return { ok: false, erro: 'Essa sessão já tem cobrança.' }

    const v = Math.round(valor * 100) / 100
    const { error: errU } = await supabase.from('presenca').update({ valor: v }).eq('id', presencaId)
    if (errU) return { ok: false, erro: errU.message }

    const { data: lanc, error: errL } = await supabase
      .from('lancamento')
      .insert({
        crianca_id: p.crianca_id,
        descricao: `${p.origem === 'espaco_kids' ? 'Play' : 'Diária'} — ${p.data}`,
        valor: v,
        vencimento: p.data,
        origem_tipo: 'presenca',
        origem_id: p.id,
      })
      .select('id')
      .single()
    if (errL) {
      // Índice único: outro processo cobrou no meio do caminho.
      if (errL.code === '23505') return { ok: false, erro: 'Essa sessão já tem cobrança.' }
      return { ok: false, erro: errL.message }
    }

    // SEM revalidatePath aqui: o re-render desmontaria o CobrarButton (o card vira
    // "pendente") e mataria o modal de recebimento recém-aberto. O refresh acontece
    // no onFechar do modal (client).
    return { ok: true, lancamentoId: lanc.id, nome: p.crianca?.nome ?? '' }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// Check-out: marca a saída e calcula o valor do play (piso 1h + proporcional) pela
// tarifa/hora travada no check-in. Gera o lançamento pendente.
// saidaManual ('HH:MM'): encerra um check-out ESQUECIDO informando a hora real da saída
// (no dia da presença) — sem ela, usa a hora de agora.
export async function checkOut(
  presencaId: string,
  saidaManual?: string,
): Promise<ResultadoCheckout> {
  try {
    const supabase = await createClient()
    const saida = saidaManual ?? agoraHora()

    const { data: p, error: errP } = await supabase
      .from('presenca')
      .select('id, crianca_id, data, origem, entrada, saida, tarifa_hora, tempo_contratado_min, valor, crianca:crianca_id (nome)')
      .eq('id', presencaId)
      .maybeSingle()
    if (errP) return { ok: false, erro: errP.message }
    if (!p) return { ok: false, erro: 'Presença não encontrada.' }
    if (p.saida) return { ok: false, erro: 'Essa presença já teve check-out.' }

    if (saidaManual) {
      const v = validarSaidaManual(p.entrada, saidaManual)
      if (!v.ok) return { ok: false, erro: v.erro }
    }

    // Play: calcula pelo tempo (tarifa/hora travada no check-in), respeitando a
    // TOLERÂNCIA após o contratado (config): passou até X min → cobra só o contratado;
    // depois, cada bloco iniciado de 30 min acrescenta meia hora da tarifa.
    // Diária: usa o valor definido no check-in (null = experimental, não cobra).
    const { data: cfg } = await supabase
      .from('config_sistema')
      .select('tolerancia_min')
      .eq('id', 1)
      .maybeSingle()
    const valor = calcularValorCheckout({
      origem: p.origem,
      entrada: p.entrada,
      saida,
      tarifaHora: p.tarifa_hora == null ? null : Number(p.tarifa_hora),
      tempoContratadoMin: p.tempo_contratado_min,
      toleranciaMin: cfg?.tolerancia_min ?? 0,
      valorDiaria: p.valor == null ? null : Number(p.valor),
    })

    // Guard de corrida: o `.is('saida', null)` + select garante que só UM processo fecha
    // (dois aparelhos clicando juntos: o segundo não recebe linha e para aqui).
    const { data: fechada, error: errU } = await supabase
      .from('presenca')
      .update({ saida, valor })
      .eq('id', presencaId)
      .is('saida', null)
      .select('id')
      .maybeSingle()
    if (errU) return { ok: false, erro: errU.message }
    if (!fechada) return { ok: false, erro: 'Essa presença já teve check-out.' }

    // Gera lançamento pendente para presenças cobradas (play e diária com valor).
    let lancamentoId: string | null = null
    if (valor !== null) {
      const { data: lanc, error: errL } = await supabase
        .from('lancamento')
        .insert({
          crianca_id: p.crianca_id,
          descricao: `${p.origem === 'espaco_kids' ? 'Play' : 'Diária'} — ${p.data}`,
          valor,
          vencimento: p.data,
          origem_tipo: 'presenca',
          origem_id: p.id,
        })
        .select('id')
        .single()
      if (errL) {
        if (errL.code !== '23505') return { ok: false, erro: errL.message }
        // Índice único: a cobrança desta presença já existe (ex.: cobrarPresenca) — reaproveita.
        const { data: existente } = await supabase
          .from('lancamento')
          .select('id')
          .eq('origem_tipo', 'presenca')
          .eq('origem_id', p.id)
          .limit(1)
          .maybeSingle()
        lancamentoId = existente?.id ?? null
      } else {
        lancamentoId = lanc.id
      }
    }

    // Agradecimento só no check-out do dia — encerrar um esquecido de ontem não deve
    // mandar "acabou de sair" com um dia de atraso.
    if (p.origem === 'espaco_kids' && p.data === hojeISO()) {
      try {
        await enviarAgradecimentoCheckout(supabase, p.crianca_id, presencaId)
      } catch {
        // Falha de WhatsApp nao deve travar saida nem recebimento.
      }
    }

    revalidatePath('/presenca')
    revalidatePath('/playground')
    revalidatePath('/financeiro')
    return { ok: true, id: presencaId, valor, lancamentoId, nome: p.crianca?.nome ?? '' }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
}
