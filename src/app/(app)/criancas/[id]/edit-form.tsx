'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCrianca } from '../actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

type Crianca = {
  id: string
  nome: string
  nascimento: string | null
  saude: string | null
  ativo: boolean
}

export default function EditForm({ crianca }: { crianca: Crianca }) {
  const router = useRouter()
  const [nome, setNome] = useState(crianca.nome)
  const [nascimento, setNascimento] = useState(crianca.nascimento ?? '')
  const [saude, setSaude] = useState(crianca.saude ?? '')
  const [ativo, setAtivo] = useState(crianca.ativo)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMsg(null)
    setSalvando(true)
    const res = await updateCrianca(crianca.id, { nome, nascimento, saude, ativo })
    setSalvando(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setMsg('Salvo.')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className={`space-y-3 ${card}`}>
      <label className={label}>
        <span className={labelText}>Nome *</span>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={input}
        />
      </label>
      <label className={label}>
        <span className={labelText}>Nascimento</span>
        <input
          type="date"
          value={nascimento}
          onChange={(e) => setNascimento(e.target.value)}
          className={input}
        />
      </label>
      <label className={label}>
        <span className={labelText}>Saúde</span>
        <textarea
          value={saude}
          onChange={(e) => setSaude(e.target.value)}
          rows={2}
          className={input}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-sm font-semibold">Ativa ⭐</span>
      </label>

      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="text-sm font-semibold text-emerald-600">{msg}</p>}

      <button type="submit" disabled={salvando} className={btnPrimary}>
        {salvando ? 'Salvando…' : 'Salvar dados 💾'}
      </button>
    </form>
  )
}
