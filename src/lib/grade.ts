import { horaParaMinutos } from '@/lib/datas'

// Grade do play: preço FIXO por período (dia da semana + janela de horário). Puro e testável.
export type SlotGrade = {
  id: string
  nome: string
  dias_semana: number[] // 0=dom..6=sáb
  hora_inicio: string // 'HH:MM(:SS)'
  hora_fim: string
  valor: number
  capacidade: number | null
}

// Encontra o slot da grade para um dia da semana (0-6) e uma hora (minutos do dia).
// Janela [inicio, fim). Retorna o primeiro que casar, ou null (fora de horário).
export function encontrarSlot(
  diaSemana: number,
  horaMin: number,
  grade: SlotGrade[],
): SlotGrade | null {
  for (const s of grade) {
    if (!s.dias_semana.includes(diaSemana)) continue
    const ini = horaParaMinutos(s.hora_inicio)
    const fim = horaParaMinutos(s.hora_fim)
    if (horaMin >= ini && horaMin < fim) return s
  }
  return null
}
