import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { hojeISO } from '@/lib/datas'
import PlaygroundPanel from '@/app/(app)/playground/panel'
import ConcluidasHoje from '@/app/(app)/playground/concluidas-hoje'

// Modo quiosque do PLAY: tela cheia, sem sidebar — para um tablet fixo na entrada.
// Autenticado (o proxy protege) + exige colaborador ativo.
export default async function KioskPage() {
  const colaborador = await getColaboradorAtual()
  if (!colaborador) redirect('/')

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
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 to-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-fuchsia-100 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="font-display text-2xl font-bold text-fuchsia-700">🎠 Playground</div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-fuchsia-100 px-3 py-1.5 text-sm font-bold text-fuchsia-700">
            {presentes?.length ?? 0} no play
          </span>
          <Link
            href="/"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Sair do quiosque
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
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

        <div className="mt-6">
          <ConcluidasHoje />
        </div>
      </main>
    </div>
  )
}
