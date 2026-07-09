'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type TipoOcorrencia = Database['public']['Enums']['tipo_ocorrencia']
type Resultado = { ok: true } | { ok: false; erro: string }

const SEM = 'Sem permissão (apenas admin).'
const MAX_AVISOS_ATIVOS = 6

async function contarAvisosAtivos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  excetoId?: string,
) {
  let query = supabase
    .from('mensagem_template')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'aviso_rapido')
    .eq('ativo', true)

  if (excetoId) query = query.neq('id', excetoId)

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

function revalidarMensagens() {
  revalidatePath('/mensagens')
  revalidatePath('/playground')
  revalidatePath('/kiosk')
}

export async function salvarTemplate(
  id: string,
  input: {
    nome: string
    texto: string
    categoria: string
    status: string
    ativo: boolean
    ordem: number
  },
): Promise<Resultado> {
  if (input.texto.trim() === '') return { ok: false, erro: 'O texto não pode ficar vazio.' }

  const supabase = await createClient()
  const { data: atual, error: errAtual } = await supabase
    .from('mensagem_template')
    .select('tipo')
    .eq('id', id)
    .maybeSingle()
  if (errAtual) return { ok: false, erro: errAtual.message }
  if (!atual) return { ok: false, erro: SEM }

  try {
    if (atual.tipo === 'aviso_rapido' && input.ativo) {
      const ativos = await contarAvisosAtivos(supabase, id)
      if (ativos >= MAX_AVISOS_ATIVOS) {
        return { ok: false, erro: 'O play pode ter no máximo 6 avisos rápidos ativos.' }
      }
    }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao contar avisos ativos.' }
  }

  const { data, error } = await supabase
    .from('mensagem_template')
    .update({
      nome: input.nome.trim(),
      texto: input.texto,
      categoria: input.categoria,
      status_aprovacao: input.status,
      ativo: input.ativo,
      ordem: Number.isFinite(input.ordem) ? Math.round(input.ordem) : 50,
    })
    .eq('id', id)
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM }

  revalidarMensagens()
  return { ok: true }
}

export async function criarAvisoRapido(
  nome: string,
  tipoOcorrencia: TipoOcorrencia,
  texto: string,
  ativo = true,
): Promise<Resultado> {
  if (nome.trim() === '') return { ok: false, erro: 'Informe o rótulo.' }
  if (texto.trim() === '') return { ok: false, erro: 'Informe o texto.' }

  const supabase = await createClient()
  try {
    if (ativo) {
      const ativos = await contarAvisosAtivos(supabase)
      if (ativos >= MAX_AVISOS_ATIVOS) {
        return {
          ok: false,
          erro: 'Já existem 6 avisos rápidos ativos. Crie este como inativo ou desative outro.',
        }
      }
    }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao contar avisos ativos.' }
  }

  const chave = `${nome
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 20)}_${crypto.randomUUID().slice(0, 4)}`

  const { data, error } = await supabase
    .from('mensagem_template')
    .insert({
      chave,
      nome: nome.trim(),
      tipo: 'aviso_rapido',
      tipo_ocorrencia: tipoOcorrencia,
      texto,
      ordem: 50,
      ativo,
    })
    .select('id')
  if (error) return { ok: false, erro: error.message }
  if (!data || data.length === 0) return { ok: false, erro: SEM }

  revalidarMensagens()
  return { ok: true }
}

export async function removerTemplate(id: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('mensagem_template').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidarMensagens()
  return { ok: true }
}
