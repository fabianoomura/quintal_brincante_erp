'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarColaborador, setColaboradorAtivo, setColaboradorPapel } from './actions'
import { input, label, labelText } from '@/lib/ui'
import type { Database } from '@/lib/database.types'

type Papel = Database['public']['Enums']['papel_acesso']

export default function ColaboradorRow({
  id,
  nome,
  funcao,
  telefone,
  papel,
  ativo,
  ehVoce,
}: {
  id: string
  nome: string
  funcao: string | null
  telefone: string | null
  papel: Papel
  ativo: boolean
  ehVoce: boolean
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [nomeEditado, setNomeEditado] = useState(nome)
  const [funcaoEditada, setFuncaoEditada] = useState(funcao ?? '')
  const [telefoneEditado, setTelefoneEditado] = useState(telefone ?? '')

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await atualizarColaborador(id, {
      nome: nomeEditado,
      funcao: funcaoEditada,
      telefone: telefoneEditado,
    })
    setOcupado(false)
    if (!res.ok) setErro(res.erro)
    else {
      setEditando(false)
      router.refresh()
    }
  }

  async function togglePapel() {
    setErro(null)
    setOcupado(true)
    const res = await setColaboradorPapel(id, papel === 'admin' ? 'operador' : 'admin')
    setOcupado(false)
    if (!res.ok) setErro(res.erro)
    else router.refresh()
  }

  async function toggleAtivo() {
    setErro(null)
    setOcupado(true)
    const res = await setColaboradorAtivo(id, !ativo)
    setOcupado(false)
    if (!res.ok) setErro(res.erro)
    else router.refresh()
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-semibold">
            {nome}
            {ehVoce && <span className="ml-1 text-xs text-slate-400">(você)</span>}
          </div>
          <div className="text-xs text-slate-500">
            {funcao ?? 'sem função'}
            {telefone && ` · ${telefone}`}
            {!ativo && ' · inativo'}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            papel === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          {papel}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setEditando((valor) => !valor)}
          disabled={ocupado}
          className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-700 disabled:opacity-40"
        >
          {editando ? 'Cancelar edição' : '✏️ Editar'}
        </button>
        <button
          onClick={togglePapel}
          disabled={ocupado || ehVoce}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40"
        >
          {papel === 'admin' ? '↓ Tornar operador' : '↑ Tornar admin'}
        </button>
        <button
          onClick={toggleAtivo}
          disabled={ocupado || ehVoce}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${
            ativo ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {ativo ? 'Desativar' : 'Reativar'}
        </button>
      </div>
      {editando && (
        <form onSubmit={salvarEdicao} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">
          <label className={label}>
            <span className={labelText}>Nome</span>
            <input
              required
              value={nomeEditado}
              onChange={(e) => setNomeEditado(e.target.value)}
              className={input}
            />
          </label>
          <label className={label}>
            <span className={labelText}>Função</span>
            <input
              value={funcaoEditada}
              onChange={(e) => setFuncaoEditada(e.target.value)}
              className={input}
            />
          </label>
          <label className={label}>
            <span className={labelText}>Telefone</span>
            <input
              inputMode="tel"
              value={telefoneEditado}
              onChange={(e) => setTelefoneEditado(e.target.value)}
              placeholder="(43) 99999-9999"
              className={input}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={ocupado}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {ocupado ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}
      {erro && <p className="mt-2 text-sm font-semibold text-rose-500">{erro}</p>}
    </li>
  )
}
