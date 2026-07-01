// Tarifador do play — modelo "estacionamento" (spec §6).
// Função PURA: piso de 1h; horas cheias + fração arredondada pra cima; calculada no check-out.
// Dinheiro em centavos (inteiro) para nunca usar float. Os VALORES da tarifa vêm da tabela
// `tarifa` (config) — aqui nada é hardcode de regra de negócio.

export type TarifaCalculo = {
  minimo_minutos: number // piso de cobrança (ex.: 60)
  valor_hora: number // reais por hora cheia
  tamanho_fracao_min: number // tamanho da fração (ex.: 30)
  valor_fracao: number // reais por fração iniciada
}

// Minutos entre dois horários 'HH:MM' ou 'HH:MM:SS'. Fração de minuto conta como minuto cheio
// no cálculo (ceil aplicado em calcularValorPlay). Mesmo dia (MVP).
export function duracaoMinutos(entrada: string, saida: string): number {
  const min = (t: string) => {
    const [h, m, s = '0'] = t.split(':')
    return Number(h) * 60 + Number(m) + Number(s) / 60
  }
  return min(saida) - min(entrada)
}

function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100)
}

export type ResultadoPlay = {
  minutosCobrados: number
  valorCentavos: number
  valor: number // reais (2 casas)
}

export function calcularValorPlay(
  entrada: string,
  saida: string,
  tarifa: TarifaCalculo,
): ResultadoPlay {
  const brutos = Math.max(0, duracaoMinutos(entrada, saida))
  const minutos = Math.max(Math.ceil(brutos), tarifa.minimo_minutos)

  const horasCheias = Math.floor(minutos / 60)
  const resto = minutos - horasCheias * 60

  let centavos = horasCheias * reaisParaCentavos(tarifa.valor_hora)
  if (resto > 0) {
    const fracoes = Math.ceil(resto / tarifa.tamanho_fracao_min)
    centavos += fracoes * reaisParaCentavos(tarifa.valor_fracao)
  }

  return {
    minutosCobrados: minutos,
    valorCentavos: centavos,
    valor: centavos / 100,
  }
}
