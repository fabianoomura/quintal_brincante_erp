import { logout } from './logout-action'
import { getColaboradorAtual } from '@/lib/colaborador'
import { createClient } from '@/lib/supabase/server'
import Shell from './shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const colaborador = await getColaboradorAtual()

  // Autenticado mas sem ficha de colaborador ativa → sem acesso (RLS já devolve 0 linhas).
  if (!colaborador) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center p-6">
        <div className="max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow-lg ring-1 ring-black/5">
          <div className="text-4xl">🔒</div>
          <h1 className="font-display text-xl font-bold">Acesso pendente</h1>
          <p className="text-sm text-slate-500">
            Seu usuário ainda não está vinculado a um colaborador. Peça a um admin para
            liberar seu acesso.
          </p>
          <form action={logout}>
            <button className="rounded-full bg-slate-800 px-4 py-2 font-semibold text-white">
              Sair
            </button>
          </form>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: conversasNaoLidas } = await supabase
    .from('whatsapp_conversa')
    .select('nao_lidas')
    .eq('ativo', true)
    .gt('nao_lidas', 0)
  const totalNaoLidas = (conversasNaoLidas ?? []).reduce((soma, c) => soma + c.nao_lidas, 0)

  return (
    <Shell
      nome={colaborador.nome}
      ehAdmin={colaborador.papel_acesso === 'admin'}
      totalNaoLidasInicial={totalNaoLidas}
    >
      {children}
    </Shell>
  )
}
