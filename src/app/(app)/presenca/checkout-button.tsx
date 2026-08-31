'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkOut, encerrarPlayPorDesacordo } from './actions'
import RecebimentoModal from '../recebimento-modal'
import Modal from '../modal'

export default function CheckoutButton({
  presencaId,
  nome = '',
  permiteDesacordo = false,
}: {
  presencaId: string
  nome?: string
  permiteDesacordo?: boolean
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [receb, setReceb] = useState<{
    lancamentoId: string | null
    valor: number
    nome: string
  } | null>(null)
  const [escolhaAberta, setEscolhaAberta] = useState(false)
  const [desacordoAberto, setDesacordoAberto] = useState(false)
  const [relato, setRelato] = useState('')
  const [marcarRedFlag, setMarcarRedFlag] = useState(true)

  async function sair() {
    setEscolhaAberta(false)
    setOcupado(true)
    try {
      const res = await checkOut(presencaId)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      if (res.valor != null && res.lancamentoId) {
        // refresh só quando o modal fechar (abrir e refresh juntos podia engolir o modal)
        setReceb({ lancamentoId: res.lancamentoId, valor: res.valor, nome: res.nome })
      } else {
        router.refresh()
      }
    } catch (e) {
      setErro(`Falha no check-out (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(false)
    }
  }

  async function encerrarDesacordo() {
    const descricao = relato.trim()
    if (descricao.length < 10) {
      setErro('Descreva o ocorrido com pelo menos 10 caracteres.')
      return
    }
    setOcupado(true)
    setErro(null)
    try {
      const res = await encerrarPlayPorDesacordo(presencaId, descricao, marcarRedFlag)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      setEscolhaAberta(false)
      setDesacordoAberto(false)
      setRelato('')
      router.refresh()
    } catch (e) {
      setErro(`Falha ao encerrar (${e instanceof Error ? e.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          if (permiteDesacordo) {
            setEscolhaAberta(true)
            setDesacordoAberto(false)
            setRelato('')
            setMarcarRedFlag(true)
            setErro(null)
          } else {
            void sair()
          }
        }}
        disabled={ocupado}
        className="pop shrink-0 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
      >
        {ocupado ? '…' : 'Check-out 👋'}
      </button>

      <Modal
        open={escolhaAberta}
        onClose={() => {
          if (ocupado) return
          setEscolhaAberta(false)
          setDesacordoAberto(false)
          setErro(null)
        }}
        title={desacordoAberto ? '⚠️ Encerrar por desacordo' : 'Confirmar check-out?'}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Encerrar a permanência{nome ? <> de <strong className="text-slate-800">{nome}</strong></> : ''}?
          </p>
          {!desacordoAberto ? (
            <>
              <button
                type="button"
                onClick={sair}
                disabled={ocupado}
                className="pop w-full rounded-2xl bg-slate-800 py-3.5 font-display text-base font-bold text-white disabled:opacity-60"
              >
                ✅ Encerrar normalmente
              </button>
              <button
                type="button"
                onClick={() => setDesacordoAberto(true)}
                disabled={ocupado}
                className="w-full rounded-2xl border-2 border-rose-200 bg-rose-50 py-3 text-sm font-bold text-rose-700 disabled:opacity-50"
              >
                ⚠️ Encerrar por desacordo — sem cobrar
              </button>
              <p className="text-center text-[11px] text-slate-400">
                Cortesia continua disponível na tela de recebimento.
              </p>
            </>
          ) : (
            <>
              <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200">
                Sem lançamento financeiro. O relato será registrado como ocorrência.
              </p>
              <textarea
                value={relato}
                onChange={(e) => setRelato(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Descreva objetivamente o desacordo ou ocorrido."
                className="w-full resize-y rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                autoFocus
              />
              <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={marcarRedFlag}
                  onChange={(e) => setMarcarRedFlag(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-rose-600"
                />
                <span className="text-sm font-bold text-rose-700">🚩 Marcar red flag no cadastro</span>
              </label>
              {erro && <p className="text-sm font-semibold text-rose-600">{erro}</p>}
              <button
                type="button"
                onClick={encerrarDesacordo}
                disabled={ocupado}
                className="pop w-full rounded-2xl bg-rose-600 py-3.5 font-display text-base font-bold text-white disabled:opacity-60"
              >
                {ocupado ? '…' : 'Confirmar saída sem cobrança'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesacordoAberto(false)
                  setErro(null)
                }}
                disabled={ocupado}
                className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-50"
              >
                Voltar
              </button>
            </>
          )}
        </div>
      </Modal>

      <RecebimentoModal
        aberto={receb != null}
        lancamentoId={receb?.lancamentoId ?? null}
        valor={receb?.valor ?? 0}
        nome={receb?.nome ?? ''}
        onFechar={() => {
          setReceb(null)
          router.refresh()
        }}
      />

      <Modal open={erro != null && !escolhaAberta} onClose={() => setErro(null)} title="Ops">
        <p className="text-sm text-slate-600">{erro}</p>
      </Modal>
    </>
  )
}
