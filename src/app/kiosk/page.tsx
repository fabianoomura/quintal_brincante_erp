import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { hojeISO, agoraHora, horaParaMinutos } from '@/lib/datas'
import { menorRestanteMin } from '@/lib/lotacao'
import { naoLidasPorCrianca } from '@/lib/whatsapp/conversas'
import PlaygroundPanel from '@/app/(app)/playground/panel'
import LotacaoChip from '@/app/(app)/playground/lotacao-chip'
import ConcluidasHoje from '@/app/(app)/playground/concluidas-hoje'
import RealtimeRefresh from '@/app/(app)/conversas/realtime-refresh'

// Modo quiosque do PLAY: tela cheia, sem sidebar — para um tablet fixo na entrada.
// Autenticado (o proxy protege) + exige colaborador ativo.
// NÃO usa redirect() aqui: as actions do play revalidam esta rota, e um redirect()
// no render quebraria o server action. Sem sessão, mostra um fallback simples.
export default async function KioskPage() {
  const colaborador = await getColaboradorAtual()
  if (!colaborador) {
    return (
      <div className="grid min-h-screen place-items-center bg-fuchsia-50 p-6 text-center">
        <div className="space-y-2">
          <p className="font-display text-lg font-bold text-slate-700">Sessão não encontrada.</p>
          <Link href="/" className="font-semibold text-fuchsia-700">
            Ir para o início →
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const hoje = hojeISO()

  const [{ data: presentes }, { data: criancas }, { data: avisos }, { data: cfg }, { data: fila }] =
    await Promise.all([
      supabase
        .from('presenca')
        .select('id, entrada, tempo_contratado_min, tarifa_hora, crianca:crianca_id (id, nome, foto, autorizacao_imagem)')
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
        .select('tolerancia_min, capacidade_play, fila_tolerancia_min')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('fila_espera')
        .select('id, status, chamada_em, created_at, crianca:crianca_id (nome, foto)')
        .eq('data', hoje)
        .in('status', ['aguardando', 'chamada'])
        .order('created_at', { ascending: true }),
    ])

  const naoLidas = await naoLidasPorCrianca(
    supabase,
    (presentes ?? []).map((p) => p.crianca?.id ?? '').filter(Boolean),
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 to-white">
      <RealtimeRefresh tabela="whatsapp_conversa" />
      <RealtimeRefresh tabela="fila_espera" />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-fuchsia-100 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="font-display text-2xl font-bold text-fuchsia-700">🎠 Playground</div>
        <div className="flex items-center gap-3">
          <LotacaoChip
            presentes={presentes?.length ?? 0}
            capacidade={cfg?.capacidade_play ?? null}
            aCaminho={(fila ?? []).filter((f) => f.status === 'chamada').length}
            proximaVagaMin={menorRestanteMin(
              (presentes ?? []).map((p) => ({
                entradaMin: horaParaMinutos(p.entrada),
                tempoContratadoMin: p.tempo_contratado_min,
              })),
              horaParaMinutos(agoraHora()),
            )}
          />
          <Link
            href="/"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Sair do quiosque
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
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
          }))}
          criancas={criancas ?? []}
          avisos={(avisos ?? [])
            .filter((a) => a.tipo_ocorrencia)
            .map((a) => ({ id: a.id, label: a.nome, tipo: a.tipo_ocorrencia!, texto: a.texto }))}
          toleranciaMin={cfg?.tolerancia_min ?? 0}
          capacidadePlay={cfg?.capacidade_play ?? null}
          filaToleranciaMin={cfg?.fila_tolerancia_min ?? 10}
          fila={(fila ?? []).map((f) => ({
            id: f.id,
            nome: f.crianca?.nome ?? '—',
            foto: f.crianca?.foto ?? null,
            status: f.status as 'aguardando' | 'chamada',
            criadaEm: f.created_at,
            chamadaEm: f.chamada_em,
          }))}
        />

        <div className="mt-6">
          <ConcluidasHoje />
        </div>
      </main>
    </div>
  )
}
