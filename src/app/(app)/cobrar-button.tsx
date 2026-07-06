'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from './modal'
import RecebimentoModal from './recebimento-modal'
import { cobrarPresenca } from './presenca/actions'

// Sessão concluída SEM cobrança (grade vazia no check-in): define o valor,
// cria o lançamento e já abre o pop-up de recebimento.
export default function CobrarButton({
  presencaId,
  nome,
}: {
  presencaId: string
  nome: string
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [receb, setReceb] = useState<{ lancamentoId: string; valor: number } | null>(null)

  async function cobrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    try {
      const res = await cobrarPresenca(presencaId, Number(valor))
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      setAberto(false)
      setReceb({ lancamentoId: res.lancamentoId, valor: Number(valor) })
    } catch (err) {
      setErro(`Falha ao cobrar (${err instanceof Error ? err.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="pop shrink-0 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm"
      >
        💰 Cobrar
      </button>

      <Modal open={aberto} onClose={() => setAberto(false)} title="💰 Cobrar sessão">
        <p className="text-sm text-slate-500">
          {nome} — esta sessão terminou sem valor na grade. Defina quanto cobrar:
        </p>
        <form onSubmit={cobrar} className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">R$</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              inputMode="decimal"
              required
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-lg font-bold"
            />
          </div>
          {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
          <button
            type="submit"
            disabled={ocupado || !(Number(valor) > 0)}
            className="pop w-full rounded-xl bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {ocupado ? 'Criando cobrança…' : 'Cobrar e receber →'}
          </button>
        </form>
      </Modal>

      <RecebimentoModal
        aberto={receb != null}
        lancamentoId={receb?.lancamentoId ?? null}
        valor={receb?.valor ?? 0}
        nome={nome}
        onFechar={() => {
          setReceb(null)
          router.refresh()
        }}
      />
    </>
  )
}
