'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from './modal'
import { baixaManual } from './financeiro/actions'
import type { Modalidade } from '@/lib/modalidades'
import { formatBRL } from '@/lib/dinheiro'

const OPCOES: { k: Modalidade; label: string; cls: string }[] = [
  { k: 'dinheiro', label: '💵 Dinheiro', cls: 'bg-emerald-600' },
  { k: 'pix', label: '📱 Pix', cls: 'bg-sky-600' },
  { k: 'debito', label: '💳 Débito', cls: 'bg-violet-600' },
  { k: 'credito', label: '💳 Crédito', cls: 'bg-fuchsia-600' },
]

// Pop-up de recebimento: abre após o check-out cobrado. Escolher a forma dá baixa
// imediata (vai pro Financeiro como pago). "Deixar pendente" mantém em aberto.
export default function RecebimentoModal({
  aberto,
  lancamentoId,
  valor,
  nome,
  onFechar,
}: {
  aberto: boolean
  lancamentoId: string | null
  valor: number
  nome: string
  onFechar: () => void
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function receber(m: Modalidade) {
    if (!lancamentoId) return
    setErro(null)
    setOcupado(m)
    try {
      const res = await baixaManual(lancamentoId, m)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      onFechar()
      router.refresh()
    } catch (e) {
      setErro(`Falha ao receber (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Modal open={aberto} onClose={onFechar} title="💰 Receber pagamento">
      <p className="text-sm text-slate-500">{nome}</p>
      <div className="my-3 text-center">
        <div className="font-display text-4xl font-bold text-emerald-700">{formatBRL(valor)}</div>
        <div className="text-xs text-slate-400">Como o responsável vai pagar?</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {OPCOES.map((o) => (
          <button
            key={o.k}
            onClick={() => receber(o.k)}
            disabled={!!ocupado}
            className={`pop rounded-2xl ${o.cls} py-5 font-display text-base font-bold text-white shadow-sm disabled:opacity-50`}
          >
            {ocupado === o.k ? '…' : o.label}
          </button>
        ))}
      </div>
      {erro && <p className="mt-2 text-sm font-semibold text-rose-500">{erro}</p>}
      <button
        onClick={onFechar}
        disabled={!!ocupado}
        className="mt-3 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-50"
      >
        Deixar pendente (recebo depois)
      </button>
    </Modal>
  )
}
