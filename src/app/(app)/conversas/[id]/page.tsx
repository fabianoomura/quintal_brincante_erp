import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Chat from './chat'

// Tela da conversa (chat). A conversa é do RESPONSÁVEL; vindo do card do play, os
// query params ?crianca=&presenca= carimbam o vínculo nas mensagens enviadas daqui —
// é o que permite consultar depois o histórico daquela permanência.
export default async function ConversaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ crianca?: string; presenca?: string }>
}) {
  const { id } = await params
  const { crianca, presenca } = await searchParams
  const supabase = await createClient()

  const { data: conversa } = await supabase
    .from('whatsapp_conversa')
    .select('id, telefone, contato:contato_id (id, nome)')
    .eq('id', id)
    .maybeSingle()
  if (!conversa) notFound()

  // Últimas 200 mensagens (mais antigas primeiro para renderizar).
  const { data: mensagens } = await supabase
    .from('whatsapp_mensagem')
    .select('id, direcao, status, conteudo, data_mensagem, enviado_por')
    .eq('conversa_id', id)
    .order('data_mensagem', { ascending: false })
    .limit(200)

  // Crianças do responsável (contexto no cabeçalho).
  let criancas: string[] = []
  if (conversa.contato) {
    const { data: vincs } = await supabase
      .from('crianca_contato')
      .select('crianca:crianca_id (nome)')
      .eq('contato_id', conversa.contato.id)
      .eq('papel', 'responsavel')
    criancas = (vincs ?? []).map((v) => v.crianca?.nome ?? '').filter(Boolean)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/conversas" className="text-sm font-semibold text-slate-500">
          ← Conversas
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-slate-700">
            {conversa.contato?.nome ?? `${conversa.telefone} (não identificado)`}
          </h1>
          <p className="truncate text-xs text-slate-500">
            {conversa.telefone}
            {criancas.length > 0 ? ` · resp. de ${criancas.join(', ')}` : ''}
          </p>
        </div>
      </div>

      <Chat
        conversaId={conversa.id}
        mensagensIniciais={(mensagens ?? []).slice().reverse()}
        vinculo={{ criancaId: crianca ?? null, presencaId: presenca ?? null }}
      />
    </div>
  )
}
