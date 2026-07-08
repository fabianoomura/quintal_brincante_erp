import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import TemplateRow from './template-row'
import NovoAviso from './novo-aviso'

export default async function MensagensPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('mensagem_template')
    .select('id, chave, nome, tipo, texto, categoria, status_aprovacao, ativo')
    .order('ordem')

  const rapidos = (templates ?? []).filter((t) => t.tipo === 'aviso_rapido')
  const sistema = (templates ?? []).filter((t) => t.tipo === 'sistema')

  const Lista = (arr: typeof rapidos) =>
    arr.map((t) => (
      <TemplateRow
        key={t.id}
        id={t.id}
        chave={t.chave}
        nome={t.nome}
        tipo={t.tipo}
        texto={t.texto}
        categoria={t.categoria}
        status={t.status_aprovacao}
        ativo={t.ativo}
      />
    ))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">💬 Mensagens</h1>
      </div>

      <p className="text-sm text-slate-500">
        Textos das mensagens de WhatsApp. Templates “utility” precisam de <strong>aprovação da
        Meta</strong> — marque o status aqui. O envio real usa o número de alertas (nunca o de
        marketing).
      </p>

      <h2 className="font-display text-lg font-bold text-slate-600">⚡ Avisos rápidos do play</h2>
      <div className="space-y-2">{Lista(rapidos)}</div>
      <NovoAviso />

      <h2 className="pt-2 font-display text-lg font-bold text-slate-600">⚙️ Sistema</h2>
      <div className="space-y-2">{Lista(sistema)}</div>
    </div>
  )
}
