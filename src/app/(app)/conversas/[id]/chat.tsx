'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { enviarMensagemConversa, marcarConversaLida } from '../actions'

export type MensagemChat = {
  id: string
  direcao: 'entrada' | 'saida'
  status: string
  conteudo: string | null
  data_mensagem: string
  enviado_por: string | null
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dia(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

// Chat da conversa: responsável à esquerda, equipe/sistema à direita, horário em tudo.
// Tempo real via Supabase Realtime (INSERT na conversa aberta) — sem polling.
export default function Chat({
  conversaId,
  mensagensIniciais,
  vinculo,
}: {
  conversaId: string
  mensagensIniciais: MensagemChat[]
  vinculo: { criancaId: string | null; presencaId: string | null }
}) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>(mensagensIniciais)
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  // Abriu a conversa → zera não lidas.
  useEffect(() => {
    marcarConversaLida(conversaId)
  }, [conversaId])

  // Tempo real: nova mensagem desta conversa entra na tela na hora.
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel(`chat-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_mensagem',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const m = payload.new as MensagemChat
          setMensagens((atual) => (atual.some((x) => x.id === m.id) ? atual : [...atual, m]))
          if (m.direcao === 'entrada') marcarConversaLida(conversaId)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [conversaId])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens.length])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (texto.trim() === '' || ocupado) return
    setErro(null)
    setOcupado(true)
    try {
      const res = await enviarMensagemConversa(conversaId, texto, vinculo)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      setTexto('')
      // A bolha entra pelo Realtime; se demorar, o refresh natural resolve.
    } catch (err) {
      setErro(`Falha ao enviar (${err instanceof Error ? err.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensagens.length === 0 && (
          <p className="pt-8 text-center text-sm text-slate-400">
            Sem mensagens ainda. Escreva abaixo para começar. 💬
          </p>
        )}
        {mensagens.map((m, i) => {
          const d = dia(m.data_mensagem)
          const mostraDia = i === 0 || d !== dia(mensagens[i - 1].data_mensagem)
          const equipe = m.direcao === 'saida'
          return (
            <div key={m.id}>
              {mostraDia && (
                <div className="my-3 text-center text-[11px] font-semibold text-slate-400">
                  {d}
                </div>
              )}
              <div className={`flex ${equipe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    equipe
                      ? 'rounded-br-sm bg-emerald-100 text-slate-800'
                      : 'rounded-bl-sm bg-slate-100 text-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {m.conteudo ?? '📎 [conteúdo não suportado]'}
                  </p>
                  <p className="mt-0.5 text-right text-[10px] text-slate-400">
                    {hora(m.data_mensagem)}
                    {equipe && m.status === 'falha' && (
                      <span className="ml-1 font-bold text-rose-500">⚠️ não enviada</span>
                    )}
                    {equipe && m.enviado_por == null && <span className="ml-1">· sistema</span>}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={fimRef} />
      </div>

      <form onSubmit={enviar} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem…"
          className="flex-1 rounded-full border-2 border-emerald-100 bg-emerald-50/40 px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={ocupado || texto.trim() === ''}
          className="pop shrink-0 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
        >
          {ocupado ? '…' : 'Enviar ➤'}
        </button>
      </form>
      {erro && <p className="px-4 pb-3 text-sm font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
