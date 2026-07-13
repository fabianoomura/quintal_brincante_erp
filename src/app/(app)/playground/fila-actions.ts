'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hojeISO } from '@/lib/datas'
import { processarFila } from '@/lib/fila-processar'
import { getSender } from '@/lib/whatsapp/adapter'

type Resultado = { ok: true } | { ok: false; erro: string }

function refresh() {
  revalidatePath('/playground')
  revalidatePath('/kiosk')
}

// Coloca a criança na fila de espera do play. Se houver vaga sobrando, o processamento
// já a chama na sequência (com o aviso no WhatsApp).
export async function entrarNaFila(criancaId: string): Promise<Resultado> {
  if (!criancaId) return { ok: false, erro: 'Selecione uma criança.' }
  try {
    const supabase = await createClient()

    const { data: aberta } = await supabase
      .from('presenca')
      .select('id')
      .eq('crianca_id', criancaId)
      .eq('data', hojeISO())
      .is('saida', null)
      .limit(1)
      .maybeSingle()
    if (aberta) return { ok: false, erro: 'Essa criança já está no espaço agora.' }

    const { error } = await supabase
      .from('fila_espera')
      .insert({ crianca_id: criancaId, data: hojeISO() })
    if (error) {
      // Índice único parcial: já existe entrada ativa para a criança.
      if (error.code === '23505') return { ok: false, erro: 'Essa criança já está na fila.' }
      return { ok: false, erro: error.message }
    }

    try {
      await processarFila(supabase, getSender())
    } catch {
      // Sem vaga agora ou falha momentânea — o worker reprocessa em minutos.
    }
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// Tira a criança da fila (desistiu / foi embora). Se ela estava CHAMADA, a vaga
// reservada volta pro bolo e a próxima é chamada na sequência.
export async function sairDaFila(filaId: string): Promise<Resultado> {
  try {
    const supabase = await createClient()
    const { data: ok, error } = await supabase
      .from('fila_espera')
      .update({ status: 'desistiu', encerrada_em: new Date().toISOString() })
      .eq('id', filaId)
      .in('status', ['aguardando', 'chamada'])
      .select('id')
      .maybeSingle()
    if (error) return { ok: false, erro: error.message }
    if (!ok) return { ok: false, erro: 'Essa entrada da fila já foi encerrada.' }

    try {
      await processarFila(supabase, getSender())
    } catch {
      // idem: o worker cobre.
    }
    refresh()
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: `Erro no servidor: ${e instanceof Error ? e.message : String(e)}` }
  }
}
