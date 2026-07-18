'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from './modal'
import { baixaManual } from './financeiro/actions'
import { reabrirCheckout } from './presenca/actions'
import type { Modalidade } from '@/lib/modalidades'
import { formatBRL } from '@/lib/dinheiro'

// Sem opção "maquininha": pix, débito e crédito JÁ acontecem na maquininha —
// aqui registra-se a modalidade, não o aparelho.
const OPCOES: { k: Modalidade; label: string; cls: string }[] = [
  { k: 'dinheiro', label: '💵 Dinheiro', cls: 'bg-emerald-600' },
  { k: 'pix', label: '📱 Pix', cls: 'bg-sky-600' },
  { k: 'debito', label: '💳 Débito', cls: 'bg-violet-600' },
  { k: 'credito', label: '💳 Crédito', cls: 'bg-fuchsia-600' },
]

// Pop-up de recebimento — o MESMO fluxo no play (pós check-out) e no Financeiro.
// Valor editável, desconto opcional (quando a flag está ligada) e baixa imediata
// na forma escolhida. "Deixar pendente" mantém em aberto.
export default function RecebimentoModal({
  aberto,
  lancamentoId,
  valor,
  nome,
  onFechar,
  descontoAtivo = false,
  presencaId = null,
}: {
  aberto: boolean
  lancamentoId: string | null
  valor: number
  nome: string
  onFechar: () => void
  descontoAtivo?: boolean
  // Quando vem de um check-out do play: habilita "reabrir por engano" (antes de pagar).
  presencaId?: string | null
}) {
  if (!aberto) return null

  return (
    <RecebimentoConteudo
      key={`${lancamentoId ?? 'sem-lancamento'}-${valor}`}
      lancamentoId={lancamentoId}
      valor={valor}
      nome={nome}
      onFechar={onFechar}
      descontoAtivo={descontoAtivo}
      presencaId={presencaId}
    />
  )
}

function RecebimentoConteudo({
  lancamentoId,
  valor,
  nome,
  onFechar,
  descontoAtivo,
  presencaId,
}: {
  lancamentoId: string | null
  valor: number
  nome: string
  onFechar: () => void
  descontoAtivo: boolean
  presencaId: string | null
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [valorDigitado, setValorDigitado] = useState(valor.toFixed(2))
  const [tipoDesc, setTipoDesc] = useState<'%' | 'R$'>('%')
  const [desc, setDesc] = useState('')

  const valorEditado = Number(valorDigitado.replace(',', '.'))
  const valorValido = Number.isFinite(valorEditado) && valorEditado > 0

  function descontoReais(): number {
    const n = Number(desc.replace(',', '.'))
    if (!(n > 0) || !valorValido) return 0
    const bruto = tipoDesc === '%' ? (valorEditado * n) / 100 : n
    return Math.round(bruto * 100) / 100
  }
  const descAplicado = descontoAtivo ? descontoReais() : 0

  async function receber(m: Modalidade) {
    if (!lancamentoId) return
    if (!valorValido) {
      setErro('Informe um valor maior que zero.')
      return
    }
    setErro(null)
    setOcupado(m)
    try {
      const res = await baixaManual(lancamentoId, m, descAplicado, valorEditado)
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

  // Check-out por engano: reabre a presença (mantém a entrada), some com a cobrança
  // pendente e manda uma desculpa ao responsável.
  async function reabrir() {
    if (!presencaId) return
    setErro(null)
    setOcupado('reabrir')
    try {
      const res = await reabrirCheckout(presencaId)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      onFechar()
      router.refresh()
    } catch (e) {
      setErro(`Falha ao reabrir (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
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
        {descontoAtivo && (
          <div className="mx-auto mt-2 flex max-w-48 items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">🏷️ Desconto</span>
            <input
              type="text"
              inputMode="decimal"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="0"
              aria-label="Desconto"
              className="w-16 rounded-xl border border-slate-300 px-2 py-1 text-right text-sm font-bold"
            />
            <button
              type="button"
              onClick={() => setTipoDesc(tipoDesc === '%' ? 'R$' : '%')}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"
            >
              {tipoDesc}
            </button>
          </div>
        )}
        {descAplicado > 0 && valorValido && (
          <div className="mt-1 text-xs font-semibold text-rose-500">
            desconto {formatBRL(descAplicado)} → recebe {formatBRL(Math.max(0, valorEditado - descAplicado))}
          </div>
        )}
        <div className="mt-2 text-xs text-slate-400">Como o responsável vai pagar?</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {OPCOES.map((o, i) => (
          <button
            key={o.k}
            onClick={() => receber(o.k)}
            disabled={!!ocupado || !valorValido}
            className={`pop rounded-2xl ${o.cls} py-5 font-display text-base font-bold text-white shadow-sm disabled:opacity-50 ${
              i === OPCOES.length - 1 && OPCOES.length % 2 === 1 ? 'col-span-2' : ''
            }`}
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
      {presencaId && (
        <button
          onClick={reabrir}
          disabled={!!ocupado}
          className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-amber-700 underline underline-offset-2 disabled:opacity-50"
        >
          {ocupado === 'reabrir' ? '…' : '↩️ Foi engano — reabrir check-out'}
        </button>
      )}
    </Modal>
  )
}
