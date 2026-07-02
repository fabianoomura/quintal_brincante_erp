'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarAvisoRapido } from './actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'
import type { Database } from '@/lib/database.types'

type Tipo = Database['public']['Enums']['tipo_ocorrencia']

const TIPOS: { v: Tipo; l: string }[] = [
  { v: 'banheiro', l: 'Banheiro' },
  { v: 'nao_adaptou', l: 'Não se adaptou' },
  { v: 'saude', l: 'Saúde' },
  { v: 'comportamento', l: 'Comportamento' },
  { v: 'outro', l: 'Outro' },
]

export default function NovoAviso() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<Tipo>('outro')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await criarAvisoRapido(nome, tipo, texto)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setNome('')
    setTexto('')
    setTipo('outro')
    router.refresh()
  }

  return (
    <form onSubmit={salvar} className={`space-y-2 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">➕ Novo aviso rápido do play</div>
      <div className="flex gap-2">
        <input placeholder="Rótulo do botão (ex.: 🥤 Lanche)" value={nome} onChange={(e) => setNome(e.target.value)} className={`flex-1 ${input}`} required />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className={input}>
          {TIPOS.map((t) => (
            <option key={t.v} value={t.v}>{t.l}</option>
          ))}
        </select>
      </div>
      <label className={label}>
        <span className={labelText}>Texto da mensagem</span>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} className={input} required />
      </label>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      <button type="submit" disabled={ocupado} className={btnPrimary}>Criar aviso</button>
    </form>
  )
}
