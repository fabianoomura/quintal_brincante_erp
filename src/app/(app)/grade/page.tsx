import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/colaborador'
import Planilha from './planilha'

export default async function GradePage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data: precos } = await supabase
    .from('preco_hora')
    .select('dia_semana, hora, valor')
    .order('hora')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-sm font-semibold text-slate-500">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold text-slate-700">🎠 Grade do play</h1>
      </div>

      <p className="text-sm text-slate-500">
        Digite o <strong>valor/hora</strong> em cada célula (dia × hora). A cobrança tem
        <strong> piso de 1 hora</strong> e é proporcional depois (ex.: 20/h → 1h15 = R$25).
        Feriados têm valor próprio no <Link href="/calendario" className="font-semibold text-orange-600">calendário</Link>.
      </p>

      <Planilha precos={(precos ?? []).map((p) => ({ ...p, valor: Number(p.valor) }))} />
    </div>
  )
}
