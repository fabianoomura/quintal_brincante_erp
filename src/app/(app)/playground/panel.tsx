'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkIn, checkOut } from '../presenca/actions'
import { cadastroRapido } from '../criancas/actions'
import { duracaoMinutos, precoProporcional } from '@/lib/tarifador'
import { formatBRL } from '@/lib/dinheiro'
import AvisosRapidos, { type AvisoRapido } from '../avisos-rapidos'
import FotoInput from '../foto-input'

type Presente = {
  id: string
  criancaId: string
  entrada: string // 'HH:MM:SS'
  tempoContratadoMin: number | null
  nome: string
  foto: string | null
  tarifaHora: number | null // valor/hora do período travado no check-in
}

function agoraHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDuracao(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

export default function PlaygroundPanel({
  presentes,
  criancas,
  avisos,
}: {
  presentes: Presente[]
  criancas: { id: string; nome: string }[]
  avisos: AvisoRapido[]
}) {
  const router = useRouter()
  const [agora, setAgora] = useState(agoraHHMM())
  const [criancaId, setCriancaId] = useState('')
  const [tempo, setTempo] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // cadastro rápido
  const [cadastro, setCadastro] = useState(false)
  const [nNome, setNNome] = useState('')
  const [nResp, setNResp] = useState('')
  const [nTel, setNTel] = useState('')
  const [nCpf, setNCpf] = useState('')
  const [nRg, setNRg] = useState('')
  const [nFoto, setNFoto] = useState<string | null>(null)
  const [cadErro, setCadErro] = useState<string | null>(null)

  async function salvarCadastro(e: React.FormEvent) {
    e.preventDefault()
    setCadErro(null)
    setOcupado('cadastro')
    const res = await cadastroRapido({
      nome: nNome,
      respNome: nResp,
      telefone: nTel,
      cpf: nCpf,
      rg: nRg,
      foto: nFoto,
    })
    setOcupado(null)
    if (!res.ok) {
      setCadErro(res.erro)
      return
    }
    setCriancaId(res.id) // já seleciona p/ o check-in
    setCadastro(false)
    setNNome('')
    setNResp('')
    setNTel('')
    setNCpf('')
    setNRg('')
    setNFoto(null)
    router.refresh()
  }

  // Relógio: re-renderiza a cada 20s p/ atualizar cronômetros e custos.
  useEffect(() => {
    const t = setInterval(() => setAgora(agoraHHMM()), 20000)
    return () => clearInterval(t)
  }, [])

  async function entrar() {
    if (!criancaId) return
    setErro(null)
    setOcupado('checkin')
    const res = await checkIn({
      criancaId,
      origem: 'espaco_kids',
      entrada: agoraHHMM(),
      tempoContratadoMin: tempo.trim() !== '' ? Number(tempo) : null,
    })
    setOcupado(null)
    if (!res.ok) {
      setErro(res.erro)
      return
    }
    setCriancaId('')
    setTempo('')
    router.refresh()
  }

  const [saida, setSaida] = useState<string | null>(null)

  async function sair(p: Presente) {
    setOcupado(p.id)
    const res = await checkOut(p.id)
    setOcupado(null)
    if (res.ok) {
      setSaida(
        res.valor != null
          ? `✅ ${p.nome} saiu · ${formatBRL(res.valor)} (pendente no financeiro)`
          : `✅ ${p.nome} saiu.`,
      )
      setTimeout(() => setSaida(null), 6000)
    } else {
      setSaida(`❌ ${res.erro}`)
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* toast de check-out (melhor que alert em tablet) */}
      {saida && (
        <div className="rounded-2xl bg-slate-800 px-4 py-3 font-semibold text-white shadow-md">
          {saida}
        </div>
      )}

      {/* Check-in rápido */}
      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="font-display text-base font-bold text-slate-600">🚀 Entrada rápida</div>
        <select
          value={criancaId}
          onChange={(e) => setCriancaId(e.target.value)}
          className="w-full rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-50/40 px-4 py-3 text-base"
        >
          <option value="">Selecione a criança…</option>
          {criancas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Tempo (min) — opcional"
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            className="flex-1 rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-50/40 px-4 py-3 text-base"
          />
          <button
            onClick={entrar}
            disabled={!criancaId || ocupado === 'checkin'}
            className="pop rounded-full bg-fuchsia-600 px-6 py-3 font-display text-lg font-bold text-white shadow-sm disabled:opacity-50"
          >
            Entrar
          </button>
        </div>
        {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}

        {!cadastro ? (
          <button
            type="button"
            onClick={() => setCadastro(true)}
            className="text-sm font-semibold text-fuchsia-700"
          >
            + Não encontrou? Cadastro rápido
          </button>
        ) : (
          <form onSubmit={salvarCadastro} className="space-y-2 rounded-xl bg-fuchsia-50 p-3">
            <div className="text-sm font-bold text-fuchsia-700">🧒 Cadastro rápido</div>
            <FotoInput value={nFoto} onChange={setNFoto} />
            <input
              required
              placeholder="Nome da criança"
              value={nNome}
              onChange={(e) => setNNome(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                placeholder="Responsável (nome)"
                value={nResp}
                onChange={(e) => setNResp(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              />
              <input
                type="tel"
                placeholder="WhatsApp"
                value={nTel}
                onChange={(e) => setNTel(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              />
              <input
                inputMode="numeric"
                placeholder="CPF do responsável"
                value={nCpf}
                onChange={(e) => setNCpf(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              />
              <input
                placeholder="RG (opcional)"
                value={nRg}
                onChange={(e) => setNRg(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
              />
            </div>
            <p className="text-xs text-slate-400">CPF preferencial (LGPD). RG opcional.</p>
            {cadErro && <p className="text-sm font-semibold text-rose-500">{cadErro}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={ocupado === 'cadastro'}
                className="pop flex-1 rounded-xl bg-fuchsia-600 py-2 font-semibold text-white disabled:opacity-60"
              >
                {ocupado === 'cadastro' ? 'Salvando…' : 'Cadastrar e selecionar'}
              </button>
              <button
                type="button"
                onClick={() => setCadastro(false)}
                className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-600"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {presentes.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          Ninguém no playground agora. 🎈
        </p>
      )}

      {/* Cards com cronômetro ao vivo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {presentes.map((p) => {
          const decorrido = Math.max(0, Math.ceil(duracaoMinutos(p.entrada, agora)))
          const valor = p.tarifaHora != null ? precoProporcional(decorrido, p.tarifaHora) : null
          const restante =
            p.tempoContratadoMin != null ? p.tempoContratadoMin - decorrido : null
          const estourou = restante != null && restante <= 0
          const acabando = restante != null && restante > 0 && restante <= 15

          return (
            <div
              key={p.id}
              className={`space-y-2 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 ${
                estourou ? 'bg-rose-50' : acabando ? 'bg-amber-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    {p.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">🧒</span>
                    )}
                  </span>
                  <span className="truncate font-display text-lg font-bold">{p.nome}</span>
                </div>
                <span className="shrink-0 text-xs text-slate-400">entrou {p.entrada.slice(0, 5)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl font-bold text-slate-700">
                  {fmtDuracao(decorrido)}
                </span>
                <span className="font-display text-xl font-bold text-emerald-700">
                  {valor != null ? formatBRL(valor) : '—'}
                </span>
              </div>
              {restante != null && p.tempoContratadoMin != null && (
                <div className="space-y-1">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        estourou ? 'bg-rose-500' : acabando ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((decorrido / p.tempoContratadoMin) * 100))}%`,
                      }}
                    />
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      estourou ? 'text-rose-600' : acabando ? 'text-amber-600' : 'text-slate-500'
                    }`}
                  >
                    {estourou
                      ? `⏰ passou ${fmtDuracao(-restante)} do contratado`
                      : `faltam ${fmtDuracao(restante)} de ${fmtDuracao(p.tempoContratadoMin)}`}
                  </div>
                </div>
              )}
              <button
                onClick={() => sair(p)}
                disabled={ocupado === p.id}
                className="pop w-full rounded-xl bg-slate-800 py-2.5 font-bold text-white disabled:opacity-60"
              >
                {ocupado === p.id ? '…' : valor != null ? `Check-out · ${formatBRL(valor)}` : 'Check-out'}
              </button>

              <div className="border-t border-slate-100 pt-2">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Avisar responsável
                </div>
                <AvisosRapidos criancaId={p.criancaId} avisos={avisos} presencaId={p.id} compact />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
