import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { card } from '@/lib/ui'
import RealtimeRefresh from './realtime-refresh'

// Caixa de entrada geral — hub de atendimento WhatsApp (estilo WhatsApp Business).
// Mostra TODAS as conversas, inclusive de responsáveis cujas crianças não estão no
// play agora. O botão 💬 do playground só atalha para a conversa certa.

function quando(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const hoje = new Date()
  const mesmoDia =
    d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) ===
    hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return mesmoDia
    ? d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
}

export default async function ConversasPage() {
  const supabase = await createClient()

  const { data: conversas } = await supabase
    .from('whatsapp_conversa')
    .select(
      'id, telefone, ultima_mensagem, ultima_mensagem_em, nao_lidas, contato:contato_id (id, nome)',
    )
    .eq('ativo', true)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .limit(100)

  // Crianças de cada contato: foto no avatar e nome na linha — a equipe pensa
  // "mãe da Helena", não no nome do responsável.
  const contatoIds = (conversas ?? []).map((c) => c.contato?.id).filter(Boolean) as string[]
  const criancasPorContato = new Map<string, { nome: string; foto: string | null }[]>()
  if (contatoIds.length > 0) {
    const { data: vinculos } = await supabase
      .from('crianca_contato')
      .select('contato_id, crianca:crianca_id (nome, foto, ativo)')
      .in('contato_id', contatoIds)
    for (const v of vinculos ?? []) {
      if (!v.crianca?.ativo) continue
      const lista = criancasPorContato.get(v.contato_id) ?? []
      lista.push({ nome: v.crianca.nome, foto: v.crianca.foto })
      criancasPorContato.set(v.contato_id, lista)
    }
  }
  const primeiroNome = (n: string) => n.replace(/\[seed\]/g, '').trim().split(/\s+/)[0] ?? n

  return (
    <div className="space-y-5">
      <RealtimeRefresh tabela="whatsapp_conversa" />
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">💬 Conversas</h1>
      </div>

      {(conversas ?? []).length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          Nenhuma conversa ainda. Quando um responsável mandar mensagem no WhatsApp do
          espaço (ou o sistema enviar um aviso), ela aparece aqui. 💬
        </p>
      )}

      <ul className="space-y-2">
        {(conversas ?? []).map((c) => {
          const criancas = c.contato ? (criancasPorContato.get(c.contato.id) ?? []) : []
          const foto = criancas.find((k) => k.foto)?.foto ?? null
          const naoLida = c.nao_lidas > 0
          return (
            <li key={c.id}>
              <Link
                href={`/conversas/${c.id}`}
                className={`flex items-center gap-3 ${card} ${
                  naoLida ? 'bg-emerald-50/60 ring-emerald-300' : ''
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 text-lg ring-1 ring-emerald-200">
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={foto} alt="" className="h-full w-full object-cover" />
                  ) : c.contato ? (
                    '👤'
                  ) : (
                    '❔'
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <span className="font-display font-bold text-slate-700">
                        {c.contato?.nome ?? `${c.telefone} (não identificado)`}
                      </span>
                      {criancas.length > 0 && (
                        <span className="ml-1.5 text-xs font-semibold text-slate-400">
                          🧒 {criancas.map((k) => primeiroNome(k.nome)).join(', ')}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {quando(c.ultima_mensagem_em)}
                    </span>
                  </span>
                  <span
                    className={`block truncate text-sm ${
                      naoLida ? 'font-semibold text-slate-700' : 'text-slate-500'
                    }`}
                  >
                    {c.ultima_mensagem ?? '—'}
                  </span>
                </span>
                {naoLida && (
                  <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-emerald-500 px-1.5 text-xs font-bold text-white">
                    {c.nao_lidas}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
