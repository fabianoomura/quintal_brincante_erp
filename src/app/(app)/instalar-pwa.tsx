'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstalarPwa() {
  const [evento, setEvento] = useState<InstallPromptEvent | null>(null)
  const [instalado, setInstalado] = useState(false)

  useEffect(() => {
    const modoStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (modoStandalone) return

    function disponivel(e: Event) {
      e.preventDefault()
      setEvento(e as InstallPromptEvent)
    }
    function instaladoAgora() {
      setInstalado(true)
      setEvento(null)
    }
    window.addEventListener('beforeinstallprompt', disponivel)
    window.addEventListener('appinstalled', instaladoAgora)
    return () => {
      window.removeEventListener('beforeinstallprompt', disponivel)
      window.removeEventListener('appinstalled', instaladoAgora)
    }
  }, [])

  if (!evento || instalado) return null

  async function instalar() {
    if (!evento) return
    await evento.prompt()
    const escolha = await evento.userChoice
    if (escolha.outcome === 'accepted') setInstalado(true)
    setEvento(null)
  }

  return (
    <button
      type="button"
      onClick={instalar}
      className="hidden rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-200 sm:inline-flex"
      title="Instalar o Quintal Brincante neste aparelho"
    >
      ⬇️ Instalar app
    </button>
  )
}
