import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import { hojeISO } from '@/lib/datas'
import { calcularLotacao } from '@/lib/lotacao'
import { formatBRL } from '@/lib/dinheiro'
import GerarMensalidades from './gerar-mensalidades'

function Card({
  titulo,
  valor,
  sub,
  cls,
}: {
  titulo: string
  valor: string
  sub?: string
  cls: string
}) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ring-1 ring-black/5 ${cls}`}>
      <div className="text-sm font-semibold opacity-80">{titulo}</div>
      <div className="font-display text-3xl font-bold">{valor}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  )
}

export default async function GerencialPage() {
  await requireAdmin()
  const supabase = await createClient()
  const hoje = hojeISO()

  const [abertas, presencasHoje, criancasAtivas, lancamentos, cfg, mensalistas, inscricoes] =
    await Promise.all([
      supabase.from('presenca').select('id').eq('data', hoje).is('saida', null),
      supabase.from('presenca').select('origem').eq('data', hoje),
      supabase.from('crianca').select('id').eq('ativo', true),
      supabase.from('lancamento').select('valor, status, origem_tipo'),
      supabase.from('config_sistema').select('capacidade_dia').eq('id', 1).maybeSingle(),
      supabase.from('mensalidade').select('id').eq('ativo', true),
      supabase.from('inscricao_colonia').select('id, colonia:colonia_id (ativo)'),
    ])

  const presentes = abertas.data?.length ?? 0
  const lotacao = calcularLotacao(presentes, cfg.data?.capacidade_dia ?? null)

  const todos = lancamentos.data ?? []
  const totalPend = todos.filter((l) => l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0)
  const totalPago = todos.filter((l) => l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0)

  // Mix de presenças de hoje por tipo de negócio.
  const mix = (presencasHoje.data ?? []).reduce<Record<string, number>>((m, p) => {
    m[p.origem] = (m[p.origem] ?? 0) + 1
    return m
  }, {})

  // Receita por tipo de negócio (a partir do origem_tipo do lançamento).
  const TIPOS: { tipo: string; label: string }[] = [
    { tipo: 'presenca', label: '🎠 Play / ☀️ Diária' },
    { tipo: 'mensalidade', label: '🎟️ Mensalidade' },
    { tipo: 'colonia', label: '🏕️ Colônia' },
  ]
  const receitaPorTipo = TIPOS.map(({ tipo, label }) => {
    const doTipo = todos.filter((l) => l.origem_tipo === tipo)
    return {
      label,
      aReceber: doTipo.filter((l) => l.status === 'pendente').reduce((s, l) => s + Number(l.valor), 0),
      recebido: doTipo.filter((l) => l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0),
    }
  })

  const mensalistasAtivos = mensalistas.data?.length ?? 0
  const inscritosColonia = (inscricoes.data ?? []).filter((i) => i.colonia?.ativo).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">📊 Painel gerencial</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          titulo="No espaço agora"
          valor={
            lotacao.capacidade != null
              ? `${lotacao.presentes}/${lotacao.capacidade}`
              : String(lotacao.presentes)
          }
          sub={
            lotacao.nivel === 'lotado'
              ? '🚨 lotado'
              : lotacao.nivel === 'quase'
                ? '⚠️ quase lotado'
                : lotacao.vagas != null
                  ? `${lotacao.vagas} vaga(s)`
                  : 'sem limite'
          }
          cls={
            lotacao.nivel === 'lotado'
              ? 'bg-rose-100 text-rose-800'
              : lotacao.nivel === 'quase'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
          }
        />
        <Card
          titulo="Presenças hoje"
          valor={String(presencasHoje.data?.length ?? 0)}
          sub="entradas registradas"
          cls="bg-sky-100 text-sky-800"
        />
        <Card
          titulo="A receber"
          valor={formatBRL(totalPend)}
          sub={`${todos.filter((l) => l.status === 'pendente').length} pendente(s)`}
          cls="bg-orange-100 text-orange-800"
        />
        <Card
          titulo="Recebido"
          valor={formatBRL(totalPago)}
          sub={`${todos.filter((l) => l.status === 'pago').length} pago(s)`}
          cls="bg-violet-100 text-violet-800"
        />
      </div>

      {/* Base de clientes por tipo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          titulo="Mensalistas ativos"
          valor={String(mensalistasAtivos)}
          sub="matrículas vigentes"
          cls="bg-emerald-100 text-emerald-800"
        />
        <Card
          titulo="Inscritos na colônia"
          valor={String(inscritosColonia)}
          sub="colônias ativas"
          cls="bg-amber-100 text-amber-800"
        />
        <Card
          titulo="Crianças ativas"
          valor={String(criancasAtivas.data?.length ?? 0)}
          sub="no cadastro"
          cls="bg-pink-100 text-pink-800"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
      {/* Mix de atendimento hoje */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 font-display text-base font-bold text-slate-700">
          🧩 Hoje por tipo
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { k: 'espaco_kids', l: '🎠 Play' },
            { k: 'diaria', l: '☀️ Diária' },
            { k: 'mensalista', l: '🎟️ Mensalista' },
            { k: 'colonia', l: '🏕️ Colônia' },
          ].map(({ k, l }) => (
            <span
              key={k}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600"
            >
              {l}: {mix[k] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* Receita por tipo de negócio */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 font-display text-base font-bold text-slate-700">
          💵 Receita por tipo
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>tipo</span>
            <span className="flex gap-4">
              <span className="w-24 text-right">a receber</span>
              <span className="w-24 text-right">recebido</span>
            </span>
          </div>
          {receitaPorTipo.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">{r.label}</span>
              <span className="flex gap-4">
                <span className="w-24 text-right text-orange-600">
                  {formatBRL(r.aReceber)}
                </span>
                <span className="w-24 text-right font-bold text-emerald-700">
                  {formatBRL(r.recebido)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>

      <GerarMensalidades />

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/financeiro" className="text-sm font-semibold text-emerald-700">
          → Financeiro
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/presenca" className="text-sm font-semibold text-sky-700">
          → Presença
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/planos" className="text-sm font-semibold text-pink-700">
          → Planos
        </Link>
      </div>
    </div>
  )
}
