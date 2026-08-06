'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { OperacaoPlayDia, PeriodoViabilidade } from '@/lib/viabilidade'
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
  return <button type="submit" disabled={pending} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'Salvando…' : label}</button>
}

function Mensagem({ estado }: { estado: OperacaoActionState }) {
  if (!estado.mensagem) return null
  return <p aria-live="polite" className={`text-sm font-semibold ${estado.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{estado.mensagem}</p>
}

const input = 'mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm text-slate-700'

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
    <div className="grid gap-4 xl:grid-cols-2">
      <form action={actionDia} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-700">Informar ou corrigir um dia</h3>
          <p className="text-xs text-slate-500">Use para domingos com equipe diferente, feriados, dias fechados ou qualquer exceção.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-xs font-semibold text-slate-500">Data<input className={input} type="date" name="data" required defaultValue={dataPadrao} /></label>
          <label className="text-xs font-semibold text-slate-500">Funcionou?<select className={input} name="aberto" defaultValue={String(edicao?.aberto ?? true)}><option value="true">Sim, abriu</option><option value="false">Não abriu</option></select></label>
          <label className="text-xs font-semibold text-slate-500">Abertura<input className={input} type="time" name="abertura" defaultValue={edicao?.abertura?.slice(0, 5) ?? ''} /></label>
          <label className="text-xs font-semibold text-slate-500">Fechamento<input className={input} type="time" name="fechamento" defaultValue={edicao?.fechamento?.slice(0, 5) ?? ''} /></label>
          <label className="text-xs font-semibold text-slate-500">Pessoas<input className={input} type="number" min="0" step="1" name="pessoas" required defaultValue={edicao?.pessoas ?? 0} /></label>
          <label className="text-xs font-semibold text-slate-500">Custo da equipe/dia<input className={input} type="number" min="0" step="0.01" name="custo_pessoal" defaultValue={edicao?.custoPessoal ?? ''} placeholder="pendente" /></label>
          <label className="text-xs font-semibold text-slate-500">Outros custos/dia<input className={input} type="number" min="0" step="0.01" name="outros_custos" required defaultValue={edicao?.outrosCustos ?? 0} /></label>
          <label className="text-xs font-semibold text-slate-500">Observação<input className={input} name="observacao" maxLength={300} defaultValue={edicao?.observacao ?? ''} placeholder="Ex.: evento, chuva…" /></label>
        </div>
        <div className="flex flex-wrap items-center gap-3"><BotaoSalvar label="Salvar dia" /><Mensagem estado={estadoDia} /></div>
      </form>

      <form action={actionEscala} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-700">Aplicar escala por dia da semana</h3>
          <p className="text-xs text-slate-500">Ex.: seg.–qui. com 1 pessoa; depois repita para sex.–sáb. com 2. Valores existentes nas datas selecionadas são atualizados.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-xs font-semibold text-slate-500">De<input className={input} type="date" name="de" required defaultValue={periodo.de} /></label>
          <label className="text-xs font-semibold text-slate-500">Até<input className={input} type="date" name="ate" required defaultValue={periodo.ate} /></label>
          <label className="text-xs font-semibold text-slate-500">Pessoas<input className={input} type="number" min="0" step="1" name="pessoas" required defaultValue="1" /></label>
          <label className="text-xs font-semibold text-slate-500">Custo da equipe/dia<input className={input} type="number" min="0" step="0.01" name="custo_pessoal" placeholder="pode preencher depois" /></label>
          <label className="text-xs font-semibold text-slate-500">Abertura<input className={input} type="time" name="abertura" /></label>
          <label className="text-xs font-semibold text-slate-500">Fechamento<input className={input} type="time" name="fechamento" /></label>
          <label className="text-xs font-semibold text-slate-500">Outros custos/dia<input className={input} type="number" min="0" step="0.01" name="outros_custos" required defaultValue="0" /></label>
        </div>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-slate-500">Dias que abrem com esta escala</legend>
          <div className="flex flex-wrap gap-2">
            {DIAS.map((dia) => <label key={dia.valor} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600"><input type="checkbox" name="dias" value={dia.valor} /> {dia.label}</label>)}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3"><BotaoSalvar label="Aplicar escala" /><Mensagem estado={estadoEscala} /></div>
      </form>
    </div>
  )
}
