'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true; id: string } | { ok: false; erro: string }

// Lançamento AVULSO: cobrança que não se encaixa nos modelos (play/mensalidade/colônia).
export async function criarAvulso(input: {
  criancaId: string
  descricao: string
  valor: number
  vencimento: string
}): Promise<Resultado> {
  if (!input.criancaId) return { ok: false, erro: 'Selecione a criança.' }
  if (input.descricao.trim() === '') return { ok: false, erro: 'Descreva o lançamento.' }
  if (!(input.valor > 0)) return { ok: false, erro: 'Informe o valor.' }
  if (!input.vencimento) return { ok: false, erro: 'Informe o vencimento.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lancamento')
    .insert({
      crianca_id: input.criancaId,
      descricao: input.descricao.trim(),
      valor: input.valor,
      vencimento: input.vencimento,
      origem_tipo: 'avulso',
    })
    .select('id')
    .single()
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/financeiro')
  return { ok: true, id: data.id }
}

// Modalidades de recebimento manual (na tela/maquininha).
export const MODALIDADES = ['dinheiro', 'pix', 'cartao', 'maquininha'] as const
export type Modalidade = (typeof MODALIDADES)[number]

// Baixa manual: marca o lançamento como pago, registrando a MODALIDADE de recebimento
// (dinheiro/pix/cartão/maquininha) em capture_method. Só age em pendentes.
export async function baixaManual(
  lancamentoId: string,
  modalidade: Modalidade,
): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lancamento')
    .update({
      status: 'pago',
      conciliado_por: 'manual',
      capture_method: modalidade,
      pago_em: new Date().toISOString(),
    })
    .eq('id', lancamentoId)
    .eq('status', 'pendente')
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/financeiro')
  return { ok: true, id: lancamentoId }
}
