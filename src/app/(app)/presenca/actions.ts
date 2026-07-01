'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, agoraHora, diaDaSemana, horaParaMinutos } from '@/lib/datas'
import { encontrarSlot, dentroDeAlgumPeriodo } from '@/lib/grade'
import { feriadosNacionais } from '@/lib/feriados'
import type { Database } from '@/lib/database.types'

type Origem = Database['public']['Enums']['origem_presenca']

type Resultado = { ok: true; id: string } | { ok: false; erro: string }
type ResultadoCheckout =
  | { ok: true; id: string; valor: number | null }
  | { ok: false; erro: string }

export type CheckInInput = {
  criancaId: string
  origem: Origem
  entrada: string // 'HH:MM'
  tempoContratadoMin: number | null // só faz sentido p/ espaco_kids
  ambienteId?: string | null // opcional (sala/espaço)
}

export async function checkIn(input: CheckInInput): Promise<Resultado> {
  if (!input.criancaId) return { ok: false, erro: 'Selecione uma criança.' }
  if (!input.entrada) return { ok: false, erro: 'Informe o horário de entrada.' }

  const supabase = await createClient()
  const data = hojeISO()

  // Play: preço FIXO por período (grade) — ou valor único de FERIADO (nacional ou local).
  let valor: number | null = null
  if (input.origem === 'espaco_kids') {
    const horaMin = horaParaMinutos(input.entrada)
    const [{ data: gradeRows }, { data: cfg }, { data: fl }] = await Promise.all([
      supabase
        .from('grade_play')
        .select('id, nome, dias_semana, hora_inicio, hora_fim, valor, capacidade')
        .eq('ativo', true),
      supabase.from('config_sistema').select('valor_feriado').eq('id', 1).maybeSingle(),
      supabase.from('feriado').select('data').eq('data', data).eq('ativo', true).maybeSingle(),
    ])
    const grade = (gradeRows ?? []).map((g) => ({ ...g, valor: Number(g.valor) }))
    const valorFeriado = cfg?.valor_feriado != null ? Number(cfg.valor_feriado) : null
    const ehFeriado = !!fl || feriadosNacionais(Number(data.slice(0, 4))).has(data)

    if (ehFeriado && valorFeriado != null && dentroDeAlgumPeriodo(horaMin, grade)) {
      // feriado: valor único, respeitando o horário de funcionamento (sem cap por período)
      valor = valorFeriado
    } else {
      const slot = encontrarSlot(diaDaSemana(data), horaMin, grade)
      if (slot) {
        valor = slot.valor
        if (slot.capacidade != null) {
          const { data: doDia } = await supabase
            .from('presenca')
            .select('entrada')
            .eq('data', data)
            .eq('origem', 'espaco_kids')
          const ini = horaParaMinutos(slot.hora_inicio)
          const fim = horaParaMinutos(slot.hora_fim)
          const noPeriodo = (doDia ?? []).filter((p) => {
            const m = horaParaMinutos(p.entrada)
            return m >= ini && m < fim
          }).length
          if (noPeriodo >= slot.capacidade) {
            return { ok: false, erro: `Período "${slot.nome}" lotado (${noPeriodo}/${slot.capacidade}).` }
          }
        }
      }
    }
  }

  const { data: novo, error } = await supabase
    .from('presenca')
    .insert({
      crianca_id: input.criancaId,
      data,
      entrada: input.entrada,
      origem: input.origem,
      tempo_contratado_min:
        input.origem === 'espaco_kids' ? input.tempoContratadoMin : null,
      ambiente_id: input.ambienteId ?? null,
      valor,
    })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/presenca')
  revalidatePath('/playground')
  revalidatePath('/kiosk')
  return { ok: true, id: novo.id }
}

// Check-out: marca a saída. O valor do play já foi fixado no check-in (grade do período);
// aqui só registramos a saída e geramos o lançamento pendente.
export async function checkOut(presencaId: string): Promise<ResultadoCheckout> {
  const supabase = await createClient()
  const saida = agoraHora()

  const { data: p, error: errP } = await supabase
    .from('presenca')
    .select('id, crianca_id, data, origem, saida, valor')
    .eq('id', presencaId)
    .maybeSingle()
  if (errP) return { ok: false, erro: errP.message }
  if (!p) return { ok: false, erro: 'Presença não encontrada.' }
  if (p.saida) return { ok: false, erro: 'Essa presença já teve check-out.' }

  const valor: number | null =
    p.origem === 'espaco_kids' && p.valor != null ? Number(p.valor) : null

  const { error: errU } = await supabase
    .from('presenca')
    .update({ saida })
    .eq('id', presencaId)
    .is('saida', null)
  if (errU) return { ok: false, erro: errU.message }

  // Gera lançamento pendente para o play (valor fixado no check-in).
  if (valor !== null) {
    const { error: errL } = await supabase.from('lancamento').insert({
      crianca_id: p.crianca_id,
      descricao: `Play — ${p.data}`,
      valor,
      vencimento: p.data,
      origem_tipo: 'presenca',
      origem_id: p.id,
    })
    if (errL) return { ok: false, erro: errL.message }
  }

  revalidatePath('/presenca')
  revalidatePath('/playground')
  revalidatePath('/financeiro')
  return { ok: true, id: presencaId, valor }
}
