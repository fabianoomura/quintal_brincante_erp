'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarAvulso } from './actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

export default function AvulsoForm({ criancas }: { criancas: { id: string; nome: string }[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [criancaId, setCriancaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await criarAvulso({ criancaId, descricao, valor: Number(valor), vencimento })
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setCriancaId('')
    setDescricao('')
    setValor('')
    setVencimento('')
    setAberto(false)
    router.refresh()
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="pop rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
      >
        + Lançamento avulso
      </button>
    )
  }

  return (
    <form onSubmit={salvar} className={`space-y-2 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">🧾 Lançamento avulso</div>
      <select value={criancaId} onChange={(e) => setCriancaId(e.target.value)} required className={input}>
        <option value="">Selecione a criança…</option>
        {criancas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      <input
        placeholder="Descrição (ex.: lanche, material, festa…)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        required
        className={input}
      />
      <div className="flex gap-2">
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Valor (R$)</span>
          <input type="number" min={0} step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} className={input} />
        </label>
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Vencimento</span>
          <input type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={input} />
        </label>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={ocupado} className={btnPrimary}>
          Criar lançamento
        </button>
        <button type="button" onClick={() => setAberto(false)} className="rounded-xl bg-slate-200 px-4 font-semibold text-slate-600">
          Cancelar
        </button>
      </div>
    </form>
  )
}
