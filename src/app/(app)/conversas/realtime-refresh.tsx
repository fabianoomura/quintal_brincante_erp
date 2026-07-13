'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Recarrega os dados da página quando a tabela observada muda (mensagem nova,
// fila chamada pelo worker). Sem polling: Supabase Realtime + router.refresh().
export default function RealtimeRefresh({ tabela }: { tabela: 'whatsapp_conversa' | 'whatsapp_mensagem' | 'fila_espera' }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel(`refresh-${tabela}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => {
        router.refresh()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [router, tabela])

  return null
}
