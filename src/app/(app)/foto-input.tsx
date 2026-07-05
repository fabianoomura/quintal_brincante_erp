'use client'

import { useEffect, useRef, useState } from 'react'

// Reduz a imagem (máx. 480px) e devolve um JPEG compactado como data URL.
function comprimir(src: HTMLImageElement | HTMLVideoElement, w: number, h: number): string {
  const max = 480
  const escala = Math.min(1, max / Math.max(w, h))
  const cv = document.createElement('canvas')
  cv.width = Math.round(w * escala)
  cv.height = Math.round(h * escala)
  cv.getContext('2d')!.drawImage(src, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', 0.7)
}

export default function FotoInput({
  value,
  onChange,
}: {
  value: string | null
  onChange: (dataUrl: string | null) => void
}) {
  const [camera, setCamera] = useState(false)
  const [pronto, setPronto] = useState(false) // stream rodando no <video>
  const [erro, setErro] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function pararCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamera(false)
    setPronto(false)
  }

  useEffect(() => () => pararCamera(), [])

  // Prende o stream no <video> DEPOIS que ele existe no DOM (confiável, sem setTimeout).
  useEffect(() => {
    if (!camera || !videoRef.current || !streamRef.current) return
    const v = videoRef.current
    v.srcObject = streamRef.current
    v.play().catch(() => {})
  }, [camera])

  async function abrirCamera() {
    setErro(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      setCamera(true)
    } catch {
      setErro('Não consegui acessar a webcam (permissão negada?). Use “Enviar foto”.')
    }
  }

  function capturar() {
    const v = videoRef.current
    if (!v || v.videoWidth === 0) {
      setErro('A câmera ainda não carregou — espere a imagem aparecer.')
      return
    }
    onChange(comprimir(v, v.videoWidth, v.videoHeight))
    pararCamera()
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => onChange(comprimir(img, img.width, img.height))
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      {camera ? (
        <div className="mx-auto w-full max-w-xs space-y-2">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-200">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlaying={() => setPronto(true)}
              className="aspect-square w-full object-cover [transform:scaleX(-1)]"
            />
            {!pronto && (
              <div className="absolute inset-0 grid place-items-center text-sm font-semibold text-white/80">
                📷 Abrindo a câmera…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturar}
              disabled={!pronto}
              className="pop flex-1 rounded-xl bg-emerald-600 py-2 font-semibold text-white disabled:opacity-50"
            >
              📸 Capturar
            </button>
            <button type="button" onClick={pararCamera} className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-600">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="foto" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl">📷</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={abrirCamera} className="rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-700">
              📷 Webcam
            </button>
            <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
              📁 Enviar foto
              <input type="file" accept="image/*" onChange={aoEscolherArquivo} className="hidden" />
            </label>
            {value && (
              <button type="button" onClick={() => onChange(null)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-500">
                Remover
              </button>
            )}
          </div>
        </div>
      )}
      {erro && <p className="text-xs font-semibold text-rose-500">{erro}</p>}
    </div>
  )
}
