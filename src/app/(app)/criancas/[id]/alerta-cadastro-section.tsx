'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarAlertaCadastro } from '../actions'

export default function AlertaCadastroSection({
  criancaId,
  ativo,
  texto,
  alertaEm,
  alertaPor,
  ehAdmin,
}: {
  criancaId: string
  ativo: boolean
  texto: string | null
  alertaEm: string | null
  alertaPor: string | null
  ehAdmin: boolean
}) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [descricao, setDescricao] = useState(texto ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setErro(null)
    setOcupado(true)
    const res = await atualizarAlertaCadastro(criancaId, true, descricao)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setEditando(false)
    router.refresh()
  }

  async function retirar() {
    if (!window.confirm('Retirar a red flag deste cadastro? O histórico de ocorrências será mantido.')) {
      return
    }
    setErro(null)
    setOcupado(true)
    const res = await atualizarAlertaCadastro(criancaId, false, '')
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setEditando(false)
    setDescricao('')
    router.refresh()
  }

  if (!ativo && !ehAdmin) return null

  if (!ativo && !editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="rounded-2xl border border-dashed border-rose-300 bg-white px-4 py-3 text-left text-sm font-bold text-rose-700 hover:bg-rose-50"
      >
        🚩 Adicionar red flag ao cadastro
      </button>
    )
  }

  return (
    <section className="space-y-3 rounded-2xl bg-rose-50 p-4 ring-2 ring-rose-300">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-rose-800">🚩 Red flag no cadastro</h2>
          {ativo && !editando && (
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-rose-900">{texto}</p>
          )}
          {ativo && alertaEm && !editando && (
            <p className="mt-1 text-xs text-rose-600">
              Atualizada em {new Date(alertaEm).toLocaleString('pt-BR')}
              {alertaPor ? ` por ${alertaPor}` : ''}
            </p>
          )}
        </div>
        {ehAdmin && ativo && !editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200"
          >
            Editar alerta
          </button>
        )}
      </div>

      {editando && (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-rose-800">Informação importante para a equipe *</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Descreva o perfil, cuidado necessário ou ocorrido."
              className="w-full resize-y rounded-xl border border-rose-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-200"
              autoFocus
            />
          </label>
          {erro && <p className="text-sm font-semibold text-rose-700">{erro}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={ocupado}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {ocupado ? '…' : 'Salvar red flag'}
            </button>
            {ativo && (
              <button
                type="button"
                onClick={retirar}
                disabled={ocupado}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 disabled:opacity-50"
              >
                Retirar red flag
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditando(false)
                setDescricao(texto ?? '')
                setErro(null)
              }}
              disabled={ocupado}
              className="px-3 py-2 text-sm font-semibold text-slate-500 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
