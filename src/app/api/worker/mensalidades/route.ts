import { createAdminClient } from '@/lib/supabase/admin'
import { gerarMensalidades } from '@/lib/mensalidades'
import { hojeISO } from '@/lib/datas'

// Recorrência de mensalidade (pg_cron chama 1x/mês). Guardado por CRON_SECRET, service role.
// Idempotente — pode rodar quantas vezes quiser sem duplicar. Override: ?ano=&mes=.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const [ay, am] = hojeISO().split('-').map(Number)
  const ano = Number(url.searchParams.get('ano')) || ay
  const mes = Number(url.searchParams.get('mes')) || am

  const sb = createAdminClient()
  const res = await gerarMensalidades(sb, ano, mes)
  return Response.json({ ano, mes, ...res })
}
