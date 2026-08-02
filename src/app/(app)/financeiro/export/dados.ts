import { createClient } from '@/lib/supabase/server'
import type { ModalidadeFinanceiro, OrigemFinanceiro, StatusFinanceiro } from '@/lib/financeiro-filtros'

export type FiltrosRelatorio = {
  status: StatusFinanceiro
  origem: OrigemFinanceiro
  modalidade: ModalidadeFinanceiro
  de: string
  ate: string
}

export type LancamentoRelatorio = {
  id: string
  createdAt: string
  crianca: string
  descricao: string
  origem: string
  valor: number
  desconto: number
  vencimento: string
  status: string
  modalidade: string | null
  transactionNsu: string | null
  pagoEm: string | null
  recibo: string | null
}

export async function buscarLancamentosRelatorio(
  filtros: FiltrosRelatorio,
): Promise<{ data: LancamentoRelatorio[]; erro: string | null }> {
  const supabase = await createClient()
  const resultado: LancamentoRelatorio[] = []
  const lote = 1000

  for (let inicio = 0; ; inicio += lote) {
    let query = supabase
      .from('lancamento')
      .select(
        'id, created_at, descricao, origem_tipo, valor, desconto, vencimento, status, capture_method, transaction_nsu, pago_em, receipt_url, crianca:crianca_id (nome)',
      )
      .order('vencimento', { ascending: true })
      .order('created_at', { ascending: true })
      .range(inicio, inicio + lote - 1)
    if (filtros.status !== 'todos') query = query.eq('status', filtros.status)
    if (filtros.origem !== 'todos') query = query.eq('origem_tipo', filtros.origem)
    if (filtros.modalidade !== 'todos') query = query.eq('capture_method', filtros.modalidade)
    if (filtros.de) query = query.gte('vencimento', filtros.de)
    if (filtros.ate) query = query.lte('vencimento', filtros.ate)

    const { data, error } = await query
    if (error) return { data: [], erro: error.message }
    for (const l of data ?? []) {
      resultado.push({
        id: l.id,
        createdAt: l.created_at,
        crianca: l.crianca?.nome ?? '',
        descricao: l.descricao,
        origem: l.origem_tipo ?? '',
        valor: Number(l.valor),
        desconto: Number(l.desconto),
        vencimento: l.vencimento,
        status: l.status,
        modalidade: l.capture_method,
        transactionNsu: l.transaction_nsu,
        pagoEm: l.pago_em,
        recibo: l.receipt_url,
      })
    }
    if (!data || data.length < lote) break
  }

  return { data: resultado, erro: null }
}
