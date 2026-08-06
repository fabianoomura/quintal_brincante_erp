import Link from 'next/link'
import { agoraHora, hojeISO, horaParaMinutos } from '@/lib/datas'
import { formatBRL } from '@/lib/dinheiro'
import { requireAdmin } from '@/lib/colaborador'
import { calcularRelatorioGerencial } from '@/lib/gerencial-relatorio'
import {
  calcularViabilidade,
  periodosViabilidade,
  type AnaliseViabilidade,
  type ClassificacaoMovimento,
  type PeriodoViabilidade,
} from '@/lib/viabilidade'
import { buscarPresencasRelatorio } from '../dados'
import { buscarOperacoesPlay, buscarReceitasPlay } from './dados'
import { OperacaoForms } from './operacao-forms'

const CLASSE: Record<ClassificacaoMovimento, { bloco: string; barra: string; label: string }> = {
  ruim: { bloco: 'bg-rose-100 text-rose-800 ring-rose-200', barra: 'bg-rose-500', label: 'Abaixo da média' },
  medio: { bloco: 'bg-slate-100 text-slate-700 ring-slate-200', barra: 'bg-slate-400', label: 'Na média' },
  pico: { bloco: 'bg-emerald-100 text-emerald-800 ring-emerald-200', barra: 'bg-emerald-500', label: 'Pico' },
  sem_dados: { bloco: 'bg-white text-slate-400 ring-slate-200', barra: 'bg-slate-200', label: 'Sem base' },
}

function decimal(valor: number, casas = 1): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })
}

function dataBR(data: string): string {
  return data.split('-').reverse().join('/')
}

function periodoHref(chave: PeriodoViabilidade['chave']): string {
  return `/gerencial/viabilidade?visao=${chave}`
}

function Comparativo({ periodo, analise, ativo }: { periodo: PeriodoViabilidade; analise: AnaliseViabilidade; ativo: boolean }) {
  return (
    <Link href={periodoHref(periodo.chave)} className={`rounded-2xl p-4 shadow-sm ring-2 transition ${ativo ? 'bg-indigo-50 ring-indigo-400' : 'bg-white ring-slate-200 hover:ring-indigo-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold capitalize text-slate-700">{periodo.label}</h2>
        {periodo.parcial && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">parcial até {dataBR(periodo.ate)}</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div><span className="block text-xs text-slate-400">Dias funcionando</span><strong className="text-slate-700">{analise.diasFuncionamento}</strong></div>
        <div><span className="block text-xs text-slate-400">Atendimentos</span><strong className="text-slate-700">{analise.totalAtendimentos}</strong></div>
        <div><span className="block text-xs text-slate-400">Receita paga</span><strong className="text-emerald-700">{formatBRL(analise.receita)}</strong></div>
        <div><span className="block text-xs text-slate-400">Custo informado</span><strong className="text-rose-700">{formatBRL(analise.custoTotal)}</strong></div>
      </div>
    </Link>
  )
}

function Kpi({ titulo, valor, sub, cls }: { titulo: string; valor: string; sub: string; cls: string }) {
  return <div className={`rounded-2xl p-4 shadow-sm ring-1 ring-black/5 ${cls}`}><div className="text-xs font-bold uppercase tracking-wide opacity-70">{titulo}</div><div className="mt-1 font-display text-2xl font-bold">{valor}</div><div className="mt-1 text-xs opacity-75">{sub}</div></div>
}

export default async function ViabilidadePage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; editar?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const hoje = hojeISO()
  const periodos = periodosViabilidade(hoje)
  const consolidado = periodos.find((p) => p.chave === 'consolidado')!
  const [presencas, operacoes, receitas] = await Promise.all([
    buscarPresencasRelatorio(consolidado.de, consolidado.ate),
    buscarOperacoesPlay(consolidado.de, consolidado.ate),
    buscarReceitasPlay(consolidado.de, consolidado.ate),
  ])
  const agoraMin = horaParaMinutos(agoraHora())
  const resultados = new Map(periodos.map((periodo) => {
    const relatorio = calcularRelatorioGerencial(
      presencas.data.filter((p) => p.data >= periodo.de && p.data <= periodo.ate),
      { hoje, agoraMin },
    )
    return [periodo.chave, calcularViabilidade(
      relatorio,
      operacoes.data.filter((o) => o.data >= periodo.de && o.data <= periodo.ate),
      receitas.data.filter((r) => r.data >= periodo.de && r.data <= periodo.ate),
    )]
  }))
  const chave = periodos.some((p) => p.chave === sp.visao) ? sp.visao as PeriodoViabilidade['chave'] : 'anterior'
  const periodo = periodos.find((p) => p.chave === chave)!
  const analise = resultados.get(chave)!
  const operacoesPeriodo = operacoes.data.filter((o) => o.data >= periodo.de && o.data <= periodo.ate)
  const edicao = operacoes.data.find((o) => o.data === sp.editar) ?? null
  const erros = [presencas.erro, operacoes.erro, receitas.erro].filter(Boolean)
  const maxDia = Math.max(1, ...analise.diasSemana.map((d) => d.mediaPorDia))
  const maxHora = Math.max(1, ...analise.horarios.map((h) => h.mediaPorDia))
  const custoCompleto = analise.diasSemCustoInformado === 0 && analise.diasFuncionamento > 0
  const exportar = `/gerencial/viabilidade/export.xlsx?de=${periodo.de}&ate=${periodo.ate}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/sistema" className="text-sm font-semibold text-slate-500">← Início</Link>
        <h1 className="text-2xl font-bold text-slate-700">📈 Viabilidade do Play</h1>
        <a href={exportar} className="ml-auto rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white">📊 Exportar esta visão</a>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Visões do gerencial">
        <Link href="/gerencial" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">Relatório operacional</Link>
        <span className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Viabilidade e operação</span>
      </nav>

      {erros.length > 0 && <div className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">Não foi possível carregar toda a análise: {erros.join(' · ')}</div>}

      <div className="grid gap-3 lg:grid-cols-3">
        {periodos.map((p) => <Comparativo key={p.chave} periodo={p} analise={resultados.get(p.chave)!} ativo={p.chave === chave} />)}
      </div>

      <section className="space-y-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div>
          <h2 className="font-display text-xl font-bold capitalize text-slate-700">Leitura de {periodo.label}</h2>
          <p className="text-sm text-slate-500">{dataBR(periodo.de)} a {dataBR(periodo.ate)} · receita considera pagamentos do Play marcados como pagos; cortesia não movimenta receita.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi titulo="Dias funcionando" valor={String(analise.diasFuncionamento)} sub={`${analise.diasAbertosInformados} informado(s) · ${analise.diasInferidosPorMovimento} inferido(s) por check-in`} cls="bg-sky-100 text-sky-800" />
          <Kpi titulo="Movimento médio" valor={`${decimal(analise.mediaAtendimentosDia)} / dia`} sub={`${analise.totalAtendimentos} atendimento(s) no período`} cls="bg-indigo-100 text-indigo-800" />
          <Kpi titulo="Receita média" valor={formatBRL(analise.receitaMediaDia)} sub={`${formatBRL(analise.receita)} de receita paga`} cls="bg-emerald-100 text-emerald-800" />
          <Kpi titulo="Equipe média" valor={analise.mediaPessoas == null ? 'Pendente' : decimal(analise.mediaPessoas)} sub={analise.pessoasHora == null ? 'informe equipe e horários' : `${decimal(analise.pessoasHora)} pessoa-hora(s) no período`} cls="bg-amber-100 text-amber-800" />
          <Kpi titulo="Custo da equipe" valor={formatBRL(analise.custoPessoal)} sub={`${analise.diasComCustoInformado}/${analise.diasFuncionamento} dia(s) com custo informado`} cls="bg-orange-100 text-orange-800" />
          <Kpi titulo="Outros custos" valor={formatBRL(analise.outrosCustos)} sub="custos variáveis informados por dia" cls="bg-slate-200 text-slate-700" />
          <Kpi titulo="Resultado operacional" valor={formatBRL(analise.resultadoOperacional)} sub={custoCompleto ? 'receita paga menos custos informados' : `parcial: faltam custos de ${analise.diasSemCustoInformado} dia(s)`} cls={analise.resultadoOperacional >= 0 ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'} />
          <Kpi titulo="Margem operacional" valor={analise.margemPercentual == null ? '—' : `${decimal(analise.margemPercentual * 100)}%`} sub={custoCompleto ? 'sobre a receita paga' : 'parcial até completar os custos'} cls="bg-violet-100 text-violet-800" />
        </div>

        {(analise.diasSemCustoInformado > 0 || analise.diasAbertosSemMovimento > 0) && <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {analise.diasSemCustoInformado > 0 && <span>⚠️ Há {analise.diasSemCustoInformado} dia(s) com movimento, mas sem equipe/custo preenchido. O resultado ainda é parcial. </span>}
          {analise.diasAbertosSemMovimento > 0 && <span>{analise.diasAbertosSemMovimento} dia(s) aberto(s) sem atendimento foram incluídos corretamente.</span>}
        </div>}
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="font-display text-lg font-bold text-slate-700">Dias e horários contra a média</h2><p className="text-xs text-slate-500">Vermelho: abaixo de 70% da média · cinza: entre 70% e 130% · verde: acima de 130%.</p></div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">{(['ruim', 'medio', 'pico'] as const).map((c) => <span key={c} className={`rounded-full px-2.5 py-1 ring-1 ${CLASSE[c].bloco}`}>{CLASSE[c].label}</span>)}</div>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-600">Média por dia da semana</h3>
            {analise.diasSemana.map((d) => <div key={d.dia} className={`grid grid-cols-[105px_1fr_70px] items-center gap-2 rounded-xl px-3 py-2 ring-1 ${CLASSE[d.classificacao].bloco}`}>
              <span className="truncate text-sm font-bold capitalize">{d.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-white/70"><div className={`h-full rounded-full ${CLASSE[d.classificacao].barra}`} style={{ width: `${d.diasAbertos ? Math.max(3, d.mediaPorDia / maxDia * 100) : 0}%` }} /></div>
              <span className="text-right text-sm font-bold">{d.diasAbertos ? decimal(d.mediaPorDia) : '—'} <span className="text-[10px] font-normal">/dia</span></span>
            </div>)}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-600">Entradas por horário, em média por dia aberto</h3>
            {analise.horarios.map((h) => <div key={h.hora} className={`grid grid-cols-[105px_1fr_70px] items-center gap-2 rounded-xl px-3 py-2 ring-1 ${CLASSE[h.classificacao].bloco}`}>
              <span className="text-sm font-bold">{String(h.hora).padStart(2, '0')}:00–{String(h.hora + 1).padStart(2, '0')}:00</span>
              <div className="h-3 overflow-hidden rounded-full bg-white/70"><div className={`h-full rounded-full ${CLASSE[h.classificacao].barra}`} style={{ width: `${h.entradas ? Math.max(3, h.mediaPorDia / maxHora * 100) : 0}%` }} /></div>
              <span className="text-right text-sm font-bold">{decimal(h.mediaPorDia)} <span className="text-[10px] font-normal">/dia</span></span>
            </div>)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-display text-lg font-bold text-slate-700">Mapa de oportunidade · dia × horário</h2>
        <p className="mb-3 text-xs text-slate-500">Cada célula mostra a média de entradas naquele horário por vez que o respectivo dia da semana funcionou.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-1 text-center text-xs">
            <thead><tr><th className="px-2 py-1 text-left text-slate-400">Dia</th>{analise.horarios.map((h) => <th key={h.hora} className="px-1 py-1 text-slate-400">{h.hora}h</th>)}</tr></thead>
            <tbody>{analise.mapaDiaHorario.map((linha) => <tr key={linha.dia}><th className="px-2 py-2 text-left font-bold capitalize text-slate-600">{linha.label}<span className="ml-1 font-normal text-slate-400">({linha.diasAbertos}×)</span></th>{linha.horarios.map((h) => <td key={h.hora} aria-label={`${linha.label}, ${h.hora} horas: média ${decimal(h.mediaPorDia, 2)}`} className={`rounded-lg px-1 py-2 font-bold ring-1 ${CLASSE[h.classificacao].bloco}`}>{linha.diasAbertos ? decimal(h.mediaPorDia, 2) : '—'}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div><h2 className="font-display text-xl font-bold text-slate-700">Dados externos da operação</h2><p className="text-sm text-slate-500">Preencha equipe e custos reais. Check-ins identificam dias com movimento, mas somente esta informação registra abertura sem clientes e permite medir margem.</p></div>
        <OperacaoForms periodo={periodo} edicao={edicao} />
        <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400"><tr><th className="pb-2">Data</th><th>Funcionou</th><th>Horário</th><th>Pessoas</th><th>Custo equipe</th><th>Outros custos</th><th>Observação</th><th></th></tr></thead>
            <tbody className="divide-y divide-slate-100">{operacoesPeriodo.map((o) => <tr key={o.data} className="text-slate-600"><td className="py-2 font-semibold">{dataBR(o.data)}</td><td>{o.aberto ? 'sim' : 'não'}</td><td>{o.abertura?.slice(0, 5) ?? '—'}–{o.fechamento?.slice(0, 5) ?? '—'}</td><td>{o.pessoas}</td><td>{o.custoPessoal == null ? <span className="font-semibold text-amber-600">pendente</span> : formatBRL(o.custoPessoal)}</td><td>{formatBRL(o.outrosCustos)}</td><td className="max-w-[260px] truncate">{o.observacao ?? '—'}</td><td><Link href={`${periodoHref(chave)}&editar=${o.data}`} className="font-bold text-indigo-600">Editar</Link></td></tr>)}</tbody>
          </table>
          {operacoesPeriodo.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Nenhum dado operacional externo preenchido neste período.</div>}
        </div>
      </section>
    </div>
  )
}
