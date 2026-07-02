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

// Índice do irmão dentro da família (0 = 1º filho/full; >=1 = ganha desconto).
// Agrupa por familyKey e ordena por 'ordem' (ex.: início da matrícula).
export function indicesIrmaos(
  itens: { id: string; familyKey: string; ordem: string }[],
): Record<string, number> {
  const grupos: Record<string, { id: string; familyKey: string; ordem: string }[]> = {}
  for (const it of itens) (grupos[it.familyKey] ??= []).push(it)
  const res: Record<string, number> = {}
  for (const k of Object.keys(grupos)) {
    grupos[k].sort((a, b) => a.ordem.localeCompare(b.ordem) || a.id.localeCompare(b.id))
    grupos[k].forEach((it, i) => (res[it.id] = i))
  }
  return res
}

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

  // desconto por irmão (2º filho+): % da config + índice do irmão por família (responsável/CPF)
  const { data: cfg } = await sb
    .from('config_sistema')
    .select('desconto_irmao_percentual')
    .eq('id', 1)
    .maybeSingle()
  const pct = cfg?.desconto_irmao_percentual != null ? Number(cfg.desconto_irmao_percentual) : 0
  const indices: Record<string, number> = {}
  if (pct > 0 && (matriculas ?? []).length > 0) {
    const childIds = (matriculas ?? []).map((m) => m.crianca_id)
    const { data: vincs } = await sb
      .from('crianca_contato')
      .select('crianca_id, contato:contato_id (id, cpf)')
      .eq('papel', 'responsavel')
      .in('crianca_id', childIds)
    const familyKey = new Map<string, string>()
    for (const v of vincs ?? []) {
      if (!familyKey.has(v.crianca_id)) {
        familyKey.set(v.crianca_id, v.contato?.cpf ? `cpf:${v.contato.cpf}` : `c:${v.contato?.id}`)
      }
    }
    Object.assign(
      indices,
      indicesIrmaos(
        (matriculas ?? []).map((m) => ({
          id: m.id,
          familyKey: familyKey.get(m.crianca_id) ?? `x:${m.crianca_id}`,
          ordem: m.inicio ?? '',
        })),
      ),
    )
  }

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

    const desconto = pct > 0 && (indices[m.id] ?? 0) >= 1 ? Math.round(Number(m.valor) * pct) / 100 : 0

    const { error } = await sb.from('lancamento').insert({
      crianca_id: m.crianca_id,
      descricao: `Mensalidade ${String(mes).padStart(2, '0')}/${ano}`,
      valor: m.valor,
      desconto,
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
