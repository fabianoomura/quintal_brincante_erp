'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCrianca, type ContatoInput, type EnderecoInput } from '../actions'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'
import { formatarCPF } from '@/lib/cpf'
import { formatarTelefoneBR } from '@/lib/fone'
import EnderecoFields from '../endereco-fields'

const PAPEIS = [
  { value: 'responsavel', label: 'Responsável' },
  { value: 'autorizado', label: 'Autorizado a retirar' },
  { value: 'emergencia', label: 'Emergência' },
] as const

function contatoVazio(papel: ContatoInput['papel']): ContatoInput {
  return {
    nome: '',
    primeiroNome: '',
    sobrenome: '',
    telefone: '',
    email: '',
    cpf: '',
    rg: '',
    endereco: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    papel,
  }
}

export default function NovaCriancaPage() {
  const router = useRouter()
  const [primeiroNome, setPrimeiroNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [saude, setSaude] = useState('')
  const [endereco, setEndereco] = useState<EnderecoInput>({})
  const [contatos, setContatos] = useState<ContatoInput[]>([
    contatoVazio('responsavel'),
  ])
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function atualizarContato(i: number, patch: Partial<ContatoInput>) {
    setContatos((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    const res = await createCrianca({
      nome: '',
      primeiroNome,
      sobrenome,
      nascimento,
      saude,
      ...endereco,
      contatos,
    })
    if (!res.ok) {
      setErro(res.erro)
      setSalvando(false)
      return
    }
    // veio do play/kiosk (?de=...) → volta pra lá; senão, abre a ficha criada
    const de = new URLSearchParams(window.location.search).get('de')
    if (de === 'play') router.push('/playground')
    else if (de === 'kiosk') router.push('/kiosk')
    else router.push(`/criancas/${res.id}`)
  }

  return (
    <form onSubmit={salvar} className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/criancas" className="text-sm font-semibold text-slate-500">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🧒 Nova criança</h1>
      </div>

      <section className={`space-y-3 ${card}`}>
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
            placeholder="Alergias, restrições, observações…"
            className={input}
          />
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-600">
            👪 Contatos
          </h2>
          <button
            type="button"
            onClick={() => setContatos((cs) => [...cs, contatoVazio('responsavel')])}
            className="pop rounded-full bg-violet-100 px-3 py-1.5 text-sm font-semibold text-violet-700"
          >
            + Adicionar
          </button>
        </div>

        {contatos.map((c, i) => (
          <div key={i} className={`space-y-2 ${card}`}>
            <div className="flex items-center justify-between">
              <select
                value={c.papel}
                onChange={(e) =>
                  atualizarContato(i, { papel: e.target.value as ContatoInput['papel'] })
                }
                className="rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700"
              >
                {PAPEIS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {contatos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setContatos((cs) => cs.filter((_, idx) => idx !== i))}
                  className="text-sm font-semibold text-rose-500"
                >
                  Remover
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                required={c.papel === 'responsavel'}
                placeholder="Nome do contato"
                value={c.primeiroNome ?? ''}
                onChange={(e) => atualizarContato(i, { primeiroNome: e.target.value })}
                className={input}
              />
              <input
                placeholder="Sobrenome"
                value={c.sobrenome ?? ''}
                onChange={(e) => atualizarContato(i, { sobrenome: e.target.value })}
                className={input}
              />
            </div>
            <input
              type="tel"
              maxLength={15}
              placeholder="WhatsApp — (43) 99120-3404"
              value={c.telefone}
              onChange={(e) => atualizarContato(i, { telefone: formatarTelefoneBR(e.target.value) })}
              className={input}
            />
            <input
              type="email"
              placeholder="E-mail (opcional)"
              value={c.email}
              onChange={(e) => atualizarContato(i, { email: e.target.value })}
              className={input}
            />
            <EnderecoFields
              titulo="Endereço do contato"
              value={c}
              onChange={(enderecoAtualizado) => atualizarContato(i, enderecoAtualizado)}
            />
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                maxLength={14}
                placeholder="CPF (preferencial)"
                value={c.cpf}
                onChange={(e) => atualizarContato(i, { cpf: formatarCPF(e.target.value) })}
                className={input}
              />
              <input
                placeholder="RG (opcional)"
                value={c.rg}
                onChange={(e) => atualizarContato(i, { rg: e.target.value })}
                className={input}
              />
            </div>
          </div>
        ))}
      </section>

      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}

      <button type="submit" disabled={salvando} className={btnPrimary}>
        {salvando ? 'Salvando…' : 'Salvar ficha 💾'}
      </button>
    </form>
  )
}
