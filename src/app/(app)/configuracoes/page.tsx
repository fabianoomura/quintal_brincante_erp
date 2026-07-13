import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ConfigToggle from './config-toggle'
import CapacidadeInput from './capacidade-input'
import CapacidadePlayInput from './capacidade-play-input'
import FilaToleranciaInput from './fila-tolerancia-input'
import AntecedenciaInput from './antecedencia-input'
import ToleranciaInput from './tolerancia-input'
import DescontoIrmao from './desconto-irmao'
import { requireAdmin } from '@/lib/colaborador'

export default async function ConfiguracoesPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: cfg } = await supabase
    .from('config_sistema')
    .select('conciliacao_automatica, aviso_tempo_ativo, capacidade_dia, capacidade_play, fila_tolerancia_min, aviso_antecedencia_min, tolerancia_min, desconto_ativo, desconto_irmao_percentual')
    .eq('id', 1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">⚙️ Configurações</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Espaço e play
        </h2>
        <CapacidadeInput inicial={cfg?.capacidade_dia ?? null} />
        <CapacidadePlayInput inicial={cfg?.capacidade_play ?? null} />
        <FilaToleranciaInput inicial={cfg?.fila_tolerancia_min ?? 10} />
        <ToleranciaInput inicial={cfg?.tolerancia_min ?? 0} />
        <Link
          href="/grade"
          className="pop flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <div>
            <div className="font-display text-base font-bold text-slate-700">🎠 Preços do play</div>
            <p className="text-sm text-slate-500">Horários e valores por período (grade).</p>
          </div>
          <span className="text-slate-300">›</span>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Avisos WhatsApp
        </h2>
        <ConfigToggle
          campo="aviso_tempo_ativo"
          titulo="⏰ Aviso de tempo (WhatsApp)"
          descricao="Quando ligado, o worker avisa o responsável quando o tempo do play está acabando."
          inicial={cfg?.aviso_tempo_ativo ?? true}
        />
        <AntecedenciaInput inicial={cfg?.aviso_antecedencia_min ?? 15} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Financeiro
        </h2>
        <ConfigToggle
          campo="conciliacao_automatica"
          titulo="💳 Conciliação automática"
          descricao="Quando ligado, o webhook da InfinitePay dá baixa nos lançamentos sozinho. Desligado: tudo manual."
          inicial={cfg?.conciliacao_automatica ?? false}
        />
        <ConfigToggle
          campo="desconto_ativo"
          titulo="🏷️ Desconto na baixa"
          descricao="Quando ligado, o operador pode aplicar um desconto (% ou R$) ao marcar um pagamento como pago."
          inicial={cfg?.desconto_ativo ?? false}
        />
        <DescontoIrmao inicial={cfg?.desconto_irmao_percentual != null ? Number(cfg.desconto_irmao_percentual) : null} />
      </section>
    </div>
  )
}
