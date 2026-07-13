import { calcularLotacao, type NivelLotacao } from '@/lib/lotacao'

const CLS: Record<NivelLotacao, string> = {
  sem_limite: 'bg-sky-100 text-sky-700',
  ok: 'bg-emerald-100 text-emerald-700',
  quase: 'bg-amber-100 text-amber-700',
  lotado: 'bg-rose-100 text-rose-700',
}

// Chip compacto de lotação para a linha do título (play, quiosque e presença).
// Chamados da fila contam como ocupação (vaga reservada). Quando lota, mostra a
// previsão da próxima vaga (menor tempo contratado restante).
export default function LotacaoChip({
  presentes,
  capacidade,
  aCaminho = 0,
  proximaVagaMin = null,
}: {
  presentes: number
  capacidade: number | null
  aCaminho?: number
  proximaVagaMin?: number | null
}) {
  if (capacidade == null) {
    return (
      <span className={`shrink-0 rounded-full px-3 py-1.5 font-display text-sm font-bold ${CLS.sem_limite}`}>
        🧒 {presentes}
      </span>
    )
  }
  const lotacao = calcularLotacao(presentes + aCaminho, capacidade)

  let detalhe: string
  if (lotacao.vagas! > 0) detalhe = `${lotacao.vagas} vaga(s)`
  else if (proximaVagaMin == null) detalhe = 'sem previsão de vaga'
  else if (proximaVagaMin > 0) detalhe = `vaga ~${proximaVagaMin}min`
  else detalhe = 'vaga a qualquer momento'

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 font-display text-sm font-bold ${CLS[lotacao.nivel]}`}
      title={aCaminho > 0 ? `${aCaminho} chamada(s) da fila a caminho` : undefined}
    >
      🧒 {presentes}
      {aCaminho > 0 && <span className="opacity-70">+{aCaminho}</span>}/{capacidade} · {detalhe}
    </span>
  )
}
