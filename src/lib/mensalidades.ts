import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Data de vencimento no mês (ano, mes 1-12, dia desejado). Se o mês não tem o dia
// (ex.: 31 em fevereiro), usa o último dia do mês. Retorna 'YYYY-MM-DD'.
export function vencimentoDoMes(ano: number, mes: number, dia: number): string {
  const ultimoDia = new Date(ano, mes, 0).getDate() // dia 0 do mês seguinte = último dia
  const d = Math.min(Math.max(dia, 1), ultimoDia)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export type ResultadoGeracao = { geradas: number; puladas: number }

// Gera os lançamentos de mensalidade do mês a partir das matrículas ativas.
// Idempotente: não duplica lançamento p/ a mesma matrícula + vencimento.
// Não cobra antes da matrícula começar (inicio > vencimento → pula).
export async function gerarMensalidades(
  sb: SupabaseClient<Database>,
  ano: number,
  mes: number,
): Promise<ResultadoGeracao> {
  const { data: matriculas } = await sb
    .from('mensalidade')
    .select('id, crianca_id, valor, dia_vencimento, inicio')
    .eq('ativo', true)

  let geradas = 0
  let puladas = 0

  for (const m of matriculas ?? []) {
    const vencimento = vencimentoDoMes(ano, mes, m.dia_vencimento)

    if (m.inicio && m.inicio > vencimento) {
      puladas++
      continue
    }

    const { data: existe } = await sb
      .from('lancamento')
      .select('id')
      .eq('origem_tipo', 'mensalidade')
      .eq('origem_id', m.id)
      .eq('vencimento', vencimento)
      .limit(1)
      .maybeSingle()
    if (existe) {
      puladas++
      continue
    }

    const { error } = await sb.from('lancamento').insert({
      crianca_id: m.crianca_id,
      descricao: `Mensalidade ${String(mes).padStart(2, '0')}/${ano}`,
      valor: m.valor,
      vencimento,
      origem_tipo: 'mensalidade',
      origem_id: m.id,
    })
    if (error) {
      puladas++
      continue
    }
    geradas++
  }

  return { geradas, puladas }
}
