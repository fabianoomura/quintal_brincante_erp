import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import TemplateRow, { type VariavelMensagemUI } from './template-row'
import NovoAviso from './novo-aviso'

export default async function MensagensPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: templates }, { data: variaveis }] = await Promise.all([
    supabase
      .from('mensagem_template')
      .select('id, chave, nome, tipo, tipo_ocorrencia, texto, categoria, status_aprovacao, ativo, ordem')
      .order('ordem'),
    supabase
      .from('mensagem_variavel')
      .select('chave, placeholder, rotulo, descricao, exemplo')
      .eq('ativo', true)
      .order('ordem'),
  ])

  const rapidos = (templates ?? []).filter((t) => t.tipo === 'aviso_rapido')
  const sistema = (templates ?? []).filter((t) => t.tipo === 'sistema')
  const variaveisUI: VariavelMensagemUI[] = (variaveis ?? []).map((v) => ({
    chave: v.chave,
    placeholder: v.placeholder,
    rotulo: v.rotulo,
    descricao: v.descricao,
    exemplo: v.exemplo,
  }))
  const ativosRapidos = rapidos.filter((t) => t.ativo).length

  const Lista = (arr: typeof rapidos) =>
    arr.map((t) => (
      <TemplateRow
        key={t.id}
        id={t.id}
        chave={t.chave}
        nome={t.nome}
        tipo={t.tipo}
        tipoOcorrencia={t.tipo_ocorrencia}
        texto={t.texto}
        categoria={t.categoria}
        status={t.status_aprovacao}
        ativo={t.ativo}
        ordem={t.ordem}
        variaveis={variaveisUI}
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
        Textos das mensagens de WhatsApp. Use as variáveis padrão abaixo para manter os
        templates consistentes. Na Evolution o texto renderizado vai direto; na Meta oficial,
        o nome do template e a ordem das variáveis continuam importantes.
      </p>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-slate-600">Variáveis padrão</h2>
          <span className="text-xs font-semibold text-slate-400">
            Clique nos chips dentro de cada mensagem para inserir
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {variaveisUI.map((v) => (
            <span
              key={v.chave}
              className="rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-800 ring-1 ring-sky-200"
              title={`${v.descricao}${v.exemplo ? ` Ex.: ${v.exemplo}` : ''}`}
            >
              <span className="font-mono font-bold">{v.placeholder}</span>
              <span className="ml-1 text-slate-500">{v.rotulo}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-slate-600">⚡ Avisos rápidos do play</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          {ativosRapidos}/6 ativos no playground
        </span>
      </div>
      <div className="space-y-2">{Lista(rapidos)}</div>
      <NovoAviso ativosRapidos={ativosRapidos} />

      <h2 className="pt-2 font-display text-lg font-bold text-slate-600">⚙️ Sistema</h2>
      <div className="space-y-2">{Lista(sistema)}</div>
    </div>
  )
}
