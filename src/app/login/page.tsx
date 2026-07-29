'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
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
    router.replace('/sistema')
    router.refresh()
  }

  return (
    <main className={styles.page}>
      <div className={styles.glowTop} aria-hidden="true" />
      <div className={styles.glowBottom} aria-hidden="true" />

      <Link href="/" className={styles.homeLink}>
        <span aria-hidden="true">←</span> Voltar para a apresentação
      </Link>

      <section className={styles.loginShell} aria-label="Acesso ao ERP Quintal Brincante">
        <aside className={styles.brandPanel}>
          <div className={styles.brand}>
            <Image src="/icon-192.png" alt="" width={48} height={48} priority />
            <div>
              <strong>Quintal Brincante</strong>
              <span>ERP da operação</span>
            </div>
          </div>

          <div className={styles.brandMessage}>
            <span className={styles.eyebrow}>
              <i aria-hidden="true" /> Ambiente da equipe
            </span>
            <h1>O dia começa mais organizado por aqui.</h1>
            <p>
              Play, escolinha, colônia e gestão conectados para a equipe cuidar
              do que realmente importa.
            </p>
          </div>

          <div className={styles.operationFlow} aria-label="Áreas conectadas no ERP">
            <div><span>🎠</span><small>Play</small></div>
            <i aria-hidden="true" />
            <div><span>🌈</span><small>Escolinha</small></div>
            <i aria-hidden="true" />
            <div><span>🏕️</span><small>Colônia</small></div>
            <i aria-hidden="true" />
            <div><span>📊</span><small>Gestão</small></div>
          </div>

          <p className={styles.techCredit}>
            Tecnologia por <strong>Atl4s</strong>
          </p>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.mobileBrand}>
            <Image src="/icon-192.png" alt="" width={42} height={42} />
            <div><strong>Quintal Brincante</strong><span>ERP da operação</span></div>
          </div>

          <div className={styles.formIntro}>
            <span>Acesso seguro</span>
            <h2>Olá, equipe!</h2>
            <p>Entre com seu e-mail e senha para continuar.</p>
          </div>

          <form onSubmit={entrar} className={styles.form}>
            <label>
              <span>E-mail</span>
              <div className={styles.inputWrap}>
                <span aria-hidden="true">@</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  autoFocus
                />
              </div>
            </label>

            <label>
              <span>Senha</span>
              <div className={styles.inputWrap}>
                <span aria-hidden="true">●</span>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={mostrarSenha}
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </label>

            {erro && (
              <p className={styles.error} role="alert">
                <span aria-hidden="true">!</span> {erro}
              </p>
            )}

            <button type="submit" disabled={carregando} className={styles.submit}>
              {carregando ? (
                <>
                  <i className={styles.spinner} aria-hidden="true" />
                  Entrando…
                </>
              ) : (
                <>Entrar no sistema <span aria-hidden="true">→</span></>
              )}
            </button>
          </form>

          <p className={styles.accessNote}>
            <span aria-hidden="true">🔒</span>
            Acesso exclusivo para colaboradores autorizados.
          </p>
        </div>
      </section>
    </main>
  )
}
