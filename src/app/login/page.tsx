'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { card, input, label, labelText, btnPrimary } from '@/lib/ui'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha inválidos.')
      setCarregando(false)
      return
    }
    router.replace('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-emerald-500 via-sky-600 to-violet-700 p-6">
      <form onSubmit={entrar} className={`w-full max-w-sm space-y-5 ${card}`}>
        <div className="text-center">
          <div className="text-5xl">🌳🧸</div>
          <h1 className="mt-2 text-2xl font-bold text-emerald-700">
            Quintal Brincante
          </h1>
          <p className="text-sm text-slate-500">Oi, equipe! Bora entrar 👋</p>
        </div>

        <label className={label}>
          <span className={labelText}>E-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>

        <label className={label}>
          <span className={labelText}>Senha</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={input}
          />
        </label>

        {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}

        <button type="submit" disabled={carregando} className={btnPrimary}>
          {carregando ? 'Entrando…' : 'Entrar 🚀'}
        </button>
      </form>
    </main>
  )
}
