import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, hhmm } from '@/lib/datas'
import NovaEntradaButton from './nova-entrada-button'
import CheckoutButton from './checkout-button'
import PresencasAntigas from './presencas-antigas'
import ConversaButton from './conversa-button'
import LotacaoChip from '../playground/lotacao-chip'
import RealtimeRefresh from '../conversas/realtime-refresh'
import { naoLidasPorCrianca } from '@/lib/whatsapp/conversas'

import { card } from '@/lib/ui'

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

  const naoLidas = await naoLidasPorCrianca(
    supabase,
    (presentes ?? []).map((p) => p.crianca?.id ?? '').filter(Boolean),
  )

  // Ocupação por ambiente (só mostra se há ambientes cadastrados).
  const porAmbiente = (ambientes ?? []).map((a) => ({
    nome: a.nome,
    qtd: (presentes ?? []).filter((p) => p.ambiente?.id === a.id).length,
  }))
  const semAmbiente = (presentes ?? []).filter((p) => !p.ambiente).length

  return (
    <div className="space-y-5">
      <RealtimeRefresh tabela="whatsapp_conversa" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="shrink-0 text-sm font-semibold text-slate-500">
            ← Início
          </Link>
          <h1 className="truncate text-2xl font-bold text-slate-700">📋 Quem está aqui hoje</h1>
          <LotacaoChip
            presentes={presentes?.length ?? 0}
            capacidade={cfg?.capacidade_dia ?? null}
          />
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
              <div className="flex shrink-0 items-center gap-2">
                {p.crianca?.id && (
                  <ConversaButton
                    criancaId={p.crianca.id}
                    presencaId={p.id}
                    naoLidas={naoLidas.get(p.crianca.id) ?? 0}
                  />
                )}
                <CheckoutButton presencaId={p.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
