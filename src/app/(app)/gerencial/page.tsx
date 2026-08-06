import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import { agoraHora, hojeISO, horaParaMinutos } from '@/lib/datas'
import { calcularLotacao } from '@/lib/lotacao'
import { formatBRL } from '@/lib/dinheiro'
import { valorMovimentadoLancamento } from '@/lib/financeiro'
import {
  calcularRelatorioGerencial,
  duracaoHumana,
  minutosComoHora,
  normalizarPeriodoGerencial,
} from '@/lib/gerencial-relatorio'
import GerarMensalidades from './gerar-mensalidades'
import { buscarPresencasRelatorio } from './dados'

function Card({
  titulo,
  valor,
  sub,
  cls,
  href,
}: {
  titulo: string
  valor: string
  sub?: string
  cls: string
  href?: string
}) {
  const conteudo = (
    <>
      <div className="text-sm font-semibold opacity-80">{titulo}</div>
      <div className="font-display text-3xl font-bold">{valor}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </>
  )
  const estilo = `block rounded-2xl p-5 shadow-sm ring-1 ring-black/5 ${cls}`
  return href ? <Link href={href} className={`pop ${estilo} hover:shadow-md`}>{conteudo}</Link> : <div className={estilo}>{conteudo}</div>
}

function dataBR(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function dataCurta(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano.slice(2)}`
}

function faixaHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00–${String(hora).padStart(2, '0')}:59`
}

const origemLabel: Record<string, string> = {
  espaco_kids: 'Play',
  diaria: 'Diária',
  mensalista: 'Mensalista',
  colonia: 'Colônia',
}

export default async function GerencialPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; de?: string; ate?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const supabase = await createClient()
  const hoje = hojeISO()
  const periodo = normalizarPeriodoGerencial(sp, hoje)

  const [abertas, presencasHoje, criancasAtivas, lancamentos, cfg, mensalistas, inscricoes, dadosRelatorio] =
    await Promise.all([
      supabase.from('presenca').select('id').eq('data', hoje).is('saida', null),
      supabase.from('presenca').select('origem').eq('data', hoje),
      supabase.from('crianca').select('id').eq('ativo', true),
      supabase.from('lancamento').select('valor, desconto, status, origem_tipo, capture_method')
        .gte('vencimento', periodo.de).lte('vencimento', periodo.ate),
      supabase.from('config_sistema').select('capacidade_dia').eq('id', 1).maybeSingle(),
      supabase.from('mensalidade').select('id').eq('ativo', true),
      supabase.from('inscricao_colonia').select('id, colonia:colonia_id (ativo)'),
      periodo.erro ? Promise.resolve({ data: [], erro: periodo.erro }) : buscarPresencasRelatorio(periodo.de, periodo.ate),
    ])

  const presentes = abertas.data?.length ?? 0
  const lotacao = calcularLotacao(presentes, cfg.data?.capacidade_dia ?? null)
  const relatorio = calcularRelatorioGerencial(dadosRelatorio.data, {
    hoje,
    agoraMin: horaParaMinutos(agoraHora()),
  })

  const todos = lancamentos.data ?? []
  const liquido = (l: { valor: number; desconto: number }) => Number(l.valor) - Number(l.desconto)
  const recebidoLancamento = (l: { valor: number; desconto: number; capture_method: string | null }) =>
    valorMovimentadoLancamento(Number(l.valor), Number(l.desconto), l.capture_method)
  const totalPendente = todos.filter((l) => l.status === 'pendente').reduce((s, l) => s + liquido(l), 0)
  const totalPago = todos.filter((l) => l.status === 'pago').reduce((s, l) => s + recebidoLancamento(l), 0)

  const mix = (presencasHoje.data ?? []).reduce<Record<string, number>>((m, p) => {
    m[p.origem] = (m[p.origem] ?? 0) + 1
    return m
  }, {})

  const tipos = [
    { tipo: 'presenca', label: 'Play / Diária' },
    { tipo: 'mensalidade', label: 'Mensalidade' },
    { tipo: 'colonia', label: 'Colônia' },
    { tipo: 'avulso', label: 'Avulso' },
  ]
  const receitaPorTipo = tipos.map(({ tipo, label }) => {
    const doTipo = todos.filter((l) => l.origem_tipo === tipo)
    return {
      label,
      aReceber: doTipo.filter((l) => l.status === 'pendente').reduce((s, l) => s + liquido(l), 0),
      recebido: doTipo.filter((l) => l.status === 'pago').reduce((s, l) => s + recebidoLancamento(l), 0),
    }
  })

  const horariosAtivos = relatorio.horarios.filter((h) => h.entradas || h.saidas || h.atendimentosNoHorario)
  const maxEntradas = Math.max(1, ...horariosAtivos.map((h) => h.entradas))
  const exportar = `/gerencial/export.xlsx?de=${periodo.de}&ate=${periodo.ate}`
  const financeiro = `/financeiro/export.xlsx?status=todos&origem=todos&modalidade=todos&de=${periodo.de}&ate=${periodo.ate}`

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/sistema" className="text-sm font-semibold text-slate-500">← Início</Link>
        <h1 className="text-2xl font-bold text-slate-700">📊 Painel gerencial</h1>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Visões do gerencial">
        <span className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Relatório operacional</span>
        <Link href="/gerencial/viabilidade" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">Viabilidade e operação</Link>
      </nav>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <label className="text-xs font-semibold text-slate-500">
          Data inicial
          <input type="date" name="de" defaultValue={periodo.de} className="mt-1 block rounded-xl border-2 border-slate-200 px-3 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-500">
          Data final
          <input type="date" name="ate" defaultValue={periodo.ate} className="mt-1 block rounded-xl border-2 border-slate-200 px-3 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-bold text-white">Atualizar relatório</button>
        <a href={exportar} className="ml-auto rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white">📊 Exportar relatório Excel</a>
        <a href={financeiro} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">Excel financeiro</a>
      </form>
      {(periodo.erro || dadosRelatorio.erro) && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
          Não foi possível montar o relatório: {periodo.erro ?? dadosRelatorio.erro}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card titulo="No espaço agora" href="/presenca" valor={lotacao.capacidade != null ? `${lotacao.presentes}/${lotacao.capacidade}` : String(lotacao.presentes)} sub={lotacao.nivel === 'lotado' ? '🚨 lotado' : lotacao.nivel === 'quase' ? '⚠️ quase lotado' : lotacao.vagas != null ? `${lotacao.vagas} vaga(s)` : 'sem limite'} cls={lotacao.nivel === 'lotado' ? 'bg-rose-100 text-rose-800' : lotacao.nivel === 'quase' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'} />
        <Card titulo="Presenças hoje" href="/presenca" valor={String(presencasHoje.data?.length ?? 0)} sub="entradas registradas" cls="bg-sky-100 text-sky-800" />
        <Card titulo="A receber no período" href={`/financeiro?status=pendente&origem=todos&modalidade=todos&de=${periodo.de}&ate=${periodo.ate}`} valor={formatBRL(totalPendente)} sub={`${todos.filter((l) => l.status === 'pendente').length} pendente(s)`} cls="bg-orange-100 text-orange-800" />
        <Card titulo="Recebido no período" href={`/financeiro?status=pago&origem=todos&modalidade=todos&de=${periodo.de}&ate=${periodo.ate}`} valor={formatBRL(totalPago)} sub={`${todos.filter((l) => l.status === 'pago').length} pago(s)`} cls="bg-violet-100 text-violet-800" />
      </div>

      <section className="space-y-3 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-700">Relatório operacional</h2>
          <p className="text-sm text-slate-500">{dataBR(periodo.de)} a {dataBR(periodo.ate)} · dias sem presença não são considerados dias de atendimento.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card titulo="Atendimentos" valor={String(relatorio.totalAtendimentos)} sub={`${relatorio.criancasUnicas} criança(s) diferente(s)`} cls="bg-indigo-100 text-indigo-800" />
          <Card titulo="Média por dia" valor={relatorio.mediaAtendimentosDia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} sub={`${relatorio.diasComMovimento} dia(s) com movimento`} cls="bg-cyan-100 text-cyan-800" />
          <Card titulo="Pico simultâneo" valor={String(relatorio.picoLotacao?.picoSimultaneo ?? 0)} sub={relatorio.picoLotacao ? `${dataCurta(relatorio.picoLotacao.data)} às ${minutosComoHora(relatorio.picoLotacao.picoEm)}` : 'sem permanências completas'} cls="bg-rose-100 text-rose-800" />
          <Card titulo="Permanência média" valor={duracaoHumana(relatorio.permanenciaMediaMin)} sub={`${relatorio.criancaHoras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} criança-hora(s)`} cls="bg-amber-100 text-amber-800" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Maior movimento</div>
            <div className="mt-1 text-lg font-bold text-slate-700">{relatorio.diaMaisMovimento ? `${dataBR(relatorio.diaMaisMovimento.data)} · ${relatorio.diaMaisMovimento.atendimentos}` : '—'}</div>
            <div className="text-xs text-slate-500">atendimentos no dia</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Menor movimento</div>
            <div className="mt-1 text-lg font-bold text-slate-700">{relatorio.diaMenosMovimento ? `${dataBR(relatorio.diaMenosMovimento.data)} · ${relatorio.diaMenosMovimento.atendimentos}` : '—'}</div>
            <div className="text-xs text-slate-500">entre dias com atendimento registrado</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Menor pico simultâneo</div>
            <div className="mt-1 text-lg font-bold text-slate-700">{relatorio.menorPicoLotacao ? `${dataBR(relatorio.menorPicoLotacao.data)} · ${relatorio.menorPicoLotacao.picoSimultaneo}` : '—'}</div>
            <div className="text-xs text-slate-500">menor lotação máxima entre os dias medidos</div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Horário com mais entradas</div>
            <div className="mt-1 text-lg font-bold text-slate-700">{relatorio.horarioMaisEntradas ? `${faixaHora(relatorio.horarioMaisEntradas.hora)} · ${relatorio.horarioMaisEntradas.entradas}` : '—'}</div>
            <div className="text-xs text-slate-500">entradas somadas no período</div>
          </div>
        </div>

        {relatorio.incompletas > 0 && (
          <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            ⚠️ {relatorio.incompletas} presença(s) antiga(s) sem check-out. Elas contam como entrada, mas não entram na duração nem na lotação para não distorcer o relatório.
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-display text-lg font-bold text-slate-700">Movimento por dia</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="pb-2">Data</th><th>Atend.</th><th>Crianças</th><th>1ª entrada</th><th>Última saída</th><th>Pico</th><th>Permanência</th><th>Até 14h</th><th>14–18h</th><th>Após 18h</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {relatorio.dias.map((d) => (
                <tr key={d.data} className="text-slate-600">
                  <td className="py-2 font-semibold text-slate-700">{dataBR(d.data)} <span className="font-normal text-slate-400">· {d.diaSemana}</span></td>
                  <td>{d.atendimentos}</td><td>{d.criancasUnicas}</td><td>{minutosComoHora(d.primeiraEntrada)}</td><td>{minutosComoHora(d.ultimaSaida)}</td>
                  <td><span className="font-bold text-rose-700">{d.picoSimultaneo}</span>{d.picoEm != null && <span className="text-xs text-slate-400"> às {minutosComoHora(d.picoEm)}</span>}</td>
                  <td>{duracaoHumana(d.permanenciaMediaMin)}</td><td>{d.antes14}</td><td>{d.entre14e18}</td><td>{d.apos18}</td>
                </tr>
              ))}
              {relatorio.dias.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-slate-400">Nenhuma presença no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-display text-lg font-bold text-slate-700">Dia da semana × faixa de entrada</h2>
          <p className="mb-3 text-xs text-slate-400">Ajuda a comparar, por exemplo, meio-dia com o movimento depois das 18h.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400"><tr><th className="pb-2">Dia</th><th>Dias ativos</th><th>Média/dia</th><th>Até 14h</th><th>14–18h</th><th>Após 18h</th><th>Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {relatorio.diasSemana.map((d) => <tr key={d.dia} className="text-slate-600"><td className="py-2 font-semibold capitalize text-slate-700">{d.label}</td><td>{d.diasComMovimento}</td><td>{d.mediaPorDia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td><td>{d.antes14}</td><td>{d.entre14e18}</td><td className="font-bold text-indigo-700">{d.apos18}</td><td>{d.atendimentos}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-display text-lg font-bold text-slate-700">Entradas por horário</h2>
          <p className="mb-3 text-xs text-slate-400">Total de check-ins iniciados em cada hora no período.</p>
          <div className="max-h-[330px] space-y-2 overflow-y-auto pr-2">
            {horariosAtivos.map((h) => (
              <div key={h.hora} className="grid grid-cols-[105px_1fr_32px] items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">{faixaHora(h.hora)}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(4, (h.entradas / maxEntradas) * 100)}%` }} /></div>
                <span className="text-right font-bold text-indigo-700">{h.entradas}</span>
              </div>
            ))}
            {horariosAtivos.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Nenhum horário no período.</div>}
          </div>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 font-display text-base font-bold text-slate-700">🧩 Hoje por tipo</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(origemLabel).map(([chave, label]) => <span key={chave} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{label}: {mix[chave] ?? 0}</span>)}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 font-display text-base font-bold text-slate-700">💵 Receita por tipo · {dataCurta(periodo.de)} a {dataCurta(periodo.ate)}</div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400"><span>tipo</span><span className="flex gap-4"><span className="w-24 text-right">a receber</span><span className="w-24 text-right">recebido</span></span></div>
            {receitaPorTipo.map((r) => <div key={r.label} className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-600">{r.label}</span><span className="flex gap-4"><span className="w-24 text-right text-orange-600">{formatBRL(r.aReceber)}</span><span className="w-24 text-right font-bold text-emerald-700">{formatBRL(r.recebido)}</span></span></div>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card titulo="Mensalistas ativos" href="/mensalistas" valor={String(mensalistas.data?.length ?? 0)} sub="matrículas vigentes" cls="bg-emerald-100 text-emerald-800" />
        <Card titulo="Inscritos na colônia" href="/colonias" valor={String((inscricoes.data ?? []).filter((i) => i.colonia?.ativo).length)} sub="colônias ativas" cls="bg-amber-100 text-amber-800" />
        <Card titulo="Crianças ativas" href="/criancas" valor={String(criancasAtivas.data?.length ?? 0)} sub="no cadastro" cls="bg-pink-100 text-pink-800" />
      </div>

      <GerarMensalidades />
    </div>
  )
}
