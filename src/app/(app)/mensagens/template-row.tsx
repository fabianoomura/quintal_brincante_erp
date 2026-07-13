'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salvarTemplate, removerTemplate } from './actions'
import type { Database } from '@/lib/database.types'

type TipoOcorrencia = Database['public']['Enums']['tipo_ocorrencia']

export type VariavelMensagemUI = {
  chave: string
  placeholder: string
  rotulo: string
  descricao: string
  exemplo: string | null
}

const STATUS = [
  { v: 'rascunho', label: 'Rascunho', cls: 'bg-slate-200 text-slate-600' },
  { v: 'enviado', label: 'Enviado à Meta', cls: 'bg-amber-100 text-amber-700' },
  { v: 'aprovado', label: 'Aprovado', cls: 'bg-emerald-100 text-emerald-700' },
  { v: 'reprovado', label: 'Reprovado', cls: 'bg-rose-100 text-rose-700' },
]

const VARIAVEIS_RECOMENDADAS: Record<string, string[]> = {
  aviso_tempo: ['responsavel_nome', 'crianca_nome', 'minutos_restantes'],
  ocorrencia: ['responsavel_nome', 'crianca_nome', 'detalhe'],
  boas_vindas: ['responsavel_nome', 'crianca_nome'],
  agradecimento_checkout: ['responsavel_nome', 'crianca_nome'],
}

const TIPO_LABEL: Record<string, string> = {
  banheiro: 'Banheiro',
  nao_adaptou: 'Não se adaptou',
  saude: 'Saúde',
  comportamento: 'Comportamento',
  outro: 'Outro',
}

export default function TemplateRow({
  id,
  chave,
  nome,
  tipo,
  tipoOcorrencia,
  texto,
  categoria,
  status,
  ativo,
  ordem,
  variaveis,
}: {
  id: string
  chave: string
  nome: string
  tipo: string
  tipoOcorrencia: TipoOcorrencia | null
  texto: string
  categoria: string
  status: string
  ativo: boolean
  ordem: number
  variaveis: VariavelMensagemUI[]
}) {
  const router = useRouter()
  // Colapsado por padrão: a lista mostra só nome + preview + status; expande p/ editar.
  const [aberto, setAberto] = useState(false)
  const [f, setF] = useState({ nome, texto, categoria, status, ativo, ordem })
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await salvarTemplate(id, f)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setMsg('Salvo. ✅')
    router.refresh()
  }

  async function remover() {
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await removerTemplate(id)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    router.refresh()
  }

  function inserirVariavel(v: VariavelMensagemUI) {
    setF((atual) => ({ ...atual, texto: `${atual.texto}${atual.texto.endsWith(' ') ? '' : ' '}${v.placeholder}` }))
  }

  const stCls = STATUS.find((s) => s.v === f.status)?.cls ?? ''
  const recomendadas =
    VARIAVEIS_RECOMENDADAS[chave] ??
    (tipo === 'aviso_rapido' ? ['responsavel_nome', 'crianca_nome'] : undefined)
  const listaVariaveis = recomendadas
    ? variaveis.filter((v) => recomendadas.includes(v.chave))
    : variaveis

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex w-full items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-left shadow-sm ring-1 ring-slate-200 hover:shadow-md"
      >
        <span className="shrink-0 font-display font-semibold text-slate-800">{f.nome}</span>
        {!f.ativo && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">
            inativo
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{f.texto}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${stCls}`}>
          {STATUS.find((s) => s.v === f.status)?.label}
        </span>
        <span className="shrink-0 text-xs font-semibold text-slate-400">editar ▾</span>
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={f.nome}
          onChange={(e) => setF({ ...f, nome: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-transparent px-1 py-1 font-display font-semibold text-slate-800 outline-none focus:border-slate-200"
        />
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${stCls}`}>
          {STATUS.find((s) => s.v === f.status)?.label}
        </span>
        <button
          onClick={() => setAberto(false)}
          className="shrink-0 text-xs font-semibold text-slate-400"
        >
          fechar ▴
        </button>
      </div>

      <textarea
        value={f.texto}
        onChange={(e) => setF({ ...f, texto: e.target.value })}
        rows={chave === 'boas_vindas' ? 8 : 3}
        className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
      />

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400">Variáveis:</span>
          {listaVariaveis.map((v) => (
            <button
              key={v.chave}
              type="button"
              onClick={() => inserirVariavel(v)}
              title={`${v.descricao}${v.exemplo ? ` Ex.: ${v.exemplo}` : ''}`}
              className="rounded-full bg-sky-50 px-2 py-0.5 font-mono text-[11px] text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
            >
              {v.placeholder}
            </button>
          ))}
        </div>
        {tipo === 'aviso_rapido' && (
          <p className="text-[11px] text-slate-400">
            Este texto vira o detalhe do aviso. No playground aparecem no máximo 6 avisos rápidos ativos.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <span className="text-xs font-semibold text-slate-400">Ordem</span>
          <input
            type="number"
            value={f.ordem}
            onChange={(e) => setF({ ...f, ordem: Number(e.target.value) })}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        {tipo === 'aviso_rapido' && tipoOcorrencia && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
            {TIPO_LABEL[tipoOcorrencia] ?? tipoOcorrencia}
          </span>
        )}
        <select
          value={f.categoria}
          onChange={(e) => setF({ ...f, categoria: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="utility">utility</option>
          <option value="marketing">marketing</option>
        </select>
        <select
          value={f.status}
          onChange={(e) => setF({ ...f, status: e.target.value })}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          {STATUS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={f.ativo}
            onChange={(e) => setF({ ...f, ativo: e.target.checked })}
            className="h-4 w-4"
          />
          ativo
        </label>
        <button
          onClick={salvar}
          disabled={ocupado}
          className="pop rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Salvar
        </button>
        {tipo === 'aviso_rapido' && (
          <button
            onClick={remover}
            disabled={ocupado}
            className="text-sm font-semibold text-rose-500 disabled:opacity-50"
          >
            remover
          </button>
        )}
        {msg && <span className="text-sm font-semibold text-emerald-600">{msg}</span>}
        {erro && <span className="text-sm font-semibold text-rose-500">{erro}</span>}
      </div>
    </div>
  )
}
