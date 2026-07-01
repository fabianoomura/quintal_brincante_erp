'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setValorFeriado, addFeriado, removerFeriado } from './actions'
import { formatBRL } from '@/lib/dinheiro'

export function ValorFeriado({ inicial }: { inicial: number | null }) {
  const router = useRouter()
  const [v, setV] = useState(inicial != null ? String(inicial) : '')
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await setValorFeriado(v.trim() === '' ? null : Number(v))
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setMsg('Salvo. ✅')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="font-display text-base font-bold text-slate-700">🎉 Valor de feriado</div>
      <p className="mb-2 text-sm text-slate-500">
        Vale para todos os feriados. Vazio = usa a grade normal do dia.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-slate-400">R$</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="ex.: 30,00"
          className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
        <button disabled={ocupado} className="pop rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
          Salvar
        </button>
      </div>
      {erro && <p className="mt-1 text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="mt-1 text-sm font-semibold text-emerald-600">{msg}</p>}
    </form>
  )
}

export function FeriadosLocais({
  locais,
  valorFeriado,
}: {
  locais: { id: string; data: string; nome: string }[]
  valorFeriado: number | null
}) {
  const router = useRouter()
  const [data, setData] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await addFeriado(data, nome)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setData('')
    setNome('')
    router.refresh()
  }

  async function remover(id: string) {
    await removerFeriado(id)
    router.refresh()
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="font-display text-base font-bold text-slate-700">📌 Feriados locais</div>
      <p className="mb-2 text-sm text-slate-500">
        Além dos nacionais (automáticos), adicione datas locais (ex.: aniversário de Londrina).
        {valorFeriado != null ? ` Todos usam ${formatBRL(valorFeriado)}.` : ' Defina o valor de feriado acima.'}
      </p>
      <ul className="mb-2 space-y-1">
        {locais.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
            <span>
              <strong>{f.data}</strong> · {f.nome}
            </span>
            <button onClick={() => remover(f.id)} className="text-xs font-semibold text-rose-500">
              remover
            </button>
          </li>
        ))}
        {locais.length === 0 && <li className="text-sm text-slate-400">Nenhum feriado local.</li>}
      </ul>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Nome (ex.: Aniversário de Londrina)" value={nome} onChange={(e) => setNome(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={ocupado} className="pop rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Adicionar
        </button>
      </form>
      {erro && <p className="mt-1 text-sm font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
