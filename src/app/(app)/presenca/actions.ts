'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, agoraHora, diaDaSemana, horaParaMinutos } from '@/lib/datas'
import { valorHoraPlay } from '@/lib/grade'
import { precoProporcional, duracaoMinutos } from '@/lib/tarifador'
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

  // Play: trava a TARIFA/HORA pela planilha (dia+hora) — ou o valor do FERIADO da data.
  // O valor final (piso 1h + proporcional) é calculado no check-out.
  let tarifaHora: number | null = null
  if (input.origem === 'espaco_kids') {
    const horaMin = horaParaMinutos(input.entrada)
    const [{ data: precos }, { data: fer }] = await Promise.all([
      supabase.from('preco_hora').select('dia_semana, hora, valor'),
      supabase.from('feriado').select('valor').eq('data', data).eq('ativo', true).maybeSingle(),
    ])
    if (fer?.valor != null) {
      tarifaHora = Number(fer.valor) // feriado tem valor próprio
    } else {
      tarifaHora = valorHoraPlay(
        diaDaSemana(data),
        horaMin,
        (precos ?? []).map((p) => ({ ...p, valor: Number(p.valor) })),
      )
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
      tarifa_hora: tarifaHora,
    })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/presenca')
  revalidatePath('/playground')
  revalidatePath('/kiosk')
  return { ok: true, id: novo.id }
}

// Check-out: marca a saída e calcula o valor do play (piso 1h + proporcional) pela
// tarifa/hora travada no check-in. Gera o lançamento pendente.
export async function checkOut(presencaId: string): Promise<ResultadoCheckout> {
  const supabase = await createClient()
  const saida = agoraHora()

  const { data: p, error: errP } = await supabase
    .from('presenca')
    .select('id, crianca_id, data, origem, entrada, saida, tarifa_hora')
    .eq('id', presencaId)
    .maybeSingle()
  if (errP) return { ok: false, erro: errP.message }
  if (!p) return { ok: false, erro: 'Presença não encontrada.' }
  if (p.saida) return { ok: false, erro: 'Essa presença já teve check-out.' }

  const valor: number | null =
    p.origem === 'espaco_kids' && p.tarifa_hora != null
      ? precoProporcional(Math.ceil(duracaoMinutos(p.entrada, saida)), Number(p.tarifa_hora))
      : null

  const { error: errU } = await supabase
    .from('presenca')
    .update({ saida, valor })
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
