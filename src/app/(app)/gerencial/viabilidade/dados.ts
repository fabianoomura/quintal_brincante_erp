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
    .select('data, aberto, abertura, fechamento, pessoas, custo_pessoal, custo_alimentacao, outros_custos, clima, temperatura_media, observacao')
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
      custoAlimentacao: Number(o.custo_alimentacao),
      outrosCustos: Number(o.outros_custos),
      clima: o.clima as OperacaoPlayDia['clima'],
      temperaturaMedia: o.temperatura_media == null ? null : Number(o.temperatura_media),
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
  const porData = new Map<string, { gerado: number; recebido: number; pendente: number }>()
  const lote = 1000

  for (let inicio = 0; ; inicio += lote) {
    const { data, error } = await supabase
      .from('lancamento')
      .select('vencimento, valor, desconto, capture_method, status')
      .eq('origem_tipo', 'presenca')
      .in('status', ['pago', 'pendente'])
      .gte('vencimento', de)
      .lte('vencimento', ate)
      .order('vencimento', { ascending: true })
      .range(inicio, inicio + lote - 1)

    if (error) return { data: [], erro: error.message }
    for (const l of data ?? []) {
      const valor = valorMovimentadoLancamento(Number(l.valor), Number(l.desconto), l.capture_method)
      const atual = porData.get(l.vencimento) ?? { gerado: 0, recebido: 0, pendente: 0 }
      atual.gerado += valor
      if (l.status === 'pago') atual.recebido += valor
      else atual.pendente += valor
      porData.set(l.vencimento, atual)
    }
    if (!data || data.length < lote) break
  }

  return {
    data: [...porData.entries()].map(([data, valores]) => ({ data, ...valores })),
    erro: null,
  }
}
