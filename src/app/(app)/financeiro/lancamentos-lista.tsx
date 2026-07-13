'use client'

import { useMemo, useState } from 'react'
import { formatBRL } from '@/lib/dinheiro'
import { card } from '@/lib/ui'
import BaixaButton from './baixa-button'

export type LancamentoUI = {
  id: string
  descricao: string
  valor: number
  desconto: number
  vencimento: string
  status: string
  nome: string // criança
}

const STATUS_CHIP: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-slate-200 text-slate-500',
}

// tira acentos e caixa p/ a busca ser "esperta" (mesmo padrão das outras listas)
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Lista de lançamentos com busca instantânea por criança — no balcão, o operador
// acha na hora o pagamento da família que está na frente dele.
export default function LancamentosLista({
  lancamentos,
  descontoAtivo,
}: {
  lancamentos: LancamentoUI[]
  descontoAtivo: boolean
}) {
  const [q, setQ] = useState('')

  const filtrados = useMemo(() => {
    const termo = norm(q.trim())
    if (termo === '') return lancamentos
    return lancamentos.filter((l) => norm(l.nome).includes(termo))
  }, [q, lancamentos])

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔎 Buscar por criança…"
        className="w-full rounded-2xl border-2 border-emerald-200 bg-white px-4 py-2.5 text-base outline-none focus:border-emerald-400"
      />

      {filtrados.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          {q.trim() ? 'Nenhum lançamento para essa busca. 🙈' : 'Nenhum lançamento neste filtro. 🧾'}
        </p>
      )}

      <ul className="grid gap-2 lg:grid-cols-2">
        {filtrados.map((l) => (
          <li key={l.id} className={`flex items-center justify-between ${card}`}>
            <div className="min-w-0">
              <div className="truncate font-semibold">{l.nome}</div>
              <div className="text-xs text-slate-500">
                {l.descricao} · vence {l.vencimento}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-lg font-bold text-slate-700">
                  {formatBRL(l.valor - l.desconto)}
                </span>
                {l.desconto > 0 && (
                  <span className="text-xs text-rose-500 line-through">{formatBRL(l.valor)}</span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_CHIP[l.status] ?? ''
                  }`}
                >
                  {l.status}
                </span>
              </div>
            </div>
            {l.status === 'pendente' && (
              <BaixaButton lancamentoId={l.id} valor={l.valor} descontoAtivo={descontoAtivo} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
