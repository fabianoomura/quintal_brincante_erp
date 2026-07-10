import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, hhmm } from '@/lib/datas'
import { calcularLotacao, type NivelLotacao } from '@/lib/lotacao'
import NovaEntradaButton from './nova-entrada-button'
import CheckoutButton from './checkout-button'
import PresencasAntigas from './presencas-antigas'

import { card } from '@/lib/ui'

const LOTACAO_ESTILO: Record<NivelLotacao, { cls: string; emoji: string; txt: string }> = {
  sem_limite: { cls: 'bg-sky-100 text-sky-700', emoji: '🧒', txt: 'no espaço agora' },
  ok: { cls: 'bg-emerald-100 text-emerald-700', emoji: '✅', txt: 'tranquilo' },
  quase: { cls: 'bg-amber-100 text-amber-700', emoji: '⚠️', txt: 'quase lotado' },
  lotado: { cls: 'bg-rose-100 text-rose-700', emoji: '🚨', txt: 'LOTADO' },
}

const ORIGEM_LABEL: Record<string, string> = {
  mensalista: '🎟️ Mensalista',
  diaria: '☀️ Diária',
  espaco_kids: '🎠 Play',
  colonia: '🏕️ Colônia',
}

export default async function PresencaPage() {
  const supabase = await createClient()
  const hoje = hojeISO()

  const [
    { data: presentes },
    { data: criancas },
    { data: cfg },
    { data: ambientes },
    { data: antigas },
  ] = await Promise.all([
      supabase
        .from('presenca')
        .select(
          'id, entrada, origem, tempo_contratado_min, crianca:crianca_id (id, nome), ambiente:ambiente_id (id, nome)',
        )
        .eq('data', hoje)
        .is('saida', null)
        .order('entrada', { ascending: true }),
      supabase
        .from('crianca')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true }),
      supabase.from('config_sistema').select('capacidade_dia').eq('id', 1).maybeSingle(),
      supabase
        .from('ambiente')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome', { ascending: true }),
      // Check-outs esquecidos: abertas de dias ANTERIORES (invisíveis na lista de hoje).
      supabase
        .from('presenca')
        .select('id, data, entrada, crianca:crianca_id (nome)')
        .lt('data', hoje)
        .is('saida', null)
        .order('data', { ascending: true }),
    ])

  const lotacao = calcularLotacao(presentes?.length ?? 0, cfg?.capacidade_dia ?? null)
  const estilo = LOTACAO_ESTILO[lotacao.nivel]

  // Ocupação por ambiente (só mostra se há ambientes cadastrados).
  const porAmbiente = (ambientes ?? []).map((a) => ({
    nome: a.nome,
    qtd: (presentes ?? []).filter((p) => p.ambiente?.id === a.id).length,
  }))
  const semAmbiente = (presentes ?? []).filter((p) => !p.ambiente).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="text-sm font-semibold text-slate-500">
            ← Início
          </Link>
          <h1 className="truncate text-2xl font-bold text-slate-700">📋 Quem está aqui hoje</h1>
        </div>
        <NovaEntradaButton criancas={criancas ?? []} ambientes={ambientes ?? []} />
      </div>

      <PresencasAntigas
        presencas={(antigas ?? []).map((p) => ({
          id: p.id,
          nome: p.crianca?.nome ?? '—',
          data: p.data,
          entrada: p.entrada,
        }))}
      />

      <div
        className={`flex items-center justify-between rounded-2xl px-5 py-4 font-display shadow-sm ${estilo.cls}`}
      >
        <span className="text-lg font-bold">
          {estilo.emoji} {lotacao.presentes}
          {lotacao.capacidade != null && (
            <span className="opacity-70"> / {lotacao.capacidade}</span>
          )}{' '}
          {lotacao.capacidade == null ? 'crianças' : ''}
        </span>
        <span className="text-sm font-semibold">
          {lotacao.nivel === 'sem_limite'
            ? estilo.txt
            : lotacao.vagas! > 0
              ? `${estilo.txt} · ${lotacao.vagas} vaga(s)`
              : estilo.txt}
        </span>
      </div>

      {porAmbiente.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {porAmbiente.map((a) => (
            <span
              key={a.nome}
              className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm"
            >
              🏠 {a.nome}: {a.qtd}
            </span>
          ))}
          {semAmbiente > 0 && (
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-400 shadow-sm">
              sem sala: {semAmbiente}
            </span>
          )}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-slate-600">
          🧒 No espaço agora ({presentes?.length ?? 0})
        </h2>

        {presentes && presentes.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
            Ninguém no espaço no momento. 😴
          </p>
        )}

        <ul className="space-y-2">
          {presentes?.map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between ${card}`}
            >
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-semibold">
                  {p.crianca?.nome}
                </div>
                <div className="text-xs text-slate-500">
                  {ORIGEM_LABEL[p.origem] ?? p.origem} · entrada {hhmm(p.entrada)}
                  {p.tempo_contratado_min
                    ? ` · contratado ${p.tempo_contratado_min} min`
                    : ''}
                  {p.ambiente ? ` · 🏠 ${p.ambiente.nome}` : ''}
                </div>
              </div>
              <CheckoutButton presencaId={p.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
