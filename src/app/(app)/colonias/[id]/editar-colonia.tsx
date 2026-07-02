'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarColonia, toggleColonia } from '../actions'
import { card, input, label, labelText } from '@/lib/ui'

type Colonia = {
  id: string
  nome: string
  inicio: string
  fim: string
  valor: number
  vagas: number | null
  ativo: boolean
}

export default function EditarColonia({ colonia }: { colonia: Colonia }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [f, setF] = useState({
    nome: colonia.nome,
    inicio: colonia.inicio,
    fim: colonia.fim,
    valor: String(colonia.valor),
    vagas: colonia.vagas != null ? String(colonia.vagas) : '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMsg(null)
    setOcupado(true)
    const res = await editarColonia(colonia.id, {
      nome: f.nome,
      inicio: f.inicio,
      fim: f.fim,
      valor: Number(f.valor),
      vagas: f.vagas.trim() === '' ? null : Number(f.vagas),
    })
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setMsg('Salvo. ✅')
    router.refresh()
  }

  async function alternar() {
    setOcupado(true)
    await toggleColonia(colonia.id, !colonia.ativo)
    setOcupado(false)
    router.refresh()
  }

  if (!aberto) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setAberto(true)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600"
        >
          ✏️ Editar colônia
        </button>
        <button
          onClick={alternar}
          disabled={ocupado}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
            colonia.ativo ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {colonia.ativo ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={salvar} className={`space-y-3 ${card}`}>
      <div className="font-display text-base font-bold text-slate-600">✏️ Editar colônia</div>
      <label className={label}>
        <span className={labelText}>Nome</span>
        <input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={label}>
          <span className={labelText}>Início</span>
          <input type="date" required value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} className={input} />
        </label>
        <label className={label}>
          <span className={labelText}>Fim</span>
          <input type="date" required value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} className={input} />
        </label>
        <label className={label}>
          <span className={labelText}>Valor (R$)</span>
          <input type="number" min={0} step="0.01" required value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className={input} />
        </label>
        <label className={label}>
          <span className={labelText}>Vagas</span>
          <input type="number" min={1} value={f.vagas} onChange={(e) => setF({ ...f, vagas: e.target.value })} placeholder="sem limite" className={input} />
        </label>
      </div>
      <p className="text-xs text-slate-400">
        Mudar o valor vale para as próximas inscrições — quem já se inscreveu mantém o valor.
      </p>
      {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      {msg && <p className="text-sm font-semibold text-emerald-600">{msg}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={ocupado} className="pop rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60">
          Salvar
        </button>
        <button type="button" onClick={() => setAberto(false)} className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-600">
          Fechar
        </button>
      </div>
    </form>
  )
}
