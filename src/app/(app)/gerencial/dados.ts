import { createClient } from '@/lib/supabase/server'
import type { PresencaRelatorio } from '@/lib/gerencial-relatorio'

export async function buscarPresencasRelatorio(
  de: string,
  ate: string,
): Promise<{ data: PresencaRelatorio[]; erro: string | null }> {
  const supabase = await createClient()
  const resultado: PresencaRelatorio[] = []
  const lote = 1000

  for (let inicio = 0; ; inicio += lote) {
    const { data, error } = await supabase
      .from('presenca')
      .select('id, data, entrada, saida, origem, crianca_id, crianca:crianca_id (nome)')
      .gte('data', de)
      .lte('data', ate)
      .order('data', { ascending: true })
      .order('entrada', { ascending: true })
      .range(inicio, inicio + lote - 1)

    if (error) return { data: [], erro: error.message }
    for (const p of data ?? []) {
      resultado.push({
        id: p.id,
        data: p.data,
        entrada: p.entrada,
        saida: p.saida,
        origem: p.origem,
        criancaId: p.crianca_id,
        criancaNome: p.crianca?.nome ?? '',
      })
    }
    if (!data || data.length < lote) break
  }

  return { data: resultado, erro: null }
}
