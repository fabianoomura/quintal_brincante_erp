import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, agoraHora, agoraMs, horaParaMinutos } from '@/lib/datas'
import { menorRestanteMin } from '@/lib/lotacao'
import { pausaSegundos } from '@/lib/playground'
import { naoLidasPorCrianca } from '@/lib/whatsapp/conversas'
import PlaygroundPanel from './panel'
import LotacaoChip from './lotacao-chip'
import ConcluidasHoje from './concluidas-hoje'
import PresencasAntigas from '../presenca/presencas-antigas'
import RealtimeRefresh from '../conversas/realtime-refresh'

export default async function PlaygroundPage() {
  const supabase = await createClient()
  const hoje = hojeISO()

  const [
    { data: presentes },
    { data: criancas },
    { data: avisos },
    { data: cfg },
    { data: antigas },
    { data: fila },
  ] = await Promise.all([
      supabase
        .from('presenca')
        .select('id, entrada, tempo_contratado_min, tarifa_hora, pausada_em, pausa_total_seg, crianca:crianca_id (id, nome, foto, autorizacao_imagem)')
        .eq('data', hoje)
        .eq('origem', 'espaco_kids')
        .is('saida', null)
        .order('entrada', { ascending: true }),
      supabase.from('crianca').select('id, nome').eq('ativo', true).order('nome'),
      supabase
        .from('mensagem_template')
        .select('id, nome, tipo_ocorrencia, texto')
        .eq('tipo', 'aviso_rapido')
        .eq('ativo', true)
        .order('ordem')
        .limit(6),
      supabase
        .from('config_sistema')
        .select('tolerancia_min, capacidade_play, fila_tolerancia_min, desconto_ativo')
        .eq('id', 1)
        .maybeSingle(),
      // Check-outs esquecidos: abertas de dias ANTERIORES (invisíveis na lista de hoje).
      supabase
        .from('presenca')
        .select('id, data, entrada, crianca:crianca_id (nome)')
        .lt('data', hoje)
        .is('saida', null)
        .order('data', { ascending: true }),
      supabase
        .from('fila_espera')
        .select('id, status, chamada_em, created_at, crianca:crianca_id (nome, foto)')
        .eq('data', hoje)
        .in('status', ['aguardando', 'chamada'])
        .order('created_at', { ascending: true }),
    ])
  const avisosRapidos = (avisos ?? [])
    .filter((a) => a.tipo_ocorrencia)
    .map((a) => ({ id: a.id, label: a.nome, tipo: a.tipo_ocorrencia!, texto: a.texto }))

  const naoLidas = await naoLidasPorCrianca(
    supabase,
    (presentes ?? []).map((p) => p.crianca?.id ?? '').filter(Boolean),
  )

  const chamadas = (fila ?? []).filter((f) => f.status === 'chamada').length
  const proximaVagaMin = menorRestanteMin(
    (presentes ?? []).map((p) => ({
      // pausa empurra a previsão da vaga para frente (o tempo parado não conta)
      entradaMin:
        horaParaMinutos(p.entrada) +
        pausaSegundos(p.pausa_total_seg, p.pausada_em ? Date.parse(p.pausada_em) : null, agoraMs()) /
          60,
      tempoContratadoMin: p.tempo_contratado_min,
    })),
    horaParaMinutos(agoraHora()),
  )

  return (
    <div className="space-y-4">
      <RealtimeRefresh tabela="whatsapp_conversa" />
      <RealtimeRefresh tabela="fila_espera" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-2xl font-bold text-slate-700">🎠 Playground</h1>
          <LotacaoChip
            presentes={presentes?.length ?? 0}
            capacidade={cfg?.capacidade_play ?? null}
            aCaminho={chamadas}
            proximaVagaMin={proximaVagaMin}
          />
        </div>
        <Link
          href="/kiosk"
          className="pop shrink-0 rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm"
        >
          ⛶ Modo quiosque
        </Link>
      </div>

      <PresencasAntigas
        presencas={(antigas ?? []).map((p) => ({
          id: p.id,
          nome: p.crianca?.nome ?? '—',
          data: p.data,
          entrada: p.entrada,
        }))}
      />

      <PlaygroundPanel
        presentes={(presentes ?? []).map((p) => ({
          id: p.id,
          criancaId: p.crianca?.id ?? '',
          entrada: p.entrada,
          tempoContratadoMin: p.tempo_contratado_min,
          nome: p.crianca?.nome ?? '—',
          foto: p.crianca?.foto ?? null,
          tarifaHora: p.tarifa_hora != null ? Number(p.tarifa_hora) : null,
          autorizacaoImagem: p.crianca?.autorizacao_imagem ?? null,
          naoLidas: naoLidas.get(p.crianca?.id ?? '') ?? 0,
          pausadaEm: p.pausada_em,
          pausaTotalSeg: p.pausa_total_seg,
        }))}
        criancas={criancas ?? []}
        avisos={avisosRapidos}
        toleranciaMin={cfg?.tolerancia_min ?? 0}
        capacidadePlay={cfg?.capacidade_play ?? null}
        filaToleranciaMin={cfg?.fila_tolerancia_min ?? 10}
        descontoAtivo={cfg?.desconto_ativo ?? false}
        fila={(fila ?? []).map((f) => ({
          id: f.id,
          nome: f.crianca?.nome ?? '—',
          foto: f.crianca?.foto ?? null,
          status: f.status as 'aguardando' | 'chamada',
          criadaEm: f.created_at,
          chamadaEm: f.chamada_em,
        }))}
      />

      <ConcluidasHoje />
    </div>
  )
}
