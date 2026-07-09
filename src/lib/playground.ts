import { duracaoMinutos, minutosCobraveis, precoProporcional } from './tarifador'

export type CheckoutPlayInput = {
  origem: 'espaco_kids' | 'diaria' | 'mensalista' | 'colonia'
  entrada: string
  saida: string
  tarifaHora: number | null
  tempoContratadoMin: number | null
  toleranciaMin: number
  valorDiaria?: number | null
}

export function calcularValorCheckout(input: CheckoutPlayInput): number | null {
  if (input.origem === 'espaco_kids') {
    if (input.tarifaHora == null) return null

    const decorrido = Math.ceil(duracaoMinutos(input.entrada, input.saida))
    const cobraveis = minutosCobraveis(
      decorrido,
      input.tempoContratadoMin,
      input.toleranciaMin,
    )
    return precoProporcional(cobraveis, Number(input.tarifaHora))
  }

  if (input.valorDiaria != null) return Number(input.valorDiaria)
  return null
}
