'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCrianca, type EnderecoInput } from '../actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'
import FotoInput from '../../foto-input'
import EnderecoFields from '../endereco-fields'

type Crianca = {
  id: string
  nome: string
  primeiro_nome: string | null
  sobrenome: string | null
  nascimento: string | null
  saude: string | null
  endereco: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  ativo: boolean
  foto: string | null
}

export default function EditForm({ crianca }: { crianca: Crianca }) {
  const router = useRouter()
  const [primeiroNome, setPrimeiroNome] = useState(crianca.primeiro_nome ?? crianca.nome)
  const [sobrenome, setSobrenome] = useState(crianca.sobrenome ?? '')
  const [nascimento, setNascimento] = useState(crianca.nascimento ?? '')
  const [saude, setSaude] = useState(crianca.saude ?? '')
  const [endereco, setEndereco] = useState<EnderecoInput>({
    endereco: crianca.endereco ?? '',
    cep: crianca.cep ?? '',
    logradouro: crianca.logradouro ?? '',
    numero: crianca.numero ?? '',
    complemento: crianca.complemento ?? '',
    bairro: crianca.bairro ?? '',
    cidade: crianca.cidade ?? '',
    uf: crianca.uf ?? '',
  })
  const [ativo, setAtivo] = useState(crianca.ativo)
  const [foto, setFoto] = useState<string | null>(crianca.foto)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMsg(null)
    setSalvando(true)
    const res = await updateCrianca(crianca.id, {
      nome: crianca.nome,
      primeiroNome,
      sobrenome,
      nascimento,
      saude,
      ...endereco,
      ativo,
      foto,
    })
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
      <div className={label}>
        <span className={labelText}>Foto</span>
        <FotoInput value={foto} onChange={setFoto} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={label}>
          <span className={labelText}>Nome *</span>
          <input
            required
            value={primeiroNome}
            onChange={(e) => setPrimeiroNome(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          <span className={labelText}>Sobrenome</span>
          <input
            value={sobrenome}
            onChange={(e) => setSobrenome(e.target.value)}
            className={input}
          />
        </label>
      </div>
      <label className={label}>
        <span className={labelText}>Nascimento</span>
        <input
          type="date"
          value={nascimento}
          onChange={(e) => setNascimento(e.target.value)}
          className={input}
        />
      </label>
      <EnderecoFields value={endereco} onChange={setEndereco} />
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
