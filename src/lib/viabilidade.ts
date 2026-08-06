import type { RelatorioGerencial } from './gerencial-relatorio'

export type ClassificacaoMovimento = 'ruim' | 'medio' | 'pico' | 'sem_dados'

export type OperacaoPlayDia = {
  data: string
  aberto: boolean
  abertura: string | null
  fechamento: string | null
  pessoas: number
  custoPessoal: number | null
  outrosCustos: number
  observacao: string | null
}

export type ReceitaPlayDia = {
  data: string
  valor: number
}

export type PeriodoViabilidade = {
  chave: 'anterior' | 'atual' | 'consolidado'
  label: string
  de: string
  ate: string
  parcial: boolean
}

export type ViabilidadeDiaSemana = {
  dia: number
  label: string
  diasAbertos: number
  atendimentos: number
  mediaPorDia: number
  classificacao: ClassificacaoMovimento
}

export type ViabilidadeHorario = {
  hora: number
  entradas: number
  mediaPorDia: number
  classificacao: ClassificacaoMovimento
}

export type ViabilidadeCelula = {
  hora: number
  entradas: number
  mediaPorDia: number
  classificacao: ClassificacaoMovimento
}

export type ViabilidadeDiaHorario = {
  dia: number
  label: string
  diasAbertos: number
  horarios: ViabilidadeCelula[]
}

export type AnaliseViabilidade = {
  diasFuncionamento: number
  diasAbertosInformados: number
  diasInferidosPorMovimento: number
  diasAbertosSemMovimento: number
  totalAtendimentos: number
  mediaAtendimentosDia: number
  receita: number
  receitaMediaDia: number
  custoPessoal: number
  outrosCustos: number
  custoTotal: number
  resultadoOperacional: number
  margemPercentual: number | null
  diasComCustoInformado: number
  diasSemCustoInformado: number
  mediaPessoas: number | null
  pessoasHora: number | null
  diasSemana: ViabilidadeDiaSemana[]
  horarios: ViabilidadeHorario[]
  mapaDiaHorario: ViabilidadeDiaHorario[]
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const HORAS_ANALISE = Array.from({ length: 10 }, (_, i) => i + 12)

function ultimoDiaMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function numeroDiaSemana(data: string): number {
  return new Date(`${data}T12:00:00`).getDay()
}

function minutos(hora: string | null): number | null {
  if (!hora) return null
  const match = /^(\d{2}):(\d{2})/.exec(hora)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function periodosViabilidade(hoje: string): PeriodoViabilidade[] {
  const [anoAtual, mesAtual, diaAtual] = hoje.split('-').map(Number)
  const anterior = new Date(anoAtual, mesAtual - 2, 1)
  const anoAnterior = anterior.getFullYear()
  const mesAnterior = anterior.getMonth() + 1
  const anteriorDe = iso(anoAnterior, mesAnterior, 1)
  const anteriorAte = iso(anoAnterior, mesAnterior, ultimoDiaMes(anoAnterior, mesAnterior))
  const atualDe = iso(anoAtual, mesAtual, 1)
  const atualAte = iso(anoAtual, mesAtual, Math.min(diaAtual, ultimoDiaMes(anoAtual, mesAtual)))
  return [
    {
      chave: 'anterior',
      label: `${MESES[mesAnterior - 1]} de ${anoAnterior}`,
      de: anteriorDe,
      ate: anteriorAte,
      parcial: false,
    },
    {
      chave: 'atual',
      label: `${MESES[mesAtual - 1]} de ${anoAtual}`,
      de: atualDe,
      ate: atualAte,
      parcial: diaAtual < ultimoDiaMes(anoAtual, mesAtual),
    },
    {
      chave: 'consolidado',
      label: `${MESES[mesAnterior - 1]} + ${MESES[mesAtual - 1]}`,
      de: anteriorDe,
      ate: atualAte,
      parcial: diaAtual < ultimoDiaMes(anoAtual, mesAtual),
    },
  ]
}

export function classificarMovimento(valor: number, referencia: number): ClassificacaoMovimento {
  if (referencia <= 0) return 'sem_dados'
  if (valor < referencia * 0.7) return 'ruim'
  if (valor > referencia * 1.3) return 'pico'
  return 'medio'
}

export function calcularViabilidade(
  relatorio: RelatorioGerencial,
  operacoes: OperacaoPlayDia[],
  receitas: ReceitaPlayDia[],
): AnaliseViabilidade {
  const movimentoPorData = new Map(relatorio.dias.map((d) => [d.data, d]))
  const operacaoPorData = new Map(operacoes.map((o) => [o.data, o]))
  const datasMovimento = new Set(relatorio.dias.map((d) => d.data))
  const datasAbertasInformadas = new Set(operacoes.filter((o) => o.aberto).map((o) => o.data))
  const datasFuncionamento = new Set([...datasMovimento, ...datasAbertasInformadas])
  const diasFuncionamento = datasFuncionamento.size
  const diasInferidosPorMovimento = [...datasMovimento].filter((data) => !datasAbertasInformadas.has(data)).length
  const diasAbertosSemMovimento = [...datasAbertasInformadas].filter((data) => !datasMovimento.has(data)).length

  const operacoesAbertas = operacoes.filter((o) => o.aberto)
  const custoPessoal = operacoesAbertas.reduce((s, o) => s + (o.custoPessoal ?? 0), 0)
  const outrosCustos = operacoesAbertas.reduce((s, o) => s + o.outrosCustos, 0)
  const custoTotal = custoPessoal + outrosCustos
  const receita = receitas.reduce((s, r) => s + r.valor, 0)
  const resultadoOperacional = receita - custoTotal
  const diasComCustoInformado = [...datasFuncionamento].filter((data) => {
    const operacao = operacaoPorData.get(data)
    return operacao?.aberto && operacao.custoPessoal != null
  }).length
  const diasSemCustoInformado = Math.max(0, diasFuncionamento - diasComCustoInformado)
  const equipeInformada = operacoesAbertas.filter((o) => o.pessoas > 0)
  const pessoasHoraValores = equipeInformada.flatMap((o) => {
    const abertura = minutos(o.abertura)
    const fechamento = minutos(o.fechamento)
    return abertura != null && fechamento != null && fechamento > abertura
      ? [o.pessoas * (fechamento - abertura) / 60]
      : []
  })

  const mediaGeralDia = diasFuncionamento ? relatorio.totalAtendimentos / diasFuncionamento : 0
  const diasSemana: ViabilidadeDiaSemana[] = DIAS.map((label, dia) => {
    const datas = [...datasFuncionamento].filter((data) => numeroDiaSemana(data) === dia)
    const atendimentos = datas.reduce((s, data) => s + (movimentoPorData.get(data)?.atendimentos ?? 0), 0)
    const mediaPorDia = datas.length ? atendimentos / datas.length : 0
    return {
      dia,
      label,
      diasAbertos: datas.length,
      atendimentos,
      mediaPorDia,
      classificacao: datas.length ? classificarMovimento(mediaPorDia, mediaGeralDia) : 'sem_dados',
    }
  })

  const entradasPorHora = new Map<number, number>()
  for (const p of relatorio.presencas) {
    const hora = Math.floor(p.entradaMin / 60)
    entradasPorHora.set(hora, (entradasPorHora.get(hora) ?? 0) + 1)
  }
  const totalEntradasFaixa = HORAS_ANALISE.reduce((s, hora) => s + (entradasPorHora.get(hora) ?? 0), 0)
  const referenciaHora = diasFuncionamento ? totalEntradasFaixa / diasFuncionamento / HORAS_ANALISE.length : 0
  const horarios: ViabilidadeHorario[] = HORAS_ANALISE.map((hora) => {
    const entradas = entradasPorHora.get(hora) ?? 0
    const mediaPorDia = diasFuncionamento ? entradas / diasFuncionamento : 0
    return {
      hora,
      entradas,
      mediaPorDia,
      classificacao: classificarMovimento(mediaPorDia, referenciaHora),
    }
  })

  const referenciaCelula = referenciaHora
  const mapaDiaHorario: ViabilidadeDiaHorario[] = DIAS.map((label, dia) => {
    const datasDia = new Set([...datasFuncionamento].filter((data) => numeroDiaSemana(data) === dia))
    return {
      dia,
      label,
      diasAbertos: datasDia.size,
      horarios: HORAS_ANALISE.map((hora) => {
        const entradas = relatorio.presencas.filter((p) => datasDia.has(p.data) && Math.floor(p.entradaMin / 60) === hora).length
        const mediaPorDia = datasDia.size ? entradas / datasDia.size : 0
        return {
          hora,
          entradas,
          mediaPorDia,
          classificacao: datasDia.size ? classificarMovimento(mediaPorDia, referenciaCelula) : 'sem_dados',
        }
      }),
    }
  })

  return {
    diasFuncionamento,
    diasAbertosInformados: datasAbertasInformadas.size,
    diasInferidosPorMovimento,
    diasAbertosSemMovimento,
    totalAtendimentos: relatorio.totalAtendimentos,
    mediaAtendimentosDia: mediaGeralDia,
    receita,
    receitaMediaDia: diasFuncionamento ? receita / diasFuncionamento : 0,
    custoPessoal,
    outrosCustos,
    custoTotal,
    resultadoOperacional,
    margemPercentual: receita ? resultadoOperacional / receita : null,
    diasComCustoInformado,
    diasSemCustoInformado,
    mediaPessoas: equipeInformada.length ? equipeInformada.reduce((s, o) => s + o.pessoas, 0) / equipeInformada.length : null,
    pessoasHora: pessoasHoraValores.length ? pessoasHoraValores.reduce((s, v) => s + v, 0) : null,
    diasSemana,
    horarios,
    mapaDiaHorario,
  }
}
