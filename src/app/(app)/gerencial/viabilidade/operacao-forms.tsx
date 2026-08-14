'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { CLIMA_PLAY_LABEL, CLIMAS_PLAY, type OperacaoPlayDia, type PeriodoViabilidade } from '@/lib/viabilidade'
import {
  aplicarEscalaOperacao,
  salvarOperacaoDia,
  type OperacaoActionState,
} from './actions'

const ESTADO_INICIAL: OperacaoActionState = { ok: false, mensagem: '' }
const DIAS = [
  { valor: 1, label: 'Seg' },
  { valor: 2, label: 'Ter' },
  { valor: 3, label: 'Qua' },
  { valor: 4, label: 'Qui' },
  { valor: 5, label: 'Sex' },
  { valor: 6, label: 'Sáb' },
  { valor: 0, label: 'Dom' },
]

function BotaoSalvar({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-wait disabled:opacity-50">{pending ? 'Salvando…' : label}</button>
}

function Mensagem({ estado }: { estado: OperacaoActionState }) {
  if (!estado.mensagem) return null
  return <p aria-live="polite" className={`text-sm font-semibold ${estado.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{estado.mensagem}</p>
}

const input = 'mt-1.5 h-11 w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
const label = 'block min-w-0 text-xs font-semibold text-slate-500'
const grupo = 'space-y-3 border-t border-slate-100 pt-4'
const legenda = 'font-display text-sm font-bold text-slate-700'

export function OperacaoForms({
  periodo,
  edicao,
}: {
  periodo: PeriodoViabilidade
  edicao: OperacaoPlayDia | null
}) {
  const [estadoDia, actionDia] = useActionState(salvarOperacaoDia, ESTADO_INICIAL)
  const [estadoEscala, actionEscala] = useActionState(aplicarEscalaOperacao, ESTADO_INICIAL)
  const dataPadrao = edicao?.data ?? periodo.ate

  return (
    <div className="space-y-4">
      <form action={actionDia} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-700">Informar ou corrigir um dia</h3>
            <p className="mt-1 text-sm text-slate-500">Preencha somente os dados da operação. Crianças e pagamentos já entram automaticamente.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">✓ Entradas automáticas</span>
        </div>

        <fieldset className={grupo}>
          <legend className={legenda}>Operação do dia</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>Data<input className={input} type="date" name="data" required defaultValue={dataPadrao} /></label>
            <label className={label}>O Play funcionou?<select className={input} name="aberto" defaultValue={String(edicao?.aberto ?? true)}><option value="true">Sim, abriu</option><option value="false">Não abriu</option></select></label>
            <label className={label}>Horário de abertura<input className={input} type="time" name="abertura" defaultValue={edicao?.abertura?.slice(0, 5) ?? ''} /></label>
            <label className={label}>Horário de fechamento<input className={input} type="time" name="fechamento" defaultValue={edicao?.fechamento?.slice(0, 5) ?? ''} /></label>
          </div>
        </fieldset>

        <fieldset className={grupo}>
          <legend className={legenda}>Equipe e saídas do dia</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>Quantidade de colaboradores<input className={input} type="number" min="0" step="1" name="pessoas" required defaultValue={edicao?.pessoas ?? 0} /></label>
            <label className={label}>Custo total da equipe (R$)<input className={input} type="number" min="0" step="0.01" name="custo_pessoal" defaultValue={edicao?.custoPessoal ?? ''} placeholder="Pendente" /></label>
            <label className={label}>Alimentação e café (R$)<input className={input} type="number" min="0" step="0.01" name="custo_alimentacao" required defaultValue={edicao?.custoAlimentacao ?? 0} /></label>
            <label className={label}>Outras saídas (R$)<input className={input} type="number" min="0" step="0.01" name="outros_custos" required defaultValue={edicao?.outrosCustos ?? 0} /></label>
          </div>
        </fieldset>

        <fieldset className={grupo}>
          <legend className={legenda}>Clima e contexto</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>Clima predominante<select className={input} name="clima" defaultValue={edicao?.clima ?? ''}><option value="">Não informado</option>{CLIMAS_PLAY.map((clima) => <option key={clima} value={clima}>{CLIMA_PLAY_LABEL[clima]}</option>)}</select></label>
            <label className={label}>Temperatura média (°C)<input className={input} type="number" min="-10" max="60" step="0.1" name="temperatura_media" defaultValue={edicao?.temperaturaMedia ?? ''} placeholder="Ex.: 24" /></label>
            <label className={`${label} sm:col-span-2`}>Observação do dia<input className={input} name="observacao" maxLength={300} defaultValue={edicao?.observacao ?? ''} placeholder="Ex.: feriado, evento próximo ou promoção…" /></label>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><BotaoSalvar label="Salvar operação do dia" /><Mensagem estado={estadoDia} /></div>
      </form>

      <details className="group rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-slate-700 sm:px-6">
          <span><strong className="font-display">Aplicar escala em vários dias</strong><span className="mt-0.5 block text-xs font-normal text-slate-500">Use apenas para preencher uma mesma equipe e custo em lote.</span></span>
          <span aria-hidden="true" className="text-lg text-slate-400 transition group-open:rotate-180">⌄</span>
        </summary>
        <form action={actionEscala} className="space-y-4 border-t border-slate-100 p-5 sm:p-6">
          <p className="text-sm text-slate-500">Ex.: seg.–qui. com 1 colaborador; depois repita para sex.–sáb. com 2. Valores existentes nas datas selecionadas serão atualizados.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>Data inicial<input className={input} type="date" name="de" required defaultValue={periodo.de} /></label>
            <label className={label}>Data final<input className={input} type="date" name="ate" required defaultValue={periodo.ate} /></label>
            <label className={label}>Colaboradores<input className={input} type="number" min="0" step="1" name="pessoas" required defaultValue="1" /></label>
            <label className={label}>Custo da equipe/dia (R$)<input className={input} type="number" min="0" step="0.01" name="custo_pessoal" placeholder="Pode preencher depois" /></label>
            <label className={label}>Abertura<input className={input} type="time" name="abertura" /></label>
            <label className={label}>Fechamento<input className={input} type="time" name="fechamento" /></label>
            <label className={label}>Alimentação/dia (R$)<input className={input} type="number" min="0" step="0.01" name="custo_alimentacao" required defaultValue="0" /></label>
            <label className={label}>Outras saídas/dia (R$)<input className={input} type="number" min="0" step="0.01" name="outros_custos" required defaultValue="0" /></label>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-500">Dias da semana incluídos</legend>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((dia) => <label key={dia.valor} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"><input type="checkbox" name="dias" value={dia.valor} /> {dia.label}</label>)}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3"><BotaoSalvar label="Aplicar escala" /><Mensagem estado={estadoEscala} /></div>
        </form>
      </details>
    </div>
  )
}
