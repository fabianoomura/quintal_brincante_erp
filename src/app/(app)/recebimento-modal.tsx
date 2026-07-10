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
  if (!aberto) return null

  return (
    <RecebimentoConteudo
      key={`${lancamentoId ?? 'sem-lancamento'}-${valor}`}
      lancamentoId={lancamentoId}
      valor={valor}
      nome={nome}
      onFechar={onFechar}
    />
  )
}

function RecebimentoConteudo({
  lancamentoId,
  valor,
  nome,
  onFechar,
}: {
  lancamentoId: string | null
  valor: number
  nome: string
  onFechar: () => void
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [valorDigitado, setValorDigitado] = useState(valor.toFixed(2))

  const valorEditado = Number(valorDigitado.replace(',', '.'))
  const valorValido = Number.isFinite(valorEditado) && valorEditado > 0

  async function receber(m: Modalidade) {
    if (!lancamentoId) return
    if (!valorValido) {
      setErro('Informe um valor maior que zero.')
      return
    }
    setErro(null)
    setOcupado(m)
    try {
      const res = await baixaManual(lancamentoId, m, 0, valorEditado)
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
    <Modal open onClose={onFechar} title="💰 Receber pagamento">
      <p className="text-sm text-slate-500">{nome}</p>
      <div className="my-3 text-center">
        <div className="font-display text-4xl font-bold text-emerald-700">
          {valorValido ? formatBRL(valorEditado) : '—'}
        </div>
        <label className="mx-auto mt-2 block max-w-48 text-left">
          <span className="mb-1 block text-xs font-bold text-slate-500">✏️ Valor a receber</span>
          <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
            <span className="font-bold text-slate-500">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={valorDigitado}
              onChange={(e) => setValorDigitado(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-right text-lg font-bold outline-none"
              aria-label="Valor a receber"
            />
          </div>
        </label>
        <div className="text-xs text-slate-400">Como o responsável vai pagar?</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {OPCOES.map((o) => (
          <button
            key={o.k}
            onClick={() => receber(o.k)}
            disabled={!!ocupado || !valorValido}
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
