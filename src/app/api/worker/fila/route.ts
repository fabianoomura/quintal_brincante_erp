import { createAdminClient } from '@/lib/supabase/admin'
import { getSender } from '@/lib/whatsapp/adapter'
import { processarFila } from '@/lib/fila-processar'

// Worker da fila de espera do play. Chamado pelo pg_cron a cada poucos minutos.
// Expira chamadas cujo prazo de chegada estourou e chama as próximas quando há vaga
// (o check-out também processa a fila na hora — o cron cobre a expiração por no-show).
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const sb = createAdminClient()
  try {
    const resumo = await processarFila(sb, getSender())
    return Response.json(resumo)
  } catch (e) {
    return Response.json(
      { erro: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
