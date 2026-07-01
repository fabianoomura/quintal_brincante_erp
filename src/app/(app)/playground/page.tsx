import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hojeISO } from '@/lib/datas'
import PlaygroundPanel from './panel'
import ConcluidasHoje from './concluidas-hoje'

export default async function PlaygroundPage() {
  const supabase = await createClient()
  const hoje = hojeISO()

  const [{ data: presentes }, { data: criancas }, { data: tarifa }] = await Promise.all([
    supabase
      .from('presenca')
      .select('id, entrada, tempo_contratado_min, crianca:crianca_id (id, nome, foto)')
      .eq('data', hoje)
      .eq('origem', 'espaco_kids')
      .is('saida', null)
      .order('entrada', { ascending: true }),
    supabase.from('crianca').select('id, nome').eq('ativo', true).order('nome'),
    supabase
      .from('tarifa')
      .select('minimo_minutos, valor_hora, tamanho_fracao_min, valor_fracao')
      .eq('ativo', true)
      .limit(1)
      .maybeSingle(),
  ])

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

      {!tarifa ? (
        <p className="rounded-2xl bg-rose-100 p-4 text-sm font-semibold text-rose-700">
          Nenhuma tarifa ativa configurada — o valor não será calculado.
        </p>
      ) : (
        <PlaygroundPanel
          presentes={(presentes ?? []).map((p) => ({
            id: p.id,
            criancaId: p.crianca?.id ?? '',
            entrada: p.entrada,
            tempoContratadoMin: p.tempo_contratado_min,
            nome: p.crianca?.nome ?? '—',
            foto: p.crianca?.foto ?? null,
          }))}
          criancas={criancas ?? []}
          tarifa={{
            minimo_minutos: tarifa.minimo_minutos,
            valor_hora: Number(tarifa.valor_hora),
            tamanho_fracao_min: tarifa.tamanho_fracao_min,
            valor_fracao: Number(tarifa.valor_fracao),
          }}
        />
      )}

      <ConcluidasHoje />
    </div>
  )
}
