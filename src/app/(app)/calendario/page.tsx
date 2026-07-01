import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { hojeISO } from '@/lib/datas'
import { feriadosNacionais } from '@/lib/feriados'
import { formatBRL } from '@/lib/dinheiro'
import { ValorFeriado, FeriadosLocais } from './controles'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function addMes(ano: number, mes: number, delta: number): string {
  const d = new Date(ano, mes - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const sp = await searchParams
  const hoje = hojeISO()
  const mesParam = sp.mes ?? hoje.slice(0, 7) // 'YYYY-MM'
  const [ano, mes] = mesParam.split('-').map(Number)

  const supabase = await createClient()
  const [colaborador, { data: gradeRows }, { data: cfg }, { data: locaisData }] = await Promise.all([
    getColaboradorAtual(),
    supabase.from('grade_play').select('dias_semana, valor').eq('ativo', true),
    supabase.from('config_sistema').select('valor_feriado').eq('id', 1).maybeSingle(),
    supabase.from('feriado').select('id, data, nome').eq('ativo', true).order('data'),
  ])
  const ehAdmin = colaborador?.papel_acesso === 'admin'
  const valorFeriado = cfg?.valor_feriado != null ? Number(cfg.valor_feriado) : null

  // valor base por dia da semana (valores distintos dos slots que incluem o dia)
  const grade = (gradeRows ?? []).map((g) => ({ dias: g.dias_semana, valor: Number(g.valor) }))
  const valoresDoDiaSemana = (w: number): number[] =>
    [...new Set(grade.filter((g) => g.dias.includes(w)).map((g) => g.valor))].sort((a, b) => a - b)

  const nacionais = feriadosNacionais(ano)
  const locais = locaisData ?? []
  const locaisMap = new Map(locais.map((f) => [f.data, f.nome]))

  // monta a grade do mês (semanas de Dom a Sáb)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay()
  const celulas: ({ dia: number; iso: string } | null)[] = []
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) celulas.push({ dia: d, iso: `${ano}-${pad(mes)}-${pad(d)}` })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">📅 Calendário do play</h1>
      </div>

      {/* navegação */}
      <div className="flex items-center justify-between">
        <Link href={`/calendario?mes=${addMes(ano, mes, -1)}`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
          ← Anterior
        </Link>
        <div className="font-display text-lg font-bold text-slate-700">
          {MESES[mes]} de {ano}
        </div>
        <Link href={`/calendario?mes=${addMes(ano, mes, 1)}`} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
          Próximo →
        </Link>
      </div>

      {/* grade do mês */}
      <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
          {DIAS.map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celulas.map((c, i) => {
            if (!c) return <div key={i} />
            const nomeFeriado = locaisMap.get(c.iso) ?? nacionais.get(c.iso)
            const ehFeriado = !!nomeFeriado
            const w = new Date(`${c.iso}T12:00:00`).getDay()
            const valores = valoresDoDiaSemana(w)
            const ehHoje = c.iso === hoje
            return (
              <div
                key={i}
                className={`min-h-[68px] rounded-lg border p-1.5 text-left ${
                  ehFeriado ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'
                } ${ehHoje ? 'ring-2 ring-emerald-400' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${ehFeriado ? 'text-amber-700' : 'text-slate-600'}`}>{c.dia}</span>
                  {ehFeriado && <span>🎉</span>}
                </div>
                {ehFeriado ? (
                  <div className="text-[10px] leading-tight text-amber-700">
                    <div className="truncate font-semibold" title={nomeFeriado}>{nomeFeriado}</div>
                    <div>{valorFeriado != null ? `${formatBRL(valorFeriado)}/h` : 'sem valor'}</div>
                  </div>
                ) : (
                  <div className="text-[10px] leading-tight text-slate-500">
                    {valores.length > 0 ? valores.map((v) => `${formatBRL(v)}/h`).join(' / ') : '—'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        🎉 = feriado (valor/hora único). Dias normais mostram o valor/hora da grade. A cobrança
        tem piso de 1h e é proporcional depois.
      </p>

      {ehAdmin && (
        <>
          <ValorFeriado inicial={valorFeriado} />
          <FeriadosLocais locais={locais} valorFeriado={valorFeriado} />
        </>
      )}
    </div>
  )
}
