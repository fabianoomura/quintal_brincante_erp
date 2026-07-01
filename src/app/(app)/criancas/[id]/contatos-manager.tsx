'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addContato, removeContato, type ContatoInput } from '../actions'
import { card, input, btnGrape } from '@/lib/ui'

type Papel = ContatoInput['papel']

type Contato = {
  papel: Papel
  id: string
  nome: string
  telefone: string | null
  email: string | null
}

const PAPEL_LABEL: Record<Papel, string> = {
  responsavel: 'Responsável',
  autorizado: 'Autorizado a retirar',
  emergencia: 'Emergência',
}

export default function ContatosManager({
  criancaId,
  contatos,
}: {
  criancaId: string
  contatos: Contato[]
}) {
  const router = useRouter()
  const [novo, setNovo] = useState<ContatoInput>({
    nome: '',
    telefone: '',
    email: '',
    papel: 'responsavel',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await addContato(criancaId, novo)
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setNovo({ nome: '', telefone: '', email: '', papel: 'responsavel' })
    router.refresh()
  }

  async function remover(contatoId: string, papel: Papel) {
    setOcupado(true)
    await removeContato(criancaId, contatoId, papel)
    setOcupado(false)
    router.refresh()
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold text-slate-600">👪 Contatos</h2>

      {contatos.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum contato cadastrado ainda. 🙂</p>
      )}

      <ul className="space-y-2">
        {contatos.map((c) => (
          <li
            key={`${c.id}-${c.papel}`}
            className={`flex items-center justify-between ${card}`}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{c.nome}</div>
              <div className="text-xs text-slate-500">
                {PAPEL_LABEL[c.papel]}
                {c.telefone ? ` · ${c.telefone}` : ''}
              </div>
            </div>
            <button
              onClick={() => remover(c.id, c.papel)}
              disabled={ocupado}
              className="shrink-0 text-sm font-semibold text-rose-500 disabled:opacity-50"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={adicionar} className={`space-y-2 ${card}`}>
        <div className="font-display text-base font-bold text-slate-600">
          ➕ Adicionar contato
        </div>
        <select
          value={novo.papel}
          onChange={(e) => setNovo({ ...novo, papel: e.target.value as Papel })}
          className="rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700"
        >
          {(Object.keys(PAPEL_LABEL) as Papel[]).map((p) => (
            <option key={p} value={p}>
              {PAPEL_LABEL[p]}
            </option>
          ))}
        </select>
        <input
          placeholder="Nome do contato"
          value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          className={input}
        />
        <input
          type="tel"
          placeholder="Telefone (WhatsApp)"
          value={novo.telefone}
          onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
          className={input}
        />
        <input
          type="email"
          placeholder="E-mail (opcional)"
          value={novo.email}
          onChange={(e) => setNovo({ ...novo, email: e.target.value })}
          className={input}
        />
        {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
        <button type="submit" disabled={ocupado} className={btnGrape}>
          Adicionar contato
        </button>
      </form>
    </section>
  )
}
