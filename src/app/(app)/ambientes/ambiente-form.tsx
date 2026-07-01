'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarAmbiente } from './actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

export default function AmbienteForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [capacidade, setCapacidade] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const cap = capacidade.trim() === '' ? null : Number(capacidade)
    const res = await criarAmbiente(nome, cap)
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setNome('')
    setCapacidade('')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className={`space-y-3 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">➕ Novo ambiente</div>
      <label className={label}>
        <span className={labelText}>Nome</span>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ateliê, Brinquedoteca, Área externa…"
          className={input}
        />
      </label>
      <label className={label}>
        <span className={labelText}>Capacidade (opcional)</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={capacidade}
          onChange={(e) => setCapacidade(e.target.value)}
          placeholder="sem limite"
          className={input}
        />
      </label>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      <button type="submit" disabled={ocupado} className={btnPrimary}>
        Criar ambiente
      </button>
    </form>
  )
}
