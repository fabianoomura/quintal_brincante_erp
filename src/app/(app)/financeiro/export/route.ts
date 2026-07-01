import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type StatusLancamento = Database['public']['Enums']['status_lancamento']

// Exportação de conciliação (spec §8). Colunas:
// data · criança · descrição · origem · valor · vencimento · status · método ·
// transaction_nsu · pago_em · recibo
// Filtros: período (de/até em vencimento) e status (pendente/pago/todos).

const COLUNAS = [
  'data',
  'criança',
  'descrição',
  'origem',
  'valor',
  'vencimento',
  'status',
  'método',
  'transaction_nsu',
  'pago_em',
  'recibo',
]

// Escapa um campo para CSV com separador ';'.
function celula(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Valor em pt-BR (vírgula decimal) sem separador de milhar, p/ conciliação.
function valorBR(v: number | string | null): string {
  if (v == null) return ''
  return Number(v).toFixed(2).replace('.', ',')
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? 'pendente'
  const de = url.searchParams.get('de') ?? ''
  const ate = url.searchParams.get('ate') ?? ''

  const supabase = await createClient()
  let query = supabase
    .from('lancamento')
    .select(
      'created_at, descricao, origem_tipo, valor, vencimento, status, capture_method, transaction_nsu, pago_em, receipt_url, crianca:crianca_id (nome)',
    )
    .order('vencimento', { ascending: true })
  if (status !== 'todos') query = query.eq('status', status as StatusLancamento)
  if (de) query = query.gte('vencimento', de)
  if (ate) query = query.lte('vencimento', ate)

  const { data, error } = await query
  if (error) {
    return new Response(`Erro: ${error.message}`, { status: 500 })
  }

  const linhas = (data ?? []).map((l) =>
    [
      (l.created_at ?? '').slice(0, 10),
      l.crianca?.nome ?? '',
      l.descricao,
      l.origem_tipo ?? '',
      valorBR(l.valor),
      l.vencimento,
      l.status,
      l.capture_method ?? '',
      l.transaction_nsu ?? '',
      l.pago_em ?? '',
      l.receipt_url ?? '',
    ]
      .map(celula)
      .join(';'),
  )

  // BOM p/ o Excel reconhecer UTF-8 (acentos).
  const csv = '﻿' + [COLUNAS.join(';'), ...linhas].join('\r\n') + '\r\n'
  const hoje = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="conciliacao_${status}_${hoje}.csv"`,
    },
  })
}
