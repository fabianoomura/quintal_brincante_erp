'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSender } from '@/lib/whatsapp/adapter'
import { enviarNotificacao } from '@/lib/whatsapp/notificar'
import { tplOcorrencia } from '@/lib/whatsapp/templates'
import type { Database } from '@/lib/database.types'

type TipoOcorrencia = Database['public']['Enums']['tipo_ocorrencia']

const MOTIVO_LABEL: Record<TipoOcorrencia, string> = {
  banheiro: 'banheiro',
  nao_adaptou: 'não se adaptou',
  saude: 'saúde',
  comportamento: 'comportamento',
  outro: 'uma ocorrência',
}

type Resultado =
  | { ok: true; notificou: boolean; aviso?: string }
  | { ok: false; erro: string }

export async function registrarOcorrencia(
  criancaId: string,
  tipo: TipoOcorrencia,
  descricao: string,
  presencaId?: string | null,
): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Cria a ocorrência (humano no circuito, por design).
  const { data: oc, error: errOc } = await supabase
    .from('ocorrencia')
    .insert({
      crianca_id: criancaId,
      tipo,
      descricao: descricao.trim() === '' ? null : descricao.trim(),
      criado_por: user?.id ?? null,
      presenca_id: presencaId ?? null,
    })
    .select('id')
    .single()
  if (errOc) return { ok: false, erro: errOc.message }

  // Acha o responsável correto (papel='responsavel') com telefone.
  const { data: crianca } = await supabase
    .from('crianca')
    .select('nome')
    .eq('id', criancaId)
    .single()

  const { data: vinculo } = await supabase
    .from('crianca_contato')
    .select('contato:contato_id (id, nome, telefone)')
    .eq('crianca_id', criancaId)
    .eq('papel', 'responsavel')
    .limit(1)
    .maybeSingle()

  const responsavel = vinculo?.contato
  if (!responsavel?.telefone) {
    return {
      ok: true,
      notificou: false,
      aviso: 'Ocorrência registrada, mas o responsável não tem telefone cadastrado.',
    }
  }

  const motivo = MOTIVO_LABEL[tipo]
  const detalhe = descricao.trim() === '' ? motivo : descricao.trim()
  const render = tplOcorrencia(responsavel.nome, motivo, detalhe)

  const res = await enviarNotificacao(supabase, getSender(), {
    crianca_id: criancaId,
    contato_id: responsavel.id,
    para: responsavel.telefone,
    tipo: 'ocorrencia',
    template: render.template,
    variaveis: render.variaveis,
    conteudo: render.conteudo,
    ocorrencia_id: oc.id,
    presenca_id: presencaId ?? null,
  })

  revalidatePath(`/criancas/${criancaId}`)
  if (!res.ok) {
    return { ok: true, notificou: false, aviso: `Ocorrência registrada; envio falhou: ${res.erro}` }
  }
  return { ok: true, notificou: true }
}
