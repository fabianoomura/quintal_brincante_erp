'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hojeISO, agoraHora } from '@/lib/datas'
import { calcularValorPlay } from '@/lib/tarifador'
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
  const { data, error } = await supabase
    .from('presenca')
    .insert({
      crianca_id: input.criancaId,
      data: hojeISO(),
      entrada: input.entrada,
      origem: input.origem,
      tempo_contratado_min:
        input.origem === 'espaco_kids' ? input.tempoContratadoMin : null,
      ambiente_id: input.ambienteId ?? null,
    })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/presenca')
  return { ok: true, id: data.id }
}

// Check-out: marca a saída. Para o play (espaco_kids), calcula o valor pelo tarifador
// (tarifa ativa), grava em presenca.valor e gera um lançamento pendente.
export async function checkOut(presencaId: string): Promise<ResultadoCheckout> {
  const supabase = await createClient()
  const saida = agoraHora()

  const { data: p, error: errP } = await supabase
    .from('presenca')
    .select('id, crianca_id, data, entrada, origem, saida')
    .eq('id', presencaId)
    .maybeSingle()
  if (errP) return { ok: false, erro: errP.message }
  if (!p) return { ok: false, erro: 'Presença não encontrada.' }
  if (p.saida) return { ok: false, erro: 'Essa presença já teve check-out.' }

  let valor: number | null = null

  if (p.origem === 'espaco_kids') {
    const { data: tarifa, error: errT } = await supabase
      .from('tarifa')
      .select('minimo_minutos, valor_hora, tamanho_fracao_min, valor_fracao')
      .eq('ativo', true)
      .limit(1)
      .maybeSingle()
    if (errT) return { ok: false, erro: errT.message }
    if (!tarifa) return { ok: false, erro: 'Nenhuma tarifa ativa configurada.' }

    valor = calcularValorPlay(p.entrada, saida, {
      minimo_minutos: tarifa.minimo_minutos,
      valor_hora: Number(tarifa.valor_hora),
      tamanho_fracao_min: tarifa.tamanho_fracao_min,
      valor_fracao: Number(tarifa.valor_fracao),
    }).valor
  }

  const { error: errU } = await supabase
    .from('presenca')
    .update({ saida, valor })
    .eq('id', presencaId)
    .is('saida', null)
  if (errU) return { ok: false, erro: errU.message }

  // Gera lançamento pendente para as presenças pagas com valor calculado (play).
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
