'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSender } from '@/lib/whatsapp/adapter'
import { enviarNotificacao } from '@/lib/whatsapp/notificar'
import { tplOcorrencia } from '@/lib/whatsapp/templates'
import type { Database } from '@/lib/database.types'

type TipoOcorrencia = Database['public']['Enums']['tipo_ocorrencia']

const MOTIVO_LABEL: Record<TipoOcorrencia, string> = {
  banheiro: 'pediu para ir ao banheiro. Pode vir ajudar, por favor?',
  nao_adaptou: 'está precisando de você por aqui. Pode vir ao espaço?',
  saude: 'precisa de atenção por uma questão de saúde. Pode vir ao espaço?',
  comportamento: 'precisamos conversar sobre uma situação que aconteceu. Pode vir ao espaço?',
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

  const { data: crianca } = await supabase
    .from('crianca')
    .select('nome')
    .eq('id', criancaId)
    .maybeSingle()

  // Acha o responsável correto (papel='responsavel') com telefone.
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

  const detalhe = descricao.trim() === '' ? MOTIVO_LABEL[tipo] : descricao.trim()
  const { data: tpl } = await supabase
    .from('mensagem_template')
    .select('texto')
    .eq('chave', 'ocorrencia')
    .eq('ativo', true)
    .maybeSingle()
  const render = tplOcorrencia(responsavel.nome, crianca?.nome ?? 'a criança', detalhe, tpl?.texto)

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
