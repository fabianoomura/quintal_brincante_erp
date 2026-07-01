'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarColaborador } from './actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'
import type { Database } from '@/lib/database.types'

type Papel = Database['public']['Enums']['papel_acesso']

export default function ColaboradorForm() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [funcao, setFuncao] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState<Papel>('operador')
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMsg(null)
    setOcupado(true)
    const res = await criarColaborador({ nome, funcao, email, senha, papel })
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setNome('')
    setFuncao('')
    setEmail('')
    setSenha('')
    setPapel('operador')
    setMsg('Colaborador criado. ✅')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className={`space-y-3 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">➕ Novo colaborador</div>
      <label className={label}>
        <span className={labelText}>Nome</span>
        <input required value={nome} onChange={(e) => setNome(e.target.value)} className={input} />
      </label>
      <label className={label}>
        <span className={labelText}>Função</span>
        <input
          value={funcao}
          onChange={(e) => setFuncao(e.target.value)}
          placeholder="Educador(a), recepção…"
          className={input}
        />
      </label>
      <label className={label}>
        <span className={labelText}>E-mail (login)</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </label>
      <div className="flex gap-2">
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Senha inicial</span>
          <input
            type="text"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="mín. 6"
            className={input}
          />
        </label>
        <label className={`flex-1 ${label}`}>
          <span className={labelText}>Papel</span>
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value as Papel)}
            className={input}
          >
            <option value="operador">Operador</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="text-sm font-semibold text-emerald-600">{msg}</p>}
      <button type="submit" disabled={ocupado} className={btnPrimary}>
        Criar colaborador
      </button>
    </form>
  )
}
