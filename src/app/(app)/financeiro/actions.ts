'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Modalidade } from '@/lib/modalidades'
import { calcularDescontoBaixa } from '@/lib/financeiro'

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

// Baixa manual: marca pago, registrando a MODALIDADE (capture_method) e opcionalmente um
// DESCONTO em R$ (só se habilitado na config). Soma ao desconto já existente (ex.: irmão).
export async function baixaManual(
  lancamentoId: string,
  modalidade: Modalidade,
  descontoReais = 0,
): Promise<Resultado> {
  const supabase = await createClient()

  const { data: lanc } = await supabase
    .from('lancamento')
    .select('valor, desconto')
    .eq('id', lancamentoId)
    .maybeSingle()
  if (!lanc) return { ok: false, erro: 'Lançamento não encontrado.' }

  let descontoAtivo = false
  if (descontoReais > 0) {
    const { data: cfg } = await supabase
      .from('config_sistema')
      .select('desconto_ativo')
      .eq('id', 1)
      .maybeSingle()
    descontoAtivo = cfg?.desconto_ativo ?? false
  }
  const desc = calcularDescontoBaixa({
    valor: Number(lanc.valor),
    descontoAtual: Number(lanc.desconto),
    descontoReais,
    descontoAtivo,
  })

  const { data, error } = await supabase
    .from('lancamento')
    .update({
      status: 'pago',
      conciliado_por: 'manual',
      capture_method: modalidade,
      desconto: desc,
      pago_em: new Date().toISOString(),
    })
    .eq('id', lancamentoId)
    .eq('status', 'pendente')
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, erro: error.message }
  if (!data) return { ok: false, erro: 'Lançamento já recebido ou não está pendente.' }

  revalidatePath('/financeiro')
  return { ok: true, id: lancamentoId }
}
