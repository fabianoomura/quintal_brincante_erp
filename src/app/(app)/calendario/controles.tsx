'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertFeriado, removerFeriado } from './actions'
import { formatBRL } from '@/lib/dinheiro'

type Feriado = { id: string; data: string; nome: string; valor: number | null }

export default function FeriadosEditor({
  feriados,
  sugestoes,
}: {
  feriados: Feriado[]
  sugestoes: { data: string; nome: string }[]
}) {
  const router = useRouter()
  const [data, setData] = useState('')
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await upsertFeriado(data, nome, valor.trim() === '' ? null : Number(valor))
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setData('')
    setNome('')
    setValor('')
    router.refresh()
  }

  async function remover(id: string) {
    await removerFeriado(id)
    router.refresh()
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="font-display text-base font-bold text-slate-700">🎉 Feriados (com valor/hora)</div>
      <p className="mb-2 text-sm text-slate-500">
        Cada feriado tem seu valor/hora próprio. Sem valor definido, o dia usa a grade normal.
      </p>

      {sugestoes.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-400">Nacionais deste mês:</span>
          {sugestoes.map((s) => (
            <button
              key={s.data}
              onClick={() => {
                setData(s.data)
                setNome(s.nome)
              }}
              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
            >
              {s.nome}
            </button>
          ))}
        </div>
      )}

      <ul className="mb-2 space-y-1">
        {feriados.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
            <span>
              <strong>{f.data}</strong> · {f.nome}
              {f.valor != null ? ` · ${formatBRL(f.valor)}/h` : ' · sem valor'}
            </span>
            <button onClick={() => remover(f.id)} className="text-xs font-semibold text-rose-500">
              remover
            </button>
          </li>
        ))}
        {feriados.length === 0 && <li className="text-sm text-slate-400">Nenhum feriado com valor.</li>}
      </ul>

      <form onSubmit={salvar} className="flex flex-wrap items-end gap-2">
        <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Nome (ex.: Natal)" value={nome} onChange={(e) => setNome(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">R$</span>
          <input type="number" min={0} step="0.01" placeholder="/h" value={valor} onChange={(e) => setValor(e.target.value)} className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
        </div>
        <button disabled={ocupado} className="pop rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Salvar
        </button>
      </form>
      {erro && <p className="mt-1 text-sm font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
