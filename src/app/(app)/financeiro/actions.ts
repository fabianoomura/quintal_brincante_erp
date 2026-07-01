'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true; id: string } | { ok: false; erro: string }

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
