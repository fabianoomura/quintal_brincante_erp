'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { ajudaDaRota } from '@/lib/ajuda'

// Botão "?" no cabeçalho. Abre uma explicação da tela atual (texto vem de src/lib/ajuda.ts).
export default function AjudaButton() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const ajuda = ajudaDaRota(pathname)

  // Fecha no Esc.
  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto])

  if (!ajuda) return null

  // O modal vai via portal para o <body>: o header tem backdrop-blur, que criaria um
  // containing block e prenderia o `fixed` lá no topo. No body, ele cobre a tela toda.
  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={() => setAberto(false)}
    >
          <div className="absolute inset-0 bg-black/40" />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-lg text-sky-600">
                  💡
                </span>
                <h2 className="font-display text-lg font-bold text-slate-800">{ajuda.titulo}</h2>
              </div>
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xl leading-none text-slate-500 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">{ajuda.texto}</p>

            {ajuda.dicas && ajuda.dicas.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {ajuda.dicas.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-sky-500">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setAberto(false)}
              className="pop mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white"
            >
              Entendi
            </button>
          </div>
        </div>
  )

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-label={`Ajuda: ${ajuda.titulo}`}
        title="O que é esta tela?"
        className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-base font-bold text-sky-600 ring-1 ring-sky-200 transition hover:bg-sky-200"
      >
        ?
      </button>
      {aberto && createPortal(modal, document.body)}
    </>
  )
}
