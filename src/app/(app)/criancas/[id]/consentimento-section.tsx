'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarConsentimento, revogarConsentimento } from '../consentimento-action'

export default function ConsentimentoSection({
  criancaId,
  consentimentoEm,
  consentimentoPor,
  sugestaoResponsavel,
}: {
  criancaId: string
  consentimentoEm: string | null
  consentimentoPor: string | null
  sugestaoResponsavel: string
}) {
  const router = useRouter()
  const [nome, setNome] = useState(sugestaoResponsavel)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    const res = await registrarConsentimento(criancaId, nome)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    router.refresh()
  }

  async function revogar() {
    setOcupado(true)
    await revogarConsentimento(criancaId)
    setOcupado(false)
    router.refresh()
  }

  if (consentimentoEm) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
        <div className="text-sm">
          <span className="font-semibold text-emerald-800">✅ Consentimento LGPD registrado</span>
          <span className="text-emerald-700">
            {' '}
            por <strong>{consentimentoPor}</strong> em{' '}
            {new Date(consentimentoEm).toLocaleDateString('pt-BR')}
          </span>
        </div>
        <button
          onClick={revogar}
          disabled={ocupado}
          className="text-xs font-semibold text-rose-500 disabled:opacity-50"
        >
          revogar
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={registrar} className="space-y-2 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="text-sm font-semibold text-amber-800">
        ⚠️ Consentimento LGPD pendente
      </div>
      <p className="text-xs text-amber-700">
        Os dados da criança (cadastro, saúde e foto) exigem o consentimento do responsável.
        Registre quem autorizou:
      </p>
      <div className="flex gap-2">
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do responsável que consentiu"
          className="flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={ocupado}
          className="pop rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Registrar
        </button>
      </div>
      {erro && <p className="text-xs font-semibold text-rose-500">{erro}</p>}
    </form>
  )
}
