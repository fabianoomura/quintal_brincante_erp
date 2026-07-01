'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { hojeISO } from '@/lib/datas'

type Resultado = { ok: true } | { ok: false; erro: string }

async function ehAdmin() {
  const me = await getColaboradorAtual()
  return me?.papel_acesso === 'admin'
}

export async function criarMatricula(input: {
  criancaId: string
  planoId: string
  valor: number
  diaVencimento: number
  diasSemana: number[]
  inicio: string
}): Promise<Resultado> {
  if (!(await ehAdmin())) return { ok: false, erro: 'Apenas admin faz matrícula.' }
  if (!input.planoId) return { ok: false, erro: 'Escolha um plano.' }
  if (!(input.valor > 0)) return { ok: false, erro: 'Informe o valor.' }
  if (input.diaVencimento < 1 || input.diaVencimento > 31)
    return { ok: false, erro: 'Dia de vencimento entre 1 e 31.' }

  const supabase = await createClient()

  // Mantém só uma matrícula ativa: encerra as anteriores.
  await supabase
    .from('mensalidade')
    .update({ ativo: false, fim: hojeISO() })
    .eq('crianca_id', input.criancaId)
    .eq('ativo', true)

  const { data, error } = await supabase
    .from('mensalidade')
    .insert({
      crianca_id: input.criancaId,
      plano_id: input.planoId,
      valor: input.valor,
      dia_vencimento: input.diaVencimento,
      dias_semana: input.diasSemana.length > 0 ? input.diasSemana : null,
      inicio: input.inicio || hojeISO(),
    })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão (admin).' }

  revalidatePath(`/criancas/${input.criancaId}`)
  return { ok: true }
}

export async function encerrarMatricula(
  mensalidadeId: string,
  criancaId: string,
): Promise<Resultado> {
  if (!(await ehAdmin())) return { ok: false, erro: 'Apenas admin.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mensalidade')
    .update({ ativo: false, fim: hojeISO() })
    .eq('id', mensalidadeId)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: 'Sem permissão.' }

  revalidatePath(`/criancas/${criancaId}`)
  return { ok: true }
}
