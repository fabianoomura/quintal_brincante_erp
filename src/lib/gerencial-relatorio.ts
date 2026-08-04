import { dataISOValida, periodoDoMes } from './financeiro-filtros'

export type PresencaRelatorio = {
  id: string
  data: string
  entrada: string
  saida: string | null
  origem: string
  criancaId: string
  criancaNome: string
}

export type PresencaRelatorioNormalizada = PresencaRelatorio & {
  entradaMin: number
  saidaMin: number | null
  fimCalculoMin: number | null
  duracaoMin: number | null
  incompleta: boolean
}

export type ResumoDia = {
  data: string
  diaSemana: string
  atendimentos: number
  criancasUnicas: number
  primeiraEntrada: number
  ultimaSaida: number | null
  picoSimultaneo: number
  picoEm: number | null
  permanenciaMediaMin: number | null
  criancaHoras: number
  antes14: number
  entre14e18: number
  apos18: number
  incompletas: number
}

export type ResumoHorario = {
  hora: number
  entradas: number
  saidas: number
  atendimentosNoHorario: number
  criancaHoras: number
  picoSimultaneo: number
}

export type ResumoDiaSemana = {
  dia: number
  label: string
  diasComMovimento: number
  atendimentos: number
  mediaPorDia: number
  antes14: number
  entre14e18: number
  apos18: number
}

export type RelatorioGerencial = {
  presencas: PresencaRelatorioNormalizada[]
  dias: ResumoDia[]
  horarios: ResumoHorario[]
  diasSemana: ResumoDiaSemana[]
  totalAtendimentos: number
  criancasUnicas: number
  diasComMovimento: number
  mediaAtendimentosDia: number
  permanenciaMediaMin: number | null
  criancaHoras: number
  incompletas: number
  diaMaisMovimento: ResumoDia | null
  diaMenosMovimento: ResumoDia | null
  picoLotacao: ResumoDia | null
  menorPicoLotacao: ResumoDia | null
  horarioMaisEntradas: ResumoHorario | null
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

function minutos(hora: string | null): number | null {
  if (!hora) return null
  const match = /^(\d{2}):(\d{2})/.exec(hora)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? h * 60 + m : null
}

function numeroDiaSemana(data: string): number {
  return new Date(`${data}T12:00:00`).getDay()
}

function pico(intervalos: { inicio: number; fim: number }[]): { valor: number; em: number | null } {
  const eventos = new Map<number, number>()
  for (const { inicio, fim } of intervalos) {
    if (fim <= inicio) continue
    eventos.set(inicio, (eventos.get(inicio) ?? 0) + 1)
    eventos.set(fim, (eventos.get(fim) ?? 0) - 1)
  }
  let atual = 0
  let valor = 0
  let em: number | null = null
  for (const [instante, delta] of [...eventos.entries()].sort((a, b) => a[0] - b[0])) {
    atual += delta
    if (atual > valor) {
      valor = atual
      em = instante
    }
  }
  return { valor, em }
}

function normalizarPresenca(
  p: PresencaRelatorio,
  hoje: string,
  agoraMin: number,
): PresencaRelatorioNormalizada | null {
  const entradaMin = minutos(p.entrada)
  if (entradaMin == null) return null
  const saidaInformada = minutos(p.saida)
  const saidaMin = saidaInformada != null && saidaInformada >= entradaMin ? saidaInformada : null
  const abertaHoje = p.data === hoje && p.saida == null
  const fimCalculoMin = saidaMin ?? (abertaHoje ? Math.max(entradaMin, Math.min(1440, agoraMin)) : null)
  return {
    ...p,
    entradaMin,
    saidaMin,
    fimCalculoMin,
    duracaoMin: fimCalculoMin == null ? null : Math.max(0, fimCalculoMin - entradaMin),
    incompleta: fimCalculoMin == null,
  }
}

function escolher<T>(itens: T[], comparar: (a: T, b: T) => number): T | null {
  if (itens.length === 0) return null
  return itens.slice(1).reduce((melhor, atual) => comparar(atual, melhor) < 0 ? atual : melhor, itens[0])
}

export function normalizarPeriodoGerencial(
  sp: { de?: string; ate?: string; mes?: string },
  hoje: string,
): { de: string; ate: string; erro: string | null } {
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes ?? '') ? sp.mes! : hoje.slice(0, 7)
  const padrao = periodoDoMes(mes)
  const de = dataISOValida(sp.de ?? '') ? sp.de! : padrao.de
  const ate = dataISOValida(sp.ate ?? '') ? sp.ate! : padrao.ate
  return { de, ate, erro: de > ate ? 'A data inicial não pode ser posterior à data final.' : null }
}

export function calcularRelatorioGerencial(
  entrada: PresencaRelatorio[],
  opcoes: { hoje: string; agoraMin: number },
): RelatorioGerencial {
  const presencas = entrada
    .map((p) => normalizarPresenca(p, opcoes.hoje, opcoes.agoraMin))
    .filter((p): p is PresencaRelatorioNormalizada => p != null)
    .sort((a, b) => a.data.localeCompare(b.data) || a.entradaMin - b.entradaMin)

  const porData = new Map<string, PresencaRelatorioNormalizada[]>()
  for (const p of presencas) porData.set(p.data, [...(porData.get(p.data) ?? []), p])

  const dias: ResumoDia[] = [...porData.entries()].map(([data, itens]) => {
    const intervalos = itens
      .filter((p) => p.fimCalculoMin != null)
      .map((p) => ({ inicio: p.entradaMin, fim: p.fimCalculoMin! }))
    const lotacao = pico(intervalos)
    const duracoes = itens.flatMap((p) => p.duracaoMin == null ? [] : [p.duracaoMin])
    const saidas = itens.flatMap((p) => p.saidaMin == null ? [] : [p.saidaMin])
    return {
      data,
      diaSemana: DIAS[numeroDiaSemana(data)],
      atendimentos: itens.length,
      criancasUnicas: new Set(itens.map((p) => p.criancaId || p.id)).size,
      primeiraEntrada: Math.min(...itens.map((p) => p.entradaMin)),
      ultimaSaida: saidas.length ? Math.max(...saidas) : null,
      picoSimultaneo: lotacao.valor,
      picoEm: lotacao.em,
      permanenciaMediaMin: duracoes.length ? duracoes.reduce((s, v) => s + v, 0) / duracoes.length : null,
      criancaHoras: duracoes.reduce((s, v) => s + v, 0) / 60,
      antes14: itens.filter((p) => p.entradaMin < 14 * 60).length,
      entre14e18: itens.filter((p) => p.entradaMin >= 14 * 60 && p.entradaMin < 18 * 60).length,
      apos18: itens.filter((p) => p.entradaMin >= 18 * 60).length,
      incompletas: itens.filter((p) => p.incompleta).length,
    }
  })

  const horarios: ResumoHorario[] = Array.from({ length: 24 }, (_, hora) => {
    const inicio = hora * 60
    const fim = inicio + 60
    let entradas = 0
    let saidas = 0
    let atendimentosNoHorario = 0
    let criancaMinutos = 0
    let picoSimultaneo = 0
    for (const itens of porData.values()) {
      const intervalos: { inicio: number; fim: number }[] = []
      for (const p of itens) {
        if (p.entradaMin >= inicio && p.entradaMin < fim) entradas++
        if (p.saidaMin != null && p.saidaMin >= inicio && p.saidaMin < fim) saidas++
        if (p.fimCalculoMin != null) {
          const sobreposicao = Math.max(0, Math.min(fim, p.fimCalculoMin) - Math.max(inicio, p.entradaMin))
          if (sobreposicao > 0) {
            atendimentosNoHorario++
            criancaMinutos += sobreposicao
            intervalos.push({ inicio: Math.max(inicio, p.entradaMin), fim: Math.min(fim, p.fimCalculoMin) })
          }
        }
      }
      picoSimultaneo = Math.max(picoSimultaneo, pico(intervalos).valor)
    }
    return { hora, entradas, saidas, atendimentosNoHorario, criancaHoras: criancaMinutos / 60, picoSimultaneo }
  })

  const diasSemana: ResumoDiaSemana[] = DIAS.map((label, dia) => {
    const doDia = presencas.filter((p) => numeroDiaSemana(p.data) === dia)
    const datas = new Set(doDia.map((p) => p.data))
    return {
      dia,
      label,
      diasComMovimento: datas.size,
      atendimentos: doDia.length,
      mediaPorDia: datas.size ? doDia.length / datas.size : 0,
      antes14: doDia.filter((p) => p.entradaMin < 14 * 60).length,
      entre14e18: doDia.filter((p) => p.entradaMin >= 14 * 60 && p.entradaMin < 18 * 60).length,
      apos18: doDia.filter((p) => p.entradaMin >= 18 * 60).length,
    }
  })

  const duracoes = presencas.flatMap((p) => p.duracaoMin == null ? [] : [p.duracaoMin])
  const diasComPico = dias.filter((d) => d.picoSimultaneo > 0)
  const horariosComEntrada = horarios.filter((h) => h.entradas > 0)
  return {
    presencas,
    dias,
    horarios,
    diasSemana,
    totalAtendimentos: presencas.length,
    criancasUnicas: new Set(presencas.map((p) => p.criancaId || p.id)).size,
    diasComMovimento: dias.length,
    mediaAtendimentosDia: dias.length ? presencas.length / dias.length : 0,
    permanenciaMediaMin: duracoes.length ? duracoes.reduce((s, v) => s + v, 0) / duracoes.length : null,
    criancaHoras: duracoes.reduce((s, v) => s + v, 0) / 60,
    incompletas: presencas.filter((p) => p.incompleta).length,
    diaMaisMovimento: escolher(dias, (a, b) => b.atendimentos - a.atendimentos || a.data.localeCompare(b.data)),
    diaMenosMovimento: escolher(dias, (a, b) => a.atendimentos - b.atendimentos || a.data.localeCompare(b.data)),
    picoLotacao: escolher(diasComPico, (a, b) => b.picoSimultaneo - a.picoSimultaneo || a.data.localeCompare(b.data)),
    menorPicoLotacao: escolher(diasComPico, (a, b) => a.picoSimultaneo - b.picoSimultaneo || a.data.localeCompare(b.data)),
    horarioMaisEntradas: escolher(horariosComEntrada, (a, b) => b.entradas - a.entradas || a.hora - b.hora),
  }
}

export function minutosComoHora(valor: number | null): string {
  if (valor == null) return '—'
  const minutosDia = Math.max(0, Math.min(1439, Math.round(valor)))
  return `${String(Math.floor(minutosDia / 60)).padStart(2, '0')}:${String(minutosDia % 60).padStart(2, '0')}`
}

export function duracaoHumana(valor: number | null): string {
  if (valor == null) return '—'
  const total = Math.max(0, Math.round(valor))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}
