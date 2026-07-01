'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { gerarMensalidades } from '@/lib/mensalidades'
import { hojeISO } from '@/lib/datas'

export async function gerarMensalidadesAtual(): Promise<
  { ok: true; geradas: number; puladas: number } | { ok: false; erro: string }
> {
  const me = await getColaboradorAtual()
  if (me?.papel_acesso !== 'admin') return { ok: false, erro: 'Apenas admin.' }

  const [ano, mes] = hojeISO().split('-').map(Number)
  const sb = await createClient()
  const res = await gerarMensalidades(sb, ano, mes)

  revalidatePath('/financeiro')
  revalidatePath('/gerencial')
  return { ok: true, ...res }
}
