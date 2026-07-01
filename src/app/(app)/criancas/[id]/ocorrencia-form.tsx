'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia } from '../ocorrencia-action'
import { card, input, btnSky } from '@/lib/ui'
import type { Database } from '@/lib/database.types'

type Tipo = Database['public']['Enums']['tipo_ocorrencia']

const TIPOS: { value: Tipo; label: string }[] = [
  { value: 'nao_adaptou', label: '😟 Não se adaptou' },
  { value: 'banheiro', label: '🚻 Banheiro' },
  { value: 'saude', label: '🩹 Saúde' },
  { value: 'comportamento', label: '🧩 Comportamento' },
  { value: 'outro', label: '❓ Outro' },
]

export default function OcorrenciaForm({ criancaId }: { criancaId: string }) {
  const router = useRouter()
  const [tipo, setTipo] = useState<Tipo>('nao_adaptou')
  const [descricao, setDescricao] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const res = await registrarOcorrencia(criancaId, tipo, descricao)
    setOcupado(false)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setDescricao('')
    setMsg(res.notificou ? 'Responsável avisado no WhatsApp. ✅' : (res.aviso ?? 'Ocorrência registrada.'))
    router.refresh()
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold text-slate-600">📣 Ocorrência</h2>
      <form onSubmit={enviar} className={`space-y-2 ${card}`}>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Tipo)}
          className={input}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          placeholder="Detalhe (opcional) — vai na mensagem ao responsável"
          className={input}
        />
        {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
        {msg && <p className="text-sm font-semibold text-emerald-600">{msg}</p>}
        <button type="submit" disabled={ocupado} className={btnSky}>
          Avisar responsável 📲
        </button>
      </form>
    </section>
  )
}
