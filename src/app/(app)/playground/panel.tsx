'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { checkIn, checkOut, pausarPresenca, retomarPresenca } from '../presenca/actions'
import { abrirConversaDoResponsavel } from '../conversas/actions'
import { entrarNaFila } from './fila-actions'
import { duracaoMinutos, precoHoraCheia } from '@/lib/tarifador'
import { pausaSegundos } from '@/lib/playground'
import { agoraMs } from '@/lib/datas'
import { formatBRL } from '@/lib/dinheiro'
import AvisosRapidos, { type AvisoRapido } from '../avisos-rapidos'
import BuscaCrianca from '../busca-crianca'
import RecebimentoModal from '../recebimento-modal'
import Modal from '../modal'
import FilaEspera, { type FilaItem } from './fila-espera'

type Presente = {
  id: string
  criancaId: string
  entrada: string // 'HH:MM:SS'
  tempoContratadoMin: number | null
  nome: string
  foto: string | null
  tarifaHora: number | null // valor/hora do período travado no check-in
  autorizacaoImagem: boolean | null // null = pendente · true = ok · false = não usar
  naoLidas: number // mensagens não lidas na conversa do responsável (badge 💬)
  pausadaEm: string | null // ISO; não-nulo = pausada agora (cronômetro parado)
  pausaTotalSeg: number // segundos já acumulados em pausas retomadas
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
  toleranciaMin = 0,
  capacidadePlay = null,
  fila = [],
  filaToleranciaMin = 10,
  descontoAtivo = false,
}: {
  presentes: Presente[]
  criancas: { id: string; nome: string }[]
  avisos: AvisoRapido[]
  toleranciaMin?: number
  capacidadePlay?: number | null
  fila?: FilaItem[]
  filaToleranciaMin?: number
  descontoAtivo?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [agora, setAgora] = useState(agoraHHMM())
  const [nowMs, setNowMs] = useState(agoraMs()) // tick p/ a pausa em curso (ms)
  const [criancaId, setCriancaId] = useState('')
  const [tempo, setTempo] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // cadastro completo (mesma ficha da tela Crianças); volta pra cá depois de salvar
  const linkCadastro = `/criancas/nova?de=${pathname === '/kiosk' ? 'kiosk' : 'play'}`

  // Relógio: re-renderiza a cada 20s p/ atualizar cronômetros e custos.
  useEffect(() => {
    const t = setInterval(() => {
      setAgora(agoraHHMM())
      setNowMs(agoraMs())
    }, 20000)
    return () => clearInterval(t)
  }, [])

  async function entrar() {
    if (!criancaId) return
    setErro(null)
    setOcupado('checkin')
    try {
      const res = await checkIn({
        criancaId,
        origem: 'espaco_kids',
        entrada: agoraHHMM(),
        tempoContratadoMin: tempo.trim() !== '' ? Number(tempo) : null,
      })
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      if (res.semTarifa) {
        setSaida(
          '⚠️ Entrada registrada SEM valor na grade para este horário — o play NÃO será cobrado. Confira a Grade (valores).',
        )
        setTimeout(() => setSaida(null), 15000)
      }
      setCriancaId('')
      setTempo('')
      router.refresh()
    } catch (err) {
      setErro(
        `Não consegui registrar (${err instanceof Error ? err.message : 'erro inesperado'}). Tente de novo.`,
      )
    } finally {
      setOcupado(null)
    }
  }

  const [saida, setSaida] = useState<string | null>(null)
  // recebimento: aberto após um check-out cobrado (presencaId permite reabrir por engano)
  const [receb, setReceb] = useState<{ lancamentoId: string | null; valor: number; nome: string; presencaId: string } | null>(null)
  // confirmação antes do check-out (evita saída sem querer)
  const [confirmar, setConfirmar] = useState<{ p: Presente; decorrido: number; valor: number | null } | null>(null)
  // card com o leque de avisos rápidos aberto (botão ⚡)
  const [avisosAbertos, setAvisosAbertos] = useState<string | null>(null)

  // Abre a conversa WhatsApp do responsável, carimbando criança+presença nas
  // mensagens enviadas de lá (histórico da permanência).
  async function conversar(p: Presente) {
    setOcupado(`conversa-${p.id}`)
    try {
      const res = await abrirConversaDoResponsavel(p.criancaId)
      if (!res.ok) {
        setSaida(`❌ ${res.erro}`)
        setTimeout(() => setSaida(null), 6000)
        return
      }
      router.push(`/conversas/${res.conversaId}?crianca=${p.criancaId}&presenca=${p.id}`)
    } catch (err) {
      setSaida(`❌ Não consegui abrir a conversa (${err instanceof Error ? err.message : 'erro'}).`)
    } finally {
      setOcupado(null)
    }
  }

  // Pausa/retoma o cronômetro (criança precisou sair um instante). O tempo pausado
  // não é cobrado nem conta pro aviso; o card congela até retomar.
  async function alternarPausa(p: Presente) {
    setOcupado(`pausa-${p.id}`)
    try {
      const res = p.pausadaEm ? await retomarPresenca(p.id) : await pausarPresenca(p.id)
      if (!res.ok) {
        setSaida(`❌ ${res.erro}`)
        setTimeout(() => setSaida(null), 6000)
        return
      }
      router.refresh()
    } catch (err) {
      setSaida(`❌ Não consegui ${p.pausadaEm ? 'retomar' : 'pausar'} (${err instanceof Error ? err.message : 'erro'}).`)
    } finally {
      setOcupado(null)
    }
  }

  async function sair(p: Presente) {
    setOcupado(p.id)
    try {
      const res = await checkOut(p.id)
      if (!res.ok) {
        setSaida(`❌ ${res.erro}`)
        router.refresh()
        return
      }
      if (res.valor != null && res.lancamentoId) {
        // abre o pop-up de recebimento; o refresh fica pra quando ele FECHAR
        // (refresh junto da abertura podia remontar a página e engolir o modal)
        setReceb({ lancamentoId: res.lancamentoId, valor: res.valor, nome: res.nome || p.nome, presencaId: p.id })
      } else {
        setSaida(`✅ ${p.nome} saiu.`)
        setTimeout(() => setSaida(null), 6000)
        router.refresh()
      }
    } catch (err) {
      setSaida(`❌ Não consegui registrar a saída (${err instanceof Error ? err.message : 'erro'}). Tente de novo.`)
    } finally {
      setOcupado(null)
    }
  }

  // Confirmação do check-out (pop-up): só encerra após o operador confirmar.
  async function confirmarCheckout() {
    if (!confirmar) return
    const p = confirmar.p
    setConfirmar(null)
    await sair(p)
  }

  // Coloca a criança selecionada na fila (botão aparece só quando lotado).
  async function paraFila() {
    if (!criancaId) return
    setErro(null)
    setOcupado('fila')
    try {
      const res = await entrarNaFila(criancaId)
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      setCriancaId('')
      setTempo('')
      router.refresh()
    } catch (err) {
      setErro(`Não consegui adicionar à fila (${err instanceof Error ? err.message : 'erro'}).`)
    } finally {
      setOcupado(null)
    }
  }

  // Lotação do play: quem foi CHAMADO da fila tem vaga reservada, então conta.
  const chamadasACaminho = fila.filter((f) => f.status === 'chamada').length
  const lotado =
    capacidadePlay != null && presentes.length + chamadasACaminho >= capacidadePlay

  return (
    <div className="space-y-3">
      {/* toast de check-out (melhor que alert em tablet) */}
      {saida && (
        <div className="rounded-2xl bg-slate-800 px-4 py-3 font-semibold text-white shadow-md">
          {saida}
        </div>
      )}

      {/* Entrada única: busca + Entrar; lotou, aparece o + Fila do lado */}
      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-base font-bold text-slate-600">🚀 Entrada rápida</div>
          <Link
            href={linkCadastro}
            className="pop shrink-0 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm"
          >
            + Cadastrar criança
          </Link>
        </div>
        <BuscaCrianca criancas={criancas} value={criancaId} onChange={setCriancaId} />
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="Tempo (min) — opcional"
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-50/40 px-4 py-3 text-base"
          />
          <button
            onClick={entrar}
            disabled={!criancaId || !!ocupado}
            className="pop rounded-full bg-fuchsia-600 px-6 py-3 font-display text-lg font-bold text-white shadow-sm disabled:opacity-50"
          >
            {ocupado === 'checkin' ? '…' : 'Entrar'}
          </button>
          {lotado && (
            <button
              onClick={paraFila}
              disabled={!criancaId || !!ocupado}
              className="pop rounded-full bg-amber-500 px-5 py-3 font-display text-lg font-bold text-white shadow-sm disabled:opacity-50"
            >
              {ocupado === 'fila' ? '…' : '+ Fila'}
            </button>
          )}
        </div>
        {erro && <p className="text-sm font-semibold text-rose-500">{erro}</p>}
      </div>

      {/* Fila em pills — some quando vazia */}
      <FilaEspera fila={fila} toleranciaMin={filaToleranciaMin} />

      {presentes.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          Ninguém no playground agora. 🎈
        </p>
      )}

      {/* Cards com cronômetro ao vivo, em ordem de chegada */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {presentes.map((p) => {
          const pausada = p.pausadaEm != null
          // Tempo pausado (acumulado + pausa em curso) descontado do decorrido: enquanto
          // pausada o cronômetro e o valor congelam.
          const pausaMin =
            pausaSegundos(
              p.pausaTotalSeg,
              p.pausadaEm ? Date.parse(p.pausadaEm) : null,
              nowMs,
            ) / 60
          const decorrido = Math.max(0, Math.ceil(duracaoMinutos(p.entrada, agora) - pausaMin))
          const valor =
            p.tarifaHora != null
              ? precoHoraCheia(decorrido, p.tarifaHora, toleranciaMin)
              : null
          const restante =
            p.tempoContratadoMin != null ? p.tempoContratadoMin - decorrido : null
          const estourou = !pausada && restante != null && restante <= 0
          const acabando = !pausada && restante != null && restante > 0 && restante <= 15

          return (
            <div
              key={p.id}
              className={`space-y-1.5 rounded-2xl p-3 shadow-sm ${
                pausada
                  ? 'bg-indigo-50 ring-2 ring-indigo-300'
                  : estourou
                    ? 'bg-rose-50 ring-1 ring-black/5'
                    : acabando
                      ? 'bg-amber-50 ring-1 ring-black/5'
                      : 'bg-white ring-1 ring-black/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    {p.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-base">🧒</span>
                    )}
                  </span>
                  <span className="truncate font-display text-base font-bold">{p.nome}</span>
                  {p.autorizacaoImagem === null ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700" title="Autorização de imagem pendente">
                      📸?
                    </span>
                  ) : p.autorizacaoImagem ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700" title="Imagem autorizada">
                      📸✓
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700" title="NÃO usar imagem">
                      📸✕
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">{p.entrada.slice(0, 5)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span
                  className={`font-display text-xl font-bold ${
                    pausada ? 'text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  {pausada && '⏸ '}
                  {fmtDuracao(decorrido)}
                </span>
                <span className="font-display text-lg font-bold text-emerald-700">
                  {valor != null ? formatBRL(valor) : '—'}
                </span>
              </div>
              {pausada && (
                <div className="text-[11px] font-semibold text-indigo-600">
                  ⏸ Pausado — o tempo não está contando
                </div>
              )}
              {restante != null && p.tempoContratadoMin != null && (
                <div className="space-y-0.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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
                    className={`text-[11px] font-semibold ${
                      estourou ? 'text-rose-600' : acabando ? 'text-amber-600' : 'text-slate-500'
                    }`}
                  >
                    {estourou
                      ? `⏰ passou ${fmtDuracao(-restante)} do contratado`
                      : `faltam ${fmtDuracao(restante)} de ${fmtDuracao(p.tempoContratadoMin)}`}
                  </div>
                </div>
              )}
              {/* Linha 1: pausar/retomar + check-out (o valor ao vivo já aparece no card) */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => alternarPausa(p)}
                  disabled={ocupado === `pausa-${p.id}`}
                  aria-label={pausada ? `Retomar tempo de ${p.nome}` : `Pausar tempo de ${p.nome}`}
                  className={`pop min-w-0 flex-1 truncate rounded-xl py-2 text-sm font-bold text-white disabled:opacity-60 ${
                    pausada ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                >
                  {ocupado === `pausa-${p.id}` ? '…' : pausada ? '▶ Retomar' : '⏸ Pausar'}
                </button>
                <button
                  onClick={() => setConfirmar({ p, decorrido, valor })}
                  disabled={ocupado === p.id}
                  className="pop min-w-0 flex-1 truncate rounded-xl bg-slate-800 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {ocupado === p.id ? '…' : 'Check-out'}
                </button>
              </div>
              {/* Linha 2: conversa · avisos rápidos · editar ficha */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => conversar(p)}
                  disabled={ocupado === `conversa-${p.id}`}
                  aria-label={`WhatsApp do responsável de ${p.nome}`}
                  className="pop relative grid place-items-center rounded-xl bg-emerald-50 py-2 text-base ring-1 ring-emerald-200 disabled:opacity-60"
                >
                  💬
                  {p.naoLidas > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold text-white">
                      {p.naoLidas}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAvisosAbertos(avisosAbertos === p.id ? null : p.id)}
                  aria-label={`Avisos rápidos para ${p.nome}`}
                  className={`pop grid place-items-center rounded-xl py-2 text-base ring-1 disabled:opacity-60 ${
                    avisosAbertos === p.id
                      ? 'bg-amber-100 ring-amber-300'
                      : 'bg-amber-50 ring-amber-200'
                  }`}
                >
                  ⚡
                </button>
                <Link
                  href={`/criancas/${p.criancaId}`}
                  aria-label={`Editar cadastro de ${p.nome}`}
                  className="pop grid place-items-center rounded-xl bg-sky-50 py-2 text-base ring-1 ring-sky-200"
                >
                  ✏️
                </Link>
              </div>
              {avisosAbertos === p.id && (
                <div className="border-t border-slate-100 pt-1.5">
                  <AvisosRapidos criancaId={p.criancaId} avisos={avisos} presencaId={p.id} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirmação antes do check-out — evita saída sem querer */}
      {confirmar && (
        <Modal open onClose={() => setConfirmar(null)} title="Confirmar check-out?">
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Encerrar a permanência de <strong className="text-slate-800">{confirmar.p.nome}</strong>?
            </p>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="font-display text-xl font-bold text-slate-700">
                {fmtDuracao(confirmar.decorrido)}
              </span>
              <span className="font-display text-xl font-bold text-emerald-700">
                {confirmar.valor != null ? formatBRL(confirmar.valor) : '—'}
              </span>
            </div>
            <button
              onClick={confirmarCheckout}
              disabled={ocupado === confirmar.p.id}
              className="pop w-full rounded-2xl bg-slate-800 py-3.5 font-display text-lg font-bold text-white shadow-sm disabled:opacity-60"
            >
              {ocupado === confirmar.p.id ? '…' : '✅ Confirmar check-out'}
            </button>
            <button
              onClick={() => setConfirmar(null)}
              disabled={ocupado === confirmar.p.id}
              className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      <RecebimentoModal
        aberto={receb != null}
        lancamentoId={receb?.lancamentoId ?? null}
        valor={receb?.valor ?? 0}
        nome={receb?.nome ?? ''}
        presencaId={receb?.presencaId ?? null}
        descontoAtivo={descontoAtivo}
        onFechar={() => {
          setReceb(null)
          router.refresh()
        }}
      />
    </div>
  )
}
