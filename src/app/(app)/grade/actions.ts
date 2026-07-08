'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'

// Salva a planilha inteira do play (células não vazias). Admin.
export async function salvarPrecos(
  celulas: { dia: number; hora: number; valor: number }[],
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const me = await getColaboradorAtual()
  if (me?.papel_acesso !== 'admin') return { ok: false, erro: 'Apenas admin.' }

  const invalida = celulas.find(
    (c) =>
      !Number.isInteger(c.dia) ||
      c.dia < 0 ||
      c.dia > 6 ||
      !Number.isInteger(c.hora) ||
      c.hora < 0 ||
      c.hora > 23 ||
      !Number.isFinite(c.valor) ||
      c.valor < 0,
  )
  if (invalida) return { ok: false, erro: 'A planilha tem um valor inválido.' }

  const supabase = await createClient()
  // regrava a planilha inteira (tabela pequena)
  const { error: errDel } = await supabase.from('preco_hora').delete().gte('hora', 0)
  if (errDel) return { ok: false, erro: errDel.message }

  const linhas = celulas
    .map((c) => ({
      dia_semana: c.dia,
      hora: c.hora,
      valor: Math.round(c.valor * 100) / 100,
    }))
  if (linhas.length > 0) {
    const { error } = await supabase.from('preco_hora').insert(linhas)
    if (error) return { ok: false, erro: error.message }
  }

  revalidatePath('/grade')
  revalidatePath('/calendario')
  return { ok: true }
}
