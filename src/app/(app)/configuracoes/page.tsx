import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ConfigToggle from './config-toggle'
import CapacidadeInput from './capacidade-input'
import TarifaForm from './tarifa-form'
import { requireAdmin } from '@/lib/colaborador'

export default async function ConfiguracoesPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data: cfg }, { data: tarifa }] = await Promise.all([
    supabase
      .from('config_sistema')
      .select('conciliacao_automatica, aviso_tempo_ativo, capacidade_dia')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('tarifa')
      .select('valor_hora, valor_fracao, tamanho_fracao_min, minimo_minutos, aviso_antecedencia_min')
      .eq('ativo', true)
      .limit(1)
      .maybeSingle(),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">⚙️ Configurações</h1>
      </div>

      <ConfigToggle
        campo="conciliacao_automatica"
        titulo="💳 Conciliação automática"
        descricao="Quando ligado, o webhook da InfinitePay dá baixa nos lançamentos sozinho. Desligado: tudo manual."
        inicial={cfg?.conciliacao_automatica ?? false}
      />

      <ConfigToggle
        campo="aviso_tempo_ativo"
        titulo="⏰ Aviso de tempo (WhatsApp)"
        descricao="Quando ligado, o worker avisa o responsável quando o tempo do play está acabando."
        inicial={cfg?.aviso_tempo_ativo ?? true}
      />

      <CapacidadeInput inicial={cfg?.capacidade_dia ?? null} />

      {tarifa && (
        <TarifaForm
          inicial={{
            valor_hora: Number(tarifa.valor_hora),
            valor_fracao: Number(tarifa.valor_fracao),
            tamanho_fracao_min: tarifa.tamanho_fracao_min,
            minimo_minutos: tarifa.minimo_minutos,
            aviso_antecedencia_min: tarifa.aviso_antecedencia_min,
          }}
        />
      )}
    </div>
  )
}
