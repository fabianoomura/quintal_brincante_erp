'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarColonia } from './actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

export default function ColoniaForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [valor, setValor] = useState('')
  const [vagas, setVagas] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await criarColonia({
      nome,
      inicio,
      fim,
      valor: Number(valor),
      vagas: vagas.trim() === '' ? null : Number(vagas),
    })
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setNome('')
    setInicio('')
    setFim('')
    setValor('')
    setVagas('')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className={`space-y-3 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">➕ Nova colônia</div>
      <label className={label}>
        <span className={labelText}>Nome</span>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Colônia de Julho 2026"
          className={input}
        />
      </label>
      <div className="flex gap-2">
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Início</span>
          <input type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} className={input} />
        </label>
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Fim</span>
          <input type="date" required value={fim} onChange={(e) => setFim(e.target.value)} className={input} />
        </label>
      </div>
      <div className="flex gap-2">
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Valor (R$)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={input}
          />
        </label>
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Vagas (opcional)</span>
          <input
            type="number"
            min={1}
            value={vagas}
            onChange={(e) => setVagas(e.target.value)}
            placeholder="sem limite"
            className={input}
          />
        </label>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      <button type="submit" disabled={ocupado} className={btnPrimary}>
        Criar colônia
      </button>
    </form>
  )
}
