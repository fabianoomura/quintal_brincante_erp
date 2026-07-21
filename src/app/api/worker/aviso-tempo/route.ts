import { createAdminClient } from '@/lib/supabase/admin'
import { getSender } from '@/lib/whatsapp/adapter'
import { enviarNotificacao, reenviarNotificacao } from '@/lib/whatsapp/notificar'
import { tplAvisoTempo } from '@/lib/whatsapp/templates'
import {
  selecionarAvisos,
  minutosRestantes,
  situacaoAviso,
  type PresencaAberta,
  type SituacaoAviso,
} from '@/lib/whatsapp/avisoTempo'
import { pausaSegundos } from '@/lib/playground'
import { hojeISO, agoraHora, horaParaMinutos } from '@/lib/datas'

// Worker do aviso de tempo (spec §7). Chamado pelo pg_cron a cada poucos minutos.
// Guardado por CRON_SECRET; usa service role (sem sessão de usuário). Idempotente: só avisa
// presenças de play que cruzaram o limite − antecedência e ainda não têm aviso RESOLVIDO
// (enviado ou com tentativas esgotadas). Envio que FALHOU é retentado — até
// MAX_TENTATIVAS_AVISO — reaproveitando a mesma linha de notificacao.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const sb = createAdminClient()

  const { data: cfg } = await sb
    .from('config_sistema')
    .select('aviso_tempo_ativo, aviso_antecedencia_min')
    .eq('id', 1)
    .maybeSingle()
  if (!cfg?.aviso_tempo_ativo) {
    return Response.json({ skipped: true, motivo: 'aviso_tempo_ativo=false' })
  }

  const antecedencia = cfg?.aviso_antecedencia_min ?? 15

  // Override opcional p/ teste determinístico (?agora=HH:MM&data=YYYY-MM-DD).
  const url = new URL(request.url)
  const data = url.searchParams.get('data') ?? hojeISO()
  const agoraStr = url.searchParams.get('agora') ?? agoraHora()
  const agoraMin = horaParaMinutos(agoraStr)

  // Presenças de play abertas hoje com tempo contratado + notificações já existentes.
  const { data: presencas, error } = await sb
    .from('presenca')
    .select(
      'id, entrada, tempo_contratado_min, pausada_em, pausa_total_seg, crianca_id, crianca:crianca_id (nome, primeiro_nome), notificacao (id, tipo, status, tentativas)',
    )
    .eq('data', data)
    .eq('origem', 'espaco_kids')
    .is('saida', null)
    .not('tempo_contratado_min', 'is', null)
  if (error) return Response.json({ erro: error.message }, { status: 500 })

  const situacoes = new Map<string, SituacaoAviso>(
    (presencas ?? []).map((p) => [p.id, situacaoAviso(p.notificacao ?? [])]),
  )
  const abertas: PresencaAberta[] = (presencas ?? []).map((p) => {
    // O tempo pausado empurra o limite para frente: soma a pausa (min) à entrada,
    // assim uma criança pausada não é avisada antes da hora.
    const pausaMin =
      pausaSegundos(p.pausa_total_seg, p.pausada_em ? Date.parse(p.pausada_em) : null, Date.now()) /
      60
    return {
      id: p.id,
      entradaMin: horaParaMinutos(p.entrada) + pausaMin,
      tempoContratadoMin: p.tempo_contratado_min,
      jaAvisado: situacoes.get(p.id)!.acao === 'resolvido',
    }
  })

  const aAvisar = selecionarAvisos(abertas, agoraMin, antecedencia)
  const sender = getSender()
  const detalhes: { presenca: string; status: string }[] = []
  const { data: tpl } = await sb
    .from('mensagem_template')
    .select('texto')
    .eq('chave', 'aviso_tempo')
    .eq('ativo', true)
    .maybeSingle()

  for (const alvo of aAvisar) {
    const orig = presencas!.find((p) => p.id === alvo.id)!

    const { data: vinculo } = await sb
      .from('crianca_contato')
      .select('contato:contato_id (id, nome, primeiro_nome, telefone)')
      .eq('crianca_id', orig.crianca_id)
      .eq('papel', 'responsavel')
      .limit(1)
      .maybeSingle()

    const responsavel = vinculo?.contato
    if (!responsavel?.telefone) {
      detalhes.push({ presenca: alvo.id, status: 'sem_telefone' })
      continue
    }

    const faltam = minutosRestantes(
      agoraMin,
      alvo.entradaMin,
      alvo.tempoContratadoMin!,
    )
    const render = tplAvisoTempo(
      responsavel.nome,
      orig.crianca?.nome ?? 'criança',
      faltam,
      tpl?.texto,
      responsavel.primeiro_nome,
      orig.crianca?.primeiro_nome,
    )

    const sit = situacoes.get(alvo.id)!
    const res =
      sit.acao === 'reenviar'
        ? await reenviarNotificacao(
            sb,
            sender,
            { id: sit.notificacaoId, tentativas: sit.tentativas },
            {
              para: responsavel.telefone,
              template: render.template,
              variaveis: render.variaveis,
              conteudo: render.conteudo,
            },
          )
        : await enviarNotificacao(sb, sender, {
            crianca_id: orig.crianca_id,
            contato_id: responsavel.id,
            para: responsavel.telefone,
            tipo: 'aviso_tempo',
            template: render.template,
            variaveis: render.variaveis,
            conteudo: render.conteudo,
            presenca_id: alvo.id,
          })
    detalhes.push({
      presenca: alvo.id,
      status: res.ok ? (sit.acao === 'reenviar' ? 'reavisado' : 'avisado') : `falha:${res.erro}`,
    })
  }

  return Response.json({
    verificadas: abertas.length,
    avisadas: detalhes.filter((d) => d.status === 'avisado' || d.status === 'reavisado').length,
    detalhes,
  })
}
