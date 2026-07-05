'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// Modal simples via portal no <body> (escapa de containers com backdrop-blur/transform).
// Mobile-first: sobe de baixo no celular, centraliza no desktop.
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
      >
        {title && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-slate-800">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xl leading-none text-slate-500 hover:bg-slate-200"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
