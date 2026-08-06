import { valorMovimentadoLancamento } from '@/lib/financeiro'
import { createClient } from '@/lib/supabase/server'
import type { OperacaoPlayDia, ReceitaPlayDia } from '@/lib/viabilidade'

export async function buscarOperacoesPlay(
  de: string,
  ate: string,
): Promise<{ data: OperacaoPlayDia[]; erro: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operacao_play_dia')
    .select('data, aberto, abertura, fechamento, pessoas, custo_pessoal, outros_custos, observacao')
    .gte('data', de)
    .lte('data', ate)
    .order('data', { ascending: true })

  if (error) return { data: [], erro: error.message }
  return {
    data: (data ?? []).map((o) => ({
      data: o.data,
      aberto: o.aberto,
      abertura: o.abertura,
      fechamento: o.fechamento,
      pessoas: Number(o.pessoas),
      custoPessoal: o.custo_pessoal == null ? null : Number(o.custo_pessoal),
      outrosCustos: Number(o.outros_custos),
      observacao: o.observacao,
    })),
    erro: null,
  }
}

export async function buscarReceitasPlay(
  de: string,
  ate: string,
): Promise<{ data: ReceitaPlayDia[]; erro: string | null }> {
  const supabase = await createClient()
  const porData = new Map<string, number>()
  const lote = 1000

  for (let inicio = 0; ; inicio += lote) {
    const { data, error } = await supabase
      .from('lancamento')
      .select('vencimento, valor, desconto, capture_method')
      .eq('origem_tipo', 'presenca')
      .eq('status', 'pago')
      .gte('vencimento', de)
      .lte('vencimento', ate)
      .order('vencimento', { ascending: true })
      .range(inicio, inicio + lote - 1)

    if (error) return { data: [], erro: error.message }
    for (const l of data ?? []) {
      const valor = valorMovimentadoLancamento(Number(l.valor), Number(l.desconto), l.capture_method)
      porData.set(l.vencimento, (porData.get(l.vencimento) ?? 0) + valor)
    }
    if (!data || data.length < lote) break
  }

  return {
    data: [...porData.entries()].map(([data, valor]) => ({ data, valor })),
    erro: null,
  }
}
