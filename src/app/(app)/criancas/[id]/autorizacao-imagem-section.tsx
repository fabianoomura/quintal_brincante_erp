'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  registrarAutorizacaoImagem,
  limparAutorizacaoImagem,
} from '../autorizacao-imagem-action'

// Autorização de USO DE IMAGEM (foto/vídeo nos registros do espaço) — separada do
// consentimento LGPD de dados. A pergunta vai por WhatsApp no check-in do play; a
// equipe registra a resposta aqui.
export default function AutorizacaoImagemSection({
  criancaId,
  autorizacao,
  autorizacaoEm,
}: {
  criancaId: string
  autorizacao: boolean | null
  autorizacaoEm: string | null
}) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function registrar(autorizado: boolean) {
    setErro(null)
    setOcupado(true)
    const res = await registrarAutorizacaoImagem(criancaId, autorizado)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    router.refresh()
  }

  async function limpar() {
    setOcupado(true)
    await limparAutorizacaoImagem(criancaId)
    setOcupado(false)
    router.refresh()
  }

  if (autorizacao !== null) {
    const ok = autorizacao
    return (
      <div
        className={`flex items-center justify-between rounded-2xl p-4 ring-1 ${
          ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'
        }`}
      >
        <div className="text-sm">
          <span className={`font-semibold ${ok ? 'text-emerald-800' : 'text-rose-800'}`}>
            {ok ? '📸 ✅ Uso de imagem autorizado' : '📸 🚫 Uso de imagem NÃO autorizado'}
          </span>
          {autorizacaoEm && (
            <span className={ok ? 'text-emerald-700' : 'text-rose-700'}>
              {' '}
              em {new Date(autorizacaoEm).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
        <button
          onClick={limpar}
          disabled={ocupado}
          className="text-xs font-semibold text-slate-500 disabled:opacity-50"
        >
          limpar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="text-sm font-semibold text-amber-800">📸 Autorização de imagem pendente</div>
      <p className="text-xs text-amber-700">
        A pergunta é enviada por WhatsApp no check-in do play. Quando o responsável responder
        (SIM/NÃO) — ou confirmar pessoalmente — registre aqui:
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => registrar(true)}
          disabled={ocupado}
          className="pop rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          ✅ Autorizou
        </button>
        <button
          onClick={() => registrar(false)}
          disabled={ocupado}
          className="pop rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          🚫 Negou
        </button>
      </div>
      {erro && <p className="text-xs font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
