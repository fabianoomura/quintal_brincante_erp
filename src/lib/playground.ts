import { duracaoMinutos, precoHoraCheia } from './tarifador'

export type CheckoutPlayInput = {
  origem: 'espaco_kids' | 'diaria' | 'mensalista' | 'colonia'
  entrada: string
  saida: string
  tarifaHora: number | null
  toleranciaMin: number
  valorDiaria?: number | null
  pausaMin?: number // minutos pausados no play — descontam do tempo cobrado
}

// Segundos totais em pausa de uma presença: o acumulado das pausas já retomadas
// mais a pausa em curso (se `pausadaEmMs` não for nulo). Puro/testável — o "agora"
// entra por parâmetro (cliente usa Date.now do navegador; servidor, o do servidor).
export function pausaSegundos(
  pausaTotalSeg: number | null,
  pausadaEmMs: number | null,
  agoraMs: number,
): number {
  const emCurso = pausadaEmMs != null ? Math.max(0, (agoraMs - pausadaEmMs) / 1000) : 0
  return (pausaTotalSeg ?? 0) + emCurso
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
    // O tempo pausado é descontado antes de arredondar (piso de 1h continua valendo).
    const decorrido = Math.max(
      0,
      Math.ceil(duracaoMinutos(input.entrada, input.saida) - (input.pausaMin ?? 0)),
    )
    return precoHoraCheia(decorrido, Number(input.tarifaHora), input.toleranciaMin)
  }

  if (input.valorDiaria != null) return Number(input.valorDiaria)
  return null
}
