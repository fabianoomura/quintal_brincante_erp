import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getColaboradorAtual } from '@/lib/colaborador'
import { formatBRL } from '@/lib/dinheiro'
import { hhmm } from '@/lib/datas'
import { card } from '@/lib/ui'
import EditForm from './edit-form'
import ContatosManager from './contatos-manager'
import OcorrenciaForm from './ocorrencia-form'
import MatriculaSection from './matricula-section'
import MensalistaControle from './mensalista-controle'

const ORIGEM_LABEL: Record<string, string> = {
  mensalista: '🎟️ Mensalista',
  diaria: '☀️ Diária',
  espaco_kids: '🎠 Play',
  colonia: '🏕️ Colônia',
}

export default async function FichaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: crianca } = await supabase
    .from('crianca')
    .select('id, nome, nascimento, saude, ativo, foto')
    .eq('id', id)
    .maybeSingle()

  if (!crianca) notFound()

  const { data: vinculos } = await supabase
    .from('crianca_contato')
    .select('papel, contato:contato_id (id, nome, telefone, email)')
    .eq('crianca_id', id)

  const contatos = (vinculos ?? []).map((v) => ({
    papel: v.papel,
    ...v.contato,
  }))

  const [
    colaborador,
    { data: matricula },
    { data: planos },
    { data: historico },
    { data: inscricoes },
    { data: origens },
    { data: reposicoes },
  ] = await Promise.all([
    getColaboradorAtual(),
    supabase
      .from('mensalidade')
      .select('id, valor, dia_vencimento, dias_semana, plano:plano_id (nome)')
      .eq('crianca_id', id)
      .eq('ativo', true)
      .order('inicio', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('plano_mensalidade')
      .select('id, nome, dias_por_semana, valor')
      .eq('ativo', true)
      .order('dias_por_semana', { ascending: true }),
    supabase
      .from('presenca')
      .select('id, data, origem, entrada, saida, valor')
      .eq('crianca_id', id)
      .order('data', { ascending: false })
      .order('entrada', { ascending: false })
      .limit(8),
    supabase
      .from('inscricao_colonia')
      .select('id, colonia:colonia_id (nome, inicio, fim)')
      .eq('crianca_id', id)
      .order('created_at', { ascending: false }),
    // Tipos de atendimento que a criança já usou (para os selos).
    supabase.from('presenca').select('origem').eq('crianca_id', id).limit(500),
    supabase
      .from('reposicao')
      .select('id, data_falta, data_reposicao, obs')
      .eq('crianca_id', id)
      .order('data_falta', { ascending: false }),
  ])

  const origensUsadas = new Set((origens ?? []).map((r) => r.origem))
  const usaPlay = origensUsadas.has('espaco_kids')
  const usaDiaria = origensUsadas.has('diaria')
  const temColonia =
    (inscricoes?.length ?? 0) > 0 || origensUsadas.has('colonia')
  const totalVisitas = origens?.length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/criancas" className="text-sm font-semibold text-slate-500">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🌟 {crianca.nome}</h1>
      </div>

      {/* Situação: os tipos não são exclusivos — a mesma criança pode ter vários
          (ex.: mensalista que também faz play no fim de semana). */}
      <div className="flex flex-wrap gap-2">
        {matricula && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
            🎟️ Mensalista
          </span>
        )}
        {usaPlay && (
          <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-sm font-bold text-fuchsia-700">
            🎠 Play
          </span>
        )}
        {usaDiaria && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
            ☀️ Diária
          </span>
        )}
        {temColonia && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
            🏕️ Colônia
          </span>
        )}
        {totalVisitas > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-500">
            {totalVisitas} visita(s)
          </span>
        )}
        {!crianca.ativo && (
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-bold text-slate-500">
            inativa
          </span>
        )}
      </div>

      <EditForm crianca={crianca} />
      <MatriculaSection
        criancaId={crianca.id}
        matricula={
          matricula
            ? {
                id: matricula.id,
                valor: Number(matricula.valor),
                dia_vencimento: matricula.dia_vencimento,
                dias_semana: matricula.dias_semana,
                plano: matricula.plano,
              }
            : null
        }
        planos={(planos ?? []).map((p) => ({ ...p, valor: Number(p.valor) }))}
        ehAdmin={colaborador?.papel_acesso === 'admin'}
      />

      {matricula && (
        <MensalistaControle
          criancaId={crianca.id}
          mensalidadeId={matricula.id}
          diasIniciais={matricula.dias_semana ?? []}
          reposicoes={reposicoes ?? []}
          ehAdmin={colaborador?.papel_acesso === 'admin'}
        />
      )}

      {(inscricoes?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-slate-600">🏕️ Colônias</h2>
          <ul className="space-y-2">
            {inscricoes?.map((i) => (
              <li key={i.id} className={card}>
                <div className="font-semibold">{i.colonia?.nome}</div>
                <div className="text-xs text-slate-500">
                  {i.colonia?.inicio} a {i.colonia?.fim}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-slate-600">🕘 Histórico recente</h2>
        {(historico?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Sem visitas registradas.</p>
        ) : (
          <ul className="space-y-2">
            {historico?.map((p) => (
              <li key={p.id} className={`flex items-center justify-between ${card}`}>
                <div className="text-sm">
                  <span className="font-semibold">{p.data}</span>
                  <span className="text-slate-500">
                    {' '}
                    · {ORIGEM_LABEL[p.origem] ?? p.origem} · {hhmm(p.entrada)}
                    {p.saida ? `–${hhmm(p.saida)}` : ' (aberta)'}
                  </span>
                </div>
                {p.valor != null && (
                  <span className="text-sm font-bold text-emerald-700">
                    {formatBRL(p.valor)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ContatosManager criancaId={crianca.id} contatos={contatos} />
      <OcorrenciaForm criancaId={crianca.id} />
    </div>
  )
}
