'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarPlano } from './actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

export default function PlanoForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [dias, setDias] = useState('3')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await criarPlano(nome, Number(dias), Number(valor))
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setNome('')
    setValor('')
    setDias('3')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className={`space-y-3 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">➕ Novo plano</div>
      <label className={label}>
        <span className={labelText}>Nome</span>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: 3x por semana"
          className={input}
        />
      </label>
      <div className="flex gap-2">
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Dias/semana</span>
          <select
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            className={input}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n === 7 ? 'Todos os dias' : `${n}x`}
              </option>
            ))}
          </select>
        </label>
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Valor (R$)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className={input}
          />
        </label>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      <button type="submit" disabled={ocupado} className={btnPrimary}>
        Criar plano
      </button>
    </form>
  )
}
