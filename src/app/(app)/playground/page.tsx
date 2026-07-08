import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hojeISO } from '@/lib/datas'
import PlaygroundPanel from './panel'
import ConcluidasHoje from './concluidas-hoje'

export default async function PlaygroundPage() {
  const supabase = await createClient()
  const hoje = hojeISO()

  const [{ data: presentes }, { data: criancas }, { data: avisos }, { data: cfg }] =
    await Promise.all([
      supabase
        .from('presenca')
        .select('id, entrada, tempo_contratado_min, tarifa_hora, crianca:crianca_id (id, nome, foto)')
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
        .order('ordem'),
      supabase.from('config_sistema').select('tolerancia_min').eq('id', 1).maybeSingle(),
    ])
  const avisosRapidos = (avisos ?? [])
    .filter((a) => a.tipo_ocorrencia)
    .map((a) => ({ id: a.id, label: a.nome, tipo: a.tipo_ocorrencia!, texto: a.texto }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-700">🎠 Playground</h1>
        <Link
          href="/kiosk"
          className="pop rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm"
        >
          ⛶ Modo quiosque
        </Link>
      </div>

      <PlaygroundPanel
        presentes={(presentes ?? []).map((p) => ({
          id: p.id,
          criancaId: p.crianca?.id ?? '',
          entrada: p.entrada,
          tempoContratadoMin: p.tempo_contratado_min,
          nome: p.crianca?.nome ?? '—',
          foto: p.crianca?.foto ?? null,
          tarifaHora: p.tarifa_hora != null ? Number(p.tarifa_hora) : null,
        }))}
        criancas={criancas ?? []}
        avisos={avisosRapidos}
        toleranciaMin={cfg?.tolerancia_min ?? 0}
      />

      <ConcluidasHoje />
    </div>
  )
}
