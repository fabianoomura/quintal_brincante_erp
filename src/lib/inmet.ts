import type { ClimaPlay } from './viabilidade'

const INMET_BASE = 'https://wis2bra.inmet.gov.br/oapi/collections/urn:wmo:md:br-inmet:synop/items'

export const INMET_ESTACAO_LONDRINA = '0-20000-0-83768'
export const INMET_ESTACAO_LONDRINA_LABEL = 'INMET · Londrina/Aeroporto (83768)'

const VARIAVEIS = [
  'air_temperature',
  'cloud_cover_total',
  'total_precipitation_or_total_water_equivalent',
] as const

type VariavelInmet = typeof VARIAVEIS[number]

export type ObservacaoInmet = {
  name: string
  reportTime: string
  value: number | null
}

export type ClimaHistoricoDia = {
  data: string
  clima: ClimaPlay | null
  temperaturaMedia: number | null
}

type RespostaInmet = {
  numberMatched?: number
  numberReturned?: number
  features?: Array<{
    properties?: ObservacaoInmet
  }>
}

type AcumuladoDia = {
  temperaturas: number[]
  nebulosidades: number[]
  precipitacaoMaxima: number | null
}

const FORMATADOR_DATA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function media(valores: number[]): number | null {
  if (!valores.length) return null
  return valores.reduce((total, valor) => total + valor, 0) / valores.length
}

function arredondar(valor: number | null, casas: number): number | null {
  if (valor == null) return null
  const fator = 10 ** casas
  return Math.round(valor * fator) / fator
}

function dataLocal(dataHora: string): string | null {
  const data = new Date(dataHora)
  if (Number.isNaN(data.getTime())) return null
  const partes = Object.fromEntries(
    FORMATADOR_DATA.formatToParts(data).map((parte) => [parte.type, parte.value]),
  )
  return partes.year && partes.month && partes.day
    ? `${partes.year}-${partes.month}-${partes.day}`
    : null
}

export function classificarClimaInmet(
  precipitacaoMaxima: number | null,
  nebulosidadeMedia: number | null,
): ClimaPlay | null {
  if (precipitacaoMaxima != null && precipitacaoMaxima >= 20) return 'tempestade'
  if (precipitacaoMaxima != null && precipitacaoMaxima >= 2) return 'chuva'
  if (precipitacaoMaxima != null && precipitacaoMaxima > 0) return 'garoa'
  if (nebulosidadeMedia == null) return null
  if (nebulosidadeMedia >= 75) return 'nublado'
  if (nebulosidadeMedia >= 25) return 'sol_entre_nuvens'
  return 'sol'
}

export function agruparObservacoesInmet(observacoes: ObservacaoInmet[]): ClimaHistoricoDia[] {
  const porDia = new Map<string, AcumuladoDia>()

  for (const observacao of observacoes) {
    if (!Number.isFinite(observacao.value)) continue
    const data = dataLocal(observacao.reportTime)
    if (!data) continue
    const dia = porDia.get(data) ?? {
      temperaturas: [],
      nebulosidades: [],
      precipitacaoMaxima: null,
    }
    const valor = Number(observacao.value)
    if (observacao.name === 'air_temperature') dia.temperaturas.push(valor)
    if (observacao.name === 'cloud_cover_total') dia.nebulosidades.push(valor)
    if (observacao.name === 'total_precipitation_or_total_water_equivalent') {
      dia.precipitacaoMaxima = Math.max(dia.precipitacaoMaxima ?? 0, valor)
    }
    porDia.set(data, dia)
  }

  return [...porDia.entries()]
    .sort(([dataA], [dataB]) => dataA.localeCompare(dataB))
    .map(([data, dia]) => {
      const nebulosidadeMedia = media(dia.nebulosidades)
      return {
        data,
        clima: classificarClimaInmet(dia.precipitacaoMaxima, nebulosidadeMedia),
        temperaturaMedia: arredondar(media(dia.temperaturas), 1),
      }
    })
}

function fimDoDiaEmUtc(ate: string): string {
  const fim = new Date(`${ate}T03:00:00.000Z`)
  fim.setUTCDate(fim.getUTCDate() + 1)
  fim.setUTCMilliseconds(-1)
  return fim.toISOString()
}

async function buscarSerie(de: string, ate: string, nome: VariavelInmet): Promise<ObservacaoInmet[]> {
  const url = new URL(INMET_BASE)
  url.searchParams.set('f', 'json')
  url.searchParams.set('limit', '10000')
  url.searchParams.set('wigos_station_identifier', INMET_ESTACAO_LONDRINA)
  url.searchParams.set('datetime', `${de}T03:00:00.000Z/${fimDoDiaEmUtc(ate)}`)
  url.searchParams.set('name', nome)

  const resposta = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/geo+json, application/json' },
    signal: AbortSignal.timeout(25_000),
  })
  if (!resposta.ok) throw new Error(`INMET respondeu ${resposta.status}`)
  const corpo = await resposta.json() as RespostaInmet
  const observacoes = (corpo.features ?? [])
    .flatMap((feature) => feature.properties ? [feature.properties] : [])
    .filter((item) => item.name === nome)
  if ((corpo.numberMatched ?? 0) > observacoes.length) {
    throw new Error('O período excedeu o limite de observações do INMET.')
  }
  return observacoes
}

export async function buscarClimaHistoricoInmet(de: string, ate: string): Promise<ClimaHistoricoDia[]> {
  const series = await Promise.all(VARIAVEIS.map((nome) => buscarSerie(de, ate, nome)))
  return agruparObservacoesInmet(series.flat())
}
