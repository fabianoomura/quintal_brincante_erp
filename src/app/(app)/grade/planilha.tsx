'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salvarPrecos } from './actions'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HORAS = Array.from({ length: 15 }, (_, i) => i + 8) // 08h..22h

type Celula = { dia_semana: number; hora: number; valor: number }

export default function Planilha({ precos }: { precos: Celula[] }) {
  const router = useRouter()
  // valores[dia][hora] = string
  const inicial: Record<string, string> = {}
  for (const p of precos) inicial[`${p.dia_semana}-${p.hora}`] = String(p.valor)
  const [vals, setVals] = useState<Record<string, string>>(inicial)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function set(dia: number, hora: number, v: string) {
    setVals((s) => ({ ...s, [`${dia}-${hora}`]: v }))
  }

  async function salvar() {
    setMsg(null)
    setErro(null)
    setOcupado(true)
    const celulas: { dia: number; hora: number; valor: number }[] = []
    for (const dia of [0, 1, 2, 3, 4, 5, 6]) {
      for (const hora of HORAS) {
        const raw = vals[`${dia}-${hora}`]
        if (raw != null && raw.trim() !== '') celulas.push({ dia, hora, valor: Number(raw) })
      }
    }
    const res = await salvarPrecos(celulas)
    setOcupado(false)
    if (!res.ok) return setErro(res.erro)
    setMsg('Planilha salva. ✅')
    router.refresh()
  }

  // preenche uma coluna (dia) inteira com o valor da 1ª célula preenchida — atalho
  function replicarColuna(dia: number) {
    const primeiro = HORAS.map((h) => vals[`${dia}-${h}`]).find((v) => v && v.trim() !== '')
    if (!primeiro) return
    setVals((s) => {
      const n = { ...s }
      for (const h of HORAS) if (n[`${dia}-${h}`]?.trim()) n[`${dia}-${h}`] = primeiro
      return n
    })
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              <th className="p-1 text-xs text-slate-400">hora</th>
              {DIAS.map((d, i) => (
                <th key={i} className="p-1 text-xs font-bold text-slate-500">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map((hora) => (
              <tr key={hora}>
                <td className="p-1 text-xs font-semibold text-slate-400">{String(hora).padStart(2, '0')}h</td>
                {[0, 1, 2, 3, 4, 5, 6].map((dia) => (
                  <td key={dia} className="p-0.5">
                    <input
                      inputMode="decimal"
                      value={vals[`${dia}-${hora}`] ?? ''}
                      onChange={(e) => set(dia, hora, e.target.value)}
                      placeholder="—"
                      className="w-full min-w-[44px] rounded border border-slate-200 px-1 py-1 text-center text-sm focus:border-emerald-400 focus:bg-emerald-50"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={salvar} disabled={ocupado} className="pop rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {ocupado ? 'Salvando…' : 'Salvar planilha'}
        </button>
        <span className="text-xs text-slate-400">Célula vazia = fechado. Valores em R$/hora.</span>
        {erro && <span className="text-sm font-semibold text-rose-500">{erro}</span>}
        {msg && <span className="text-sm font-semibold text-emerald-600">{msg}</span>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-slate-400">Replicar 1º valor na coluna:</span>
        {DIAS.map((d, i) => (
          <button key={i} onClick={() => replicarColuna(i)} className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}
