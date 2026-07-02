'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salvarTemplate, removerTemplate } from './actions'

const STATUS = [
  { v: 'rascunho', label: 'Rascunho', cls: 'bg-slate-200 text-slate-600' },
  { v: 'enviado', label: 'Enviado à Meta', cls: 'bg-amber-100 text-amber-700' },
  { v: 'aprovado', label: 'Aprovado', cls: 'bg-emerald-100 text-emerald-700' },
  { v: 'reprovado', label: 'Reprovado', cls: 'bg-rose-100 text-rose-700' },
]

export default function TemplateRow({
  id,
  nome,
  tipo,
  texto,
  categoria,
  status,
  ativo,
}: {
  id: string
  nome: string
  tipo: string
  texto: string
  categoria: string
  status: string
  ativo: boolean
}) {
  const router = useRouter()
  const [f, setF] = useState({ nome, texto, categoria, status, ativo })
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

  const stCls = STATUS.find((s) => s.v === f.status)?.cls ?? ''

  return (
    <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <input
          value={f.nome}
          onChange={(e) => setF({ ...f, nome: e.target.value })}
          className="font-display font-semibold text-slate-800 outline-none"
        />
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stCls}`}>
          {STATUS.find((s) => s.v === f.status)?.label}
        </span>
      </div>

      <textarea
        value={f.texto}
        onChange={(e) => setF({ ...f, texto: e.target.value })}
        rows={2}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <p className="text-[11px] text-slate-400">Use {'{{1}}'}, {'{{2}}'}… para as variáveis do template.</p>

      <div className="flex flex-wrap items-center gap-2">
        <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="utility">utility</option>
          <option value="marketing">marketing</option>
        </select>
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          {STATUS.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} className="h-4 w-4" />
          ativo
        </label>
        <button onClick={salvar} disabled={ocupado} className="pop rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          Salvar
        </button>
        {tipo === 'aviso_rapido' && (
          <button
            onClick={async () => {
              await removerTemplate(id)
              router.refresh()
            }}
            className="text-sm font-semibold text-rose-500"
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
