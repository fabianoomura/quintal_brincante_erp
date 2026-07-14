import { duracaoMinutos, precoHoraCheia } from './tarifador'

export type CheckoutPlayInput = {
  origem: 'espaco_kids' | 'diaria' | 'mensalista' | 'colonia'
  entrada: string
  saida: string
  tarifaHora: number | null
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

    // Hora iniciada conta cheia; o tempo contratado NÃO muda o valor (só o aviso).
    const decorrido = Math.ceil(duracaoMinutos(input.entrada, input.saida))
    return precoHoraCheia(decorrido, Number(input.tarifaHora), input.toleranciaMin)
  }

  if (input.valorDiaria != null) return Number(input.valorDiaria)
  return null
}
