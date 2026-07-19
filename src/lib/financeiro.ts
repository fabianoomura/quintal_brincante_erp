export type CalculoDescontoBaixaInput = {
  valor: number
  descontoAtual: number
  descontoReais: number
  descontoAtivo: boolean
}

function dinheiro(valor: number): number {
  return Math.round(valor * 100) / 100
}

export function calcularDescontoBaixa(input: CalculoDescontoBaixaInput): number {
  const atual = Math.max(0, Number(input.descontoAtual) || 0)
  const pedido = Math.max(0, Number(input.descontoReais) || 0)

  if (!input.descontoAtivo || pedido === 0) return dinheiro(atual)

  const valor = Math.max(0, Number(input.valor) || 0)
  return dinheiro(Math.min(valor, atual + pedido))
}

export function valorLiquidoLancamento(valor: number, desconto: number): number {
  return dinheiro(Math.max(0, Number(valor) - Number(desconto)))
}

// Cortesia quita o lançamento para manter o histórico operacional, mas não é receita.
export function valorMovimentadoLancamento(
  valor: number,
  desconto: number,
  captureMethod: string | null,
): number {
  return captureMethod === 'cortesia' ? 0 : valorLiquidoLancamento(valor, desconto)
}
