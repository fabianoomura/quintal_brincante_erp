'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true; id: string } | { ok: false; erro: string }

// Baixa manual (maquininha física): marca o lançamento como pago.
// conciliado_por='manual' + pago_em=agora (spec §8). Só age em pendentes.
export async function baixaManual(lancamentoId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lancamento')
    .update({
      status: 'pago',
      conciliado_por: 'manual',
      pago_em: new Date().toISOString(),
    })
    .eq('id', lancamentoId)
    .eq('status', 'pendente')
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/financeiro')
  return { ok: true, id: lancamentoId }
}
