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

// Valida a saída informada à mão (check-out esquecido): formato HH:MM e depois da
// entrada, no MESMO dia da presença (o tarifador não cruza meia-noite).
export function validarSaidaManual(
  entrada: string,
  saida: string,
): { ok: true } | { ok: false; erro: string } {
  if (!/^\d{2}:\d{2}$/.test(saida)) {
    return { ok: false, erro: 'Horário de saída inválido (use HH:MM).' }
  }
  if (duracaoMinutos(entrada, saida) <= 0) {
    return { ok: false, erro: 'A saída precisa ser depois da entrada.' }
  }
  return { ok: true }
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
