import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import { getColaboradorAtual } from '@/lib/colaborador'
import Inscrever from './inscrever'
import RemoverInscricao from './remover-inscricao'
import EditarColonia from './editar-colonia'

export default async function ColoniaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: colonia } = await supabase
    .from('colonia')
    .select('id, nome, inicio, fim, valor, vagas, ativo')
    .eq('id', id)
    .maybeSingle()
  if (!colonia) notFound()

  const [{ data: inscricoes }, { data: criancas }, colaborador] = await Promise.all([
    supabase
      .from('inscricao_colonia')
      .select('id, crianca:crianca_id (id, nome)')
      .eq('colonia_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('crianca').select('id, nome').eq('ativo', true).order('nome'),
    getColaboradorAtual(),
  ])
  const ehAdmin = colaborador?.papel_acesso === 'admin'

  const inscritosIds = new Set((inscricoes ?? []).map((i) => i.crianca?.id))
  const disponiveis = (criancas ?? []).filter((c) => !inscritosIds.has(c.id))
  const total = inscricoes?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/colonias" className="text-sm font-semibold text-slate-500">
          ← Colônias
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🏕️ {colonia.nome}</h1>
      </div>

      <div className={card}>
        <div className="text-sm text-slate-600">
          {colonia.inicio} a {colonia.fim}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-emerald-700">
            {formatBRL(colonia.valor)}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
            {total}
            {colonia.vagas != null ? `/${colonia.vagas} vagas` : ' inscritos'}
          </span>
        </div>
      </div>

      {ehAdmin && (
        <EditarColonia
          colonia={{
            id: colonia.id,
            nome: colonia.nome,
            inicio: colonia.inicio,
            fim: colonia.fim,
            valor: Number(colonia.valor),
            vagas: colonia.vagas,
            ativo: colonia.ativo,
          }}
        />
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold text-slate-600">Inscritos ({total})</h2>
        {total === 0 && <p className="text-sm text-slate-500">Ninguém inscrito ainda.</p>}
        <ul className="space-y-2">
          {inscricoes?.map((i) => (
            <li key={i.id} className={`flex items-center justify-between ${card}`}>
              <span className="font-semibold">{i.crianca?.nome}</span>
              <RemoverInscricao inscricaoId={i.id} coloniaId={colonia.id} />
            </li>
          ))}
        </ul>
      </section>

      <Inscrever coloniaId={colonia.id} criancas={disponiveis} />
    </div>
  )
}
