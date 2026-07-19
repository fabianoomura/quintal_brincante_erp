'use server'

import { revalidatePath } from 'next/cache'
import { getColaboradorAtual } from '@/lib/colaborador'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; erro: string }

export async function excluirOperacaoPlay(presencaId: string): Promise<Resultado> {
  const colaborador = await getColaboradorAtual()
  if (colaborador?.papel_acesso !== 'admin') {
    return { ok: false, erro: 'Apenas administradores podem excluir operações.' }
  }
  if (!presencaId) return { ok: false, erro: 'Operação não informada.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('excluir_operacao_play', {
    p_presenca_id: presencaId,
  })
  if (error) return { ok: false, erro: error.message }
  if (!data) return { ok: false, erro: 'Operação não encontrada.' }

  revalidatePath('/playground')
  revalidatePath('/financeiro')
  revalidatePath('/faturamento')
  revalidatePath('/gerencial')
  return { ok: true }
}
