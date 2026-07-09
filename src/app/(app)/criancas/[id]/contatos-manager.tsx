'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addContato, removeContato, updateContato, type ContatoInput } from '../actions'
import { card, input, btnGrape } from '@/lib/ui'
import { formatarCPF } from '@/lib/cpf'
import { formatarTelefoneBR } from '@/lib/fone'
import { comporEndereco } from '@/lib/endereco'
import EnderecoFields from '../endereco-fields'

type Papel = ContatoInput['papel']

type Contato = {
  papel: Papel
  id: string
  nome: string
  primeiro_nome: string | null
  sobrenome: string | null
  telefone: string | null
  email: string | null
  cpf: string | null
  rg: string | null
  endereco: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
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
    papel: 'responsavel',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // edição inline: chave do contato em edição (id+papel) + formulário
  const [editando, setEditando] = useState<string | null>(null)
  const [edit, setEdit] = useState<ContatoInput>({
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
    papel: 'responsavel',
  })
  const [editErro, setEditErro] = useState<string | null>(null)

  function abrirEdicao(c: Contato) {
    setEditErro(null)
    setEditando(`${c.id}-${c.papel}`)
    setEdit({
      nome: c.nome,
      primeiroNome: c.primeiro_nome ?? c.nome,
      sobrenome: c.sobrenome ?? '',
      telefone: c.telefone ? formatarTelefoneBR(c.telefone) : '',
      email: c.email ?? '',
      cpf: c.cpf ? formatarCPF(c.cpf) : '',
      rg: c.rg ?? '',
      endereco: c.endereco ?? '',
      cep: c.cep ?? '',
      logradouro: c.logradouro ?? '',
      numero: c.numero ?? '',
      complemento: c.complemento ?? '',
      bairro: c.bairro ?? '',
      cidade: c.cidade ?? '',
      uf: c.uf ?? '',
      papel: c.papel,
    })
  }

  async function salvarEdicao(e: React.FormEvent, c: Contato) {
    e.preventDefault()
    setEditErro(null)
    setOcupado(true)
    try {
      const res = await updateContato(criancaId, c.id, c.papel, edit)
      if (!res.ok) {
        setEditErro(res.erro)
        return
      }
      setEditando(null)
      router.refresh()
    } catch (err) {
      setEditErro(`Falha ao salvar (${err instanceof Error ? err.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(false)
    }
  }

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
    setNovo({
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
      papel: 'responsavel',
    })
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
        {contatos.map((c) => {
          const chave = `${c.id}-${c.papel}`
          if (editando === chave) {
            return (
              <li key={chave} className={card}>
                <form onSubmit={(e) => salvarEdicao(e, c)} className="space-y-2">
                  <div className="font-display text-sm font-bold text-slate-600">✏️ Editando contato</div>
                  <select
                    value={edit.papel}
                    onChange={(e) => setEdit({ ...edit, papel: e.target.value as Papel })}
                    className="rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700"
                  >
                    {(Object.keys(PAPEL_LABEL) as Papel[]).map((p) => (
                      <option key={p} value={p}>{PAPEL_LABEL[p]}</option>
                    ))}
                  </select>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      required
                      placeholder="Nome do contato"
                      value={edit.primeiroNome ?? ''}
                      onChange={(e) => setEdit({ ...edit, primeiroNome: e.target.value })}
                      className={input}
                    />
                    <input
                      placeholder="Sobrenome"
                      value={edit.sobrenome ?? ''}
                      onChange={(e) => setEdit({ ...edit, sobrenome: e.target.value })}
                      className={input}
                    />
                  </div>
                  <input
                    type="tel"
                    maxLength={15}
                    placeholder="WhatsApp — (43) 99120-3404"
                    value={edit.telefone}
                    onChange={(e) => setEdit({ ...edit, telefone: formatarTelefoneBR(e.target.value) })}
                    className={input}
                  />
                  <input
                    type="email"
                    placeholder="E-mail (opcional)"
                    value={edit.email}
                    onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                    className={input}
                  />
                  <EnderecoFields
                    titulo="Endereço do contato"
                    value={edit}
                    onChange={(enderecoAtualizado) => setEdit({ ...edit, ...enderecoAtualizado })}
                  />
                  <div className="flex gap-2">
                    <input
                      inputMode="numeric"
                      maxLength={14}
                      placeholder="CPF (preferencial)"
                      value={edit.cpf}
                      onChange={(e) => setEdit({ ...edit, cpf: formatarCPF(e.target.value) })}
                      className={input}
                    />
                    <input
                      placeholder="RG (opcional)"
                      value={edit.rg}
                      onChange={(e) => setEdit({ ...edit, rg: e.target.value })}
                      className={input}
                    />
                  </div>
                  {editErro && <p className="text-sm font-semibold text-rose-500">{editErro}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={ocupado}
                      className="pop rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditando(null)}
                      className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </li>
            )
          }
          const enderecoTexto = comporEndereco(c) ?? c.endereco
          return (
            <li key={chave} className={`flex items-center justify-between ${card}`}>
              <div className="min-w-0">
                <div className="truncate font-semibold">{c.nome}</div>
                <div className="text-xs text-slate-500">
                  {PAPEL_LABEL[c.papel]}
                  {c.telefone ? ` · ${c.telefone}` : ''}
                  {c.cpf ? ` · CPF ${c.cpf}` : c.rg ? ` · RG ${c.rg}` : ''}
                  {enderecoTexto ? ` · ${enderecoTexto}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => abrirEdicao(c)}
                  disabled={ocupado}
                  className="text-sm font-semibold text-sky-600 disabled:opacity-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => remover(c.id, c.papel)}
                  disabled={ocupado}
                  className="text-sm font-semibold text-rose-500 disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </li>
          )
        })}
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
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            required
            placeholder="Nome do contato"
            value={novo.primeiroNome ?? ''}
            onChange={(e) => setNovo({ ...novo, primeiroNome: e.target.value })}
            className={input}
          />
          <input
            placeholder="Sobrenome"
            value={novo.sobrenome ?? ''}
            onChange={(e) => setNovo({ ...novo, sobrenome: e.target.value })}
            className={input}
          />
        </div>
        <input
          type="tel"
          maxLength={15}
          placeholder="WhatsApp — (43) 99120-3404"
          value={novo.telefone}
          onChange={(e) => setNovo({ ...novo, telefone: formatarTelefoneBR(e.target.value) })}
          className={input}
        />
        <input
          type="email"
          placeholder="E-mail (opcional)"
          value={novo.email}
          onChange={(e) => setNovo({ ...novo, email: e.target.value })}
          className={input}
        />
        <EnderecoFields
          titulo="Endereço do contato"
          value={novo}
          onChange={(enderecoAtualizado) => setNovo({ ...novo, ...enderecoAtualizado })}
        />
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            placeholder="CPF (preferencial)"
            value={novo.cpf}
            maxLength={14}
            onChange={(e) => setNovo({ ...novo, cpf: formatarCPF(e.target.value) })}
            className={input}
          />
          <input
            placeholder="RG (opcional)"
            value={novo.rg}
            onChange={(e) => setNovo({ ...novo, rg: e.target.value })}
            className={input}
          />
        </div>
        {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
        <button type="submit" disabled={ocupado} className={btnGrape}>
          Adicionar contato
        </button>
      </form>
    </section>
  )
}
