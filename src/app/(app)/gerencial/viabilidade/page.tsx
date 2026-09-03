import Link from 'next/link'
import { agoraHora, hojeISO, horaParaMinutos } from '@/lib/datas'
import { formatBRL } from '@/lib/dinheiro'
import { requireAdmin } from '@/lib/colaborador'
import { dataISOValida } from '@/lib/financeiro-filtros'
import { calcularRelatorioGerencial } from '@/lib/gerencial-relatorio'
import {
  CLIMA_PLAY_LABEL,
  calcularViabilidade,
  periodosViabilidade,
  type AnaliseViabilidade,
  type ClassificacaoMovimento,
  type PeriodoViabilidade,
} from '@/lib/viabilidade'
import { buscarPresencasRelatorio } from '../dados'
import { buscarOperacoesPlay, buscarReceitasPlay } from './dados'
import { ClimaRetroativoForm, OperacaoForms } from './operacao-forms'

const CLASSE: Record<ClassificacaoMovimento, { bloco: string; barra: string; label: string }> = {
  ruim: { bloco: 'bg-rose-100 text-rose-800 ring-rose-200', barra: 'bg-rose-500', label: 'Abaixo da média' },
  medio: { bloco: 'bg-slate-100 text-slate-700 ring-slate-200', barra: 'bg-slate-400', label: 'Na média' },
  pico: { bloco: 'bg-emerald-100 text-emerald-800 ring-emerald-200', barra: 'bg-emerald-500', label: 'Pico' },
  sem_dados: { bloco: 'bg-white text-slate-400 ring-slate-200', barra: 'bg-slate-200', label: 'Sem base' },
}

const CLIMA_ICONE = {
  sol: '☀️',
  sol_entre_nuvens: '🌤️',
  nublado: '☁️',
  garoa: '🌦️',
  chuva: '🌧️',
  tempestade: '⛈️',
} as const

function decimal(valor: number, casas = 1): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })
}

function dataBR(data: string): string {
  return data.split('-').reverse().join('/')
}

function periodoHref(periodo: PeriodoViabilidade, editar?: string): string {
  const params = new URLSearchParams()
  if (periodo.chave === 'personalizado') {
    params.set('de', periodo.de)
    params.set('ate', periodo.ate)
  } else {
    params.set('visao', periodo.chave)
  }
  if (editar) params.set('editar', editar)
  return `/gerencial/viabilidade?${params.toString()}`
}

function Comparativo({ periodo, analise, ativo }: { periodo: PeriodoViabilidade; analise: AnaliseViabilidade; ativo: boolean }) {
  return (
    <Link href={periodoHref(periodo)} className={`rounded-2xl p-4 shadow-sm ring-2 transition ${ativo ? 'bg-indigo-50 ring-indigo-400' : 'bg-white ring-slate-200 hover:ring-indigo-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold capitalize text-slate-700">{periodo.label}</h2>
        {periodo.parcial && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">parcial até {dataBR(periodo.ate)}</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div><span className="block text-xs text-slate-400">Dias funcionando</span><strong className="text-slate-700">{analise.diasFuncionamento}</strong></div>
        <div><span className="block text-xs text-slate-400">Atendimentos</span><strong className="text-slate-700">{analise.totalAtendimentos}</strong></div>
        <div><span className="block text-xs text-slate-400">Faturamento</span><strong className="text-emerald-700">{formatBRL(analise.faturamentoGerado)}</strong></div>
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
  searchParams: Promise<{ visao?: string; editar?: string; de?: string; ate?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const hoje = hojeISO()
  const periodos = periodosViabilidade(hoje)
  const anterior = periodos.find((p) => p.chave === 'anterior')!
  const atual = periodos.find((p) => p.chave === 'atual')!
  const filtroSolicitado = sp.de !== undefined || sp.ate !== undefined
  const filtroValido = dataISOValida(sp.de ?? '') && dataISOValida(sp.ate ?? '') && sp.de! <= sp.ate!
  const periodoPersonalizado: PeriodoViabilidade | null = filtroValido ? {
    chave: 'personalizado',
    label: 'período personalizado',
    de: sp.de!,
    ate: sp.ate!,
    parcial: false,
  } : null
  const periodoCard = periodos.find((p) => p.chave === sp.visao) ?? periodos[0]
  const periodo = periodoPersonalizado ?? periodoCard
  const consultaDe = periodo.de < anterior.de ? periodo.de : anterior.de
  const consultaAte = periodo.ate > atual.ate ? periodo.ate : atual.ate
  const [presencas, operacoes, receitas] = await Promise.all([
    buscarPresencasRelatorio(consultaDe, consultaAte),
    buscarOperacoesPlay(consultaDe, consultaAte),
    buscarReceitasPlay(consultaDe, consultaAte),
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
  const chave = periodo.chave
  const analise = periodoPersonalizado
    ? calcularViabilidade(
        calcularRelatorioGerencial(
          presencas.data.filter((p) => p.data >= periodo.de && p.data <= periodo.ate),
          { hoje, agoraMin },
        ),
        operacoes.data.filter((o) => o.data >= periodo.de && o.data <= periodo.ate),
        receitas.data.filter((r) => r.data >= periodo.de && r.data <= periodo.ate),
      )
    : resultados.get(chave)!
  const edicao = operacoes.data.find((o) => o.data === sp.editar) ?? null
  const erros = [presencas.erro, operacoes.erro, receitas.erro].filter(Boolean)
  const maxDia = Math.max(1, ...analise.diasSemana.map((d) => d.mediaPorDia))
  const maxHora = Math.max(1, ...analise.horarios.map((h) => h.mediaPorDia))
  const custoCompleto = analise.diasSemCustoInformado === 0 && analise.diasFuncionamento > 0
  const diasFuncionando = analise.demonstrativoDias.filter((d) => d.funcionou)
  const totalCriancasDia = diasFuncionando.reduce((s, d) => s + d.criancasUnicas, 0)
  const totalPessoasDia = diasFuncionando.reduce((s, d) => s + (d.pessoas ?? 0), 0)
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
      {filtroSolicitado && !filtroValido && <div className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">Informe uma data inicial e uma data final válidas; a inicial não pode ser posterior à final.</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {periodos.map((p) => <Comparativo key={p.chave} periodo={p} analise={resultados.get(p.chave)!} ativo={p.chave === chave} />)}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="min-w-[220px] flex-1">
          <h2 className="font-display font-bold text-slate-700">Filtrar outro período</h2>
          <p className="mt-0.5 text-xs text-slate-500">O filtro atualiza toda a análise e a planilha exportada. Os cards mensais continuam disponíveis acima.</p>
        </div>
        <label className="text-xs font-semibold text-slate-500">Data inicial<input type="date" name="de" required max={hoje} defaultValue={periodo.de} className="mt-1 block h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label>
        <label className="text-xs font-semibold text-slate-500">Data final<input type="date" name="ate" required max={hoje} defaultValue={periodo.ate} className="mt-1 block h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label>
        <button type="submit" className="min-h-11 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">Aplicar período</button>
        {periodoPersonalizado && <Link href={periodoHref(periodos[0])} className="min-h-11 rounded-full bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">Limpar filtro</Link>}
      </form>

      <section className="space-y-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div>
          <h2 className="font-display text-xl font-bold capitalize text-slate-700">Leitura de {periodo.label}</h2>
          <p className="text-sm text-slate-500">{dataBR(periodo.de)} a {dataBR(periodo.ate)} · faturamento soma valores pagos e pendentes do Play; cortesia não movimenta receita.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi titulo="Dias funcionando" valor={String(analise.diasFuncionamento)} sub={`${analise.diasAbertosInformados} informado(s) · ${analise.diasInferidosPorMovimento} inferido(s) por check-in`} cls="bg-sky-100 text-sky-800" />
          <Kpi titulo="Movimento médio" valor={`${decimal(analise.mediaAtendimentosDia)} / dia`} sub={`${analise.totalAtendimentos} atendimento(s) no período`} cls="bg-indigo-100 text-indigo-800" />
          <Kpi titulo="Entrada paga" valor={formatBRL(analise.receita)} sub={`${formatBRL(analise.receitaMediaDia)} recebidos por dia funcionando`} cls="bg-emerald-100 text-emerald-800" />
          <Kpi titulo="Faturamento gerado" valor={formatBRL(analise.faturamentoGerado)} sub={`${formatBRL(analise.aReceber)} ainda pendente`} cls="bg-teal-100 text-teal-800" />
          <Kpi titulo="Equipe média" valor={analise.mediaPessoas == null ? 'Pendente' : decimal(analise.mediaPessoas)} sub={analise.pessoasHora == null ? 'informe equipe e horários' : `${decimal(analise.pessoasHora)} pessoa-hora(s) no período`} cls="bg-amber-100 text-amber-800" />
          <Kpi titulo="Custo da equipe" valor={formatBRL(analise.custoPessoal)} sub={`${analise.diasComCustoInformado}/${analise.diasFuncionamento} dia(s) com custo informado`} cls="bg-orange-100 text-orange-800" />
          <Kpi titulo="Alimentação e café" valor={formatBRL(analise.custoAlimentacao)} sub="saída separada dos demais gastos" cls="bg-yellow-100 text-yellow-800" />
          <Kpi titulo="Outras saídas" valor={formatBRL(analise.outrosCustos)} sub="demais custos variáveis informados" cls="bg-slate-200 text-slate-700" />
          <Kpi titulo="Saldo de caixa" valor={formatBRL(analise.saldoCaixa)} sub="valores pagos menos todas as saídas" cls={analise.saldoCaixa >= 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-rose-100 text-rose-800'} />
          <Kpi titulo="Resultado operacional" valor={formatBRL(analise.resultadoOperacional)} sub={custoCompleto ? 'faturamento gerado menos custos informados' : `parcial: faltam custos de ${analise.diasSemCustoInformado} dia(s)`} cls={analise.resultadoOperacional >= 0 ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'} />
          <Kpi titulo="Margem operacional" valor={analise.margemPercentual == null ? '—' : `${decimal(analise.margemPercentual * 100)}%`} sub={custoCompleto ? 'sobre o faturamento gerado' : 'parcial até completar os custos'} cls="bg-violet-100 text-violet-800" />
          <Kpi titulo="Clima preenchido" valor={`${analise.diasComClimaInformado}/${analise.diasFuncionamento}`} sub={analise.diasSemClimaInformado ? `faltam ${analise.diasSemClimaInformado} dia(s)` : 'todos os dias classificados'} cls="bg-sky-100 text-sky-800" />
        </div>

        {(analise.diasSemCustoInformado > 0 || analise.diasAbertosSemMovimento > 0 || analise.diasSemClimaInformado > 0) && <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {analise.diasSemCustoInformado > 0 && <span>⚠️ Há {analise.diasSemCustoInformado} dia(s) com movimento, mas sem equipe/custo preenchido. O resultado ainda é parcial. </span>}
          {analise.diasAbertosSemMovimento > 0 && <span>{analise.diasAbertosSemMovimento} dia(s) aberto(s) sem atendimento foram incluídos corretamente.</span>}
          {analise.diasSemClimaInformado > 0 && <span> Falta informar o clima de {analise.diasSemClimaInformado} dia(s) para comparar seu impacto.</span>}
        </div>}
        {analise.diasFuncionamento > 0 && <ClimaRetroativoForm periodo={periodo} diasPendentes={analise.diasSemClimaInformado} />}
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

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-700">Clima × movimento do Play</h2>
          <p className="text-xs text-slate-500">Compara apenas os dias em que o clima foi informado. Quanto mais dias por condição, mais confiável fica a leitura.</p>
        </div>
        {analise.porClima.length > 0 ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {analise.porClima.map((item) => <div key={item.clima} className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
            <div className="flex items-center justify-between gap-2"><strong className="text-slate-700">{CLIMA_ICONE[item.clima]} {item.label}</strong><span className="text-xs font-semibold text-slate-400">{item.dias} dia(s)</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><span className="block text-xs text-slate-400">Movimento médio</span><strong className="text-indigo-700">{decimal(item.mediaAtendimentos)} criança(s)</strong></div>
              <div><span className="block text-xs text-slate-400">Entrada média</span><strong className="text-emerald-700">{formatBRL(item.mediaReceita)}</strong></div>
              <div><span className="block text-xs text-slate-400">Total recebido</span><strong className="text-slate-700">{formatBRL(item.receitaRecebida)}</strong></div>
              <div><span className="block text-xs text-slate-400">Temperatura média</span><strong className="text-slate-700">{item.temperaturaMedia == null ? '—' : `${decimal(item.temperaturaMedia)} °C`}</strong></div>
            </div>
          </div>)}
        </div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Preencha o clima nos dias de operação para começar esta comparação.</p>}
      </section>

      <section className="space-y-4" id="dados-operacao">
        <div><h2 className="font-display text-xl font-bold text-slate-700">Caixa e operação diária do Play</h2><p className="text-sm text-slate-500">Entradas pagas e crianças vêm automaticamente do sistema. Preencha colaboradores, alimentação, outras saídas, horários e clima de cada dia.</p></div>
        <OperacaoForms periodo={periodo} edicao={edicao} />
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full min-w-[2050px] border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="sticky left-0 z-20 min-w-[130px] border-b border-r border-slate-200 bg-slate-50 px-4 py-3">Data</th>
                <th scope="col" className="min-w-[190px] border-b border-slate-200 px-4 py-3">Clima</th>
                <th scope="col" className="min-w-[145px] border-b border-slate-200 px-4 py-3">Situação</th>
                <th scope="col" className="min-w-[105px] border-b border-slate-200 px-4 py-3 text-right">Crianças</th>
                <th scope="col" className="min-w-[205px] border-b border-slate-200 px-4 py-3 text-right">Entrada paga</th>
                <th scope="col" className="min-w-[135px] border-b border-slate-200 px-4 py-3 text-right">Colaboradores</th>
                <th scope="col" className="min-w-[135px] border-b border-slate-200 px-4 py-3 text-right">Custo equipe</th>
                <th scope="col" className="min-w-[130px] border-b border-slate-200 px-4 py-3 text-right">Alimentação</th>
                <th scope="col" className="min-w-[125px] border-b border-slate-200 px-4 py-3 text-right">Outras saídas</th>
                <th scope="col" className="min-w-[130px] border-b border-slate-200 px-4 py-3 text-right">Saídas totais</th>
                <th scope="col" className="min-w-[155px] border-b border-slate-200 px-4 py-3 text-right">Saldo de caixa</th>
                <th scope="col" className="min-w-[300px] border-b border-l border-slate-200 px-5 py-3">Observação</th>
                <th scope="col" className="min-w-[105px] border-b border-slate-200 px-4 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>{analise.demonstrativoDias.map((d, indice) => {
              const situacao = d.situacao === 'informado'
                ? { label: 'informado', cls: 'bg-emerald-100 text-emerald-700' }
                : d.situacao === 'inferido'
                  ? { label: 'inferido', cls: 'bg-amber-100 text-amber-700' }
                  : { label: 'não abriu', cls: 'bg-slate-100 text-slate-500' }
              const fundo = indice % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
              return <tr key={d.data} className={`group transition-colors hover:bg-indigo-50/70 ${d.funcionou ? `text-slate-600 ${fundo}` : 'bg-slate-100/80 text-slate-400'}`}>
                <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-inherit px-4 py-3 align-top font-semibold text-slate-700 group-hover:bg-indigo-50">{dataBR(d.data)}<span className="mt-0.5 block text-xs font-normal capitalize text-slate-400">{d.diaSemana}</span></td>
                <td className="border-b border-slate-100 px-4 py-3 align-top">{d.clima ? <span className="font-semibold text-slate-600">{CLIMA_ICONE[d.clima]} {CLIMA_PLAY_LABEL[d.clima]}<span className="mt-0.5 block text-xs font-normal text-slate-400">{d.temperaturaMedia == null ? 'temperatura pendente' : `${decimal(d.temperaturaMedia)} °C`}</span></span> : <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">pendente</span>}</td>
                <td className="border-b border-slate-100 px-4 py-3 align-top"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${situacao.cls}`}>{situacao.label}</span>{(d.abertura || d.fechamento) && <span className="mt-1.5 block whitespace-nowrap text-xs text-slate-400">{d.abertura?.slice(0, 5) ?? '—'}–{d.fechamento?.slice(0, 5) ?? '—'}</span>}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-right align-top font-bold tabular-nums text-indigo-700">{d.criancasUnicas}{d.atendimentos !== d.criancasUnicas && <span className="mt-0.5 block whitespace-nowrap text-xs font-normal text-slate-400">{d.atendimentos} entrada(s)</span>}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right align-top font-bold tabular-nums text-emerald-700">{formatBRL(d.receitaRecebida)}<span className="mt-0.5 block text-xs font-normal text-slate-400">{formatBRL(d.faturamentoGerado)} gerado{d.aReceber > 0 ? ` · ${formatBRL(d.aReceber)} pendente` : ''}</span></td>
                <td className="border-b border-slate-100 px-4 py-3 text-right align-top tabular-nums">{d.pessoas == null ? <span className="font-semibold text-amber-600">pendente</span> : d.pessoas}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right align-top tabular-nums">{d.custoPessoal == null ? <span className="font-semibold text-amber-600">pendente</span> : formatBRL(d.custoPessoal)}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right align-top tabular-nums">{formatBRL(d.custoAlimentacao)}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right align-top tabular-nums">{formatBRL(d.gastosExtras)}</td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right align-top font-semibold tabular-nums text-rose-700">{formatBRL(d.custoTotal)}{d.resultadoParcial && <span className="mt-0.5 block text-[10px] font-normal text-amber-600">parcial</span>}</td>
                <td className={`whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right align-top font-bold tabular-nums ${d.saldoCaixa >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatBRL(d.saldoCaixa)}<span className="mt-0.5 block text-[10px] font-normal text-slate-400">recebido − saídas</span></td>
                <td className="max-w-[360px] whitespace-normal break-words border-b border-l border-slate-100 px-5 py-3 align-top leading-5 text-slate-600">{d.observacao ?? <span className="text-slate-300">Sem observação</span>}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-center align-top"><Link href={`${periodoHref(periodo, d.data)}#dados-operacao`} className="inline-flex min-h-9 items-center justify-center rounded-full bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-600 hover:text-white">{d.situacao === 'inferido' ? 'Preencher' : 'Editar'}</Link></td>
              </tr>
            })}</tbody>
            {analise.demonstrativoDias.length > 0 && <tfoot className="bg-slate-100 font-bold text-slate-700"><tr><td className="border-t-2 border-slate-300 px-4 py-4" colSpan={3}>TOTAL · {analise.diasFuncionamento} dia(s) funcionando</td><td className="border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums">{totalCriancasDia}</td><td className="whitespace-nowrap border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums text-emerald-700">{formatBRL(analise.receita)}<span className="mt-0.5 block text-[10px] font-normal text-slate-500">{formatBRL(analise.faturamentoGerado)} gerado · {formatBRL(analise.aReceber)} pendente</span></td><td className="border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums">{totalPessoasDia}</td><td className="whitespace-nowrap border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums">{formatBRL(analise.custoPessoal)}</td><td className="whitespace-nowrap border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums">{formatBRL(analise.custoAlimentacao)}</td><td className="whitespace-nowrap border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums">{formatBRL(analise.outrosCustos)}</td><td className="whitespace-nowrap border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums text-rose-700">{formatBRL(analise.custoTotal)}</td><td className={`whitespace-nowrap border-t-2 border-slate-300 px-4 py-4 text-right tabular-nums ${analise.saldoCaixa >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatBRL(analise.saldoCaixa)}</td><td className="border-t-2 border-slate-300" colSpan={2}></td></tr></tfoot>}
          </table>
          {analise.demonstrativoDias.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Nenhuma operação ou movimento do Play neste período.</div>}
        </div>
      </section>
    </div>
  )
}
