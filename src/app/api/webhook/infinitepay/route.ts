import { createAdminClient } from '@/lib/supabase/admin'

// Webhook do Checkout/InfiniteTap da InfinitePay (spec §8, Etapa 1d).
// Atrás da flag config_sistema.conciliacao_automatica (default false):
//  - flag OFF → webhook é IGNORADO (ack 200, nada muda). Tudo roda manual.
//  - flag ON  → vira o lançamento p/ pago (conciliado_por='webhook'), sozinho.
// Alternar não exige mudança de código — só o valor da flag no banco.
// Idempotente: só age em lançamento 'pendente' (reentrega não paga em dobro).
//
// TODO(1d-real): quando as credenciais chegarem, trocar a checagem de token por verificação
// da ASSINATURA (HMAC) real da InfinitePay, e casar o order_nsu gerado na criação do Checkout.
export async function POST(request: Request) {
  const secret = process.env.INFINITEPAY_WEBHOOK_SECRET
  if (secret) {
    const token = request.headers.get('x-infinitepay-token')
    if (token !== secret) {
      return Response.json({ erro: 'assinatura inválida' }, { status: 401 })
    }
  }

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ erro: 'payload inválido' }, { status: 400 })

  const sb = createAdminClient()

  const { data: cfg } = await sb
    .from('config_sistema')
    .select('conciliacao_automatica')
    .eq('id', 1)
    .maybeSingle()

  // Flag OFF → ignora (mas dá ack p/ a InfinitePay não reenviar em loop).
  if (!cfg?.conciliacao_automatica) {
    return Response.json({ ignored: true, motivo: 'conciliacao_automatica=false' })
  }

  const orderNsu: string | null = body.order_nsu ?? body.order_id ?? null
  if (!orderNsu) {
    return Response.json({ erro: 'order_nsu ausente' }, { status: 400 })
  }

  const { data: lanc } = await sb
    .from('lancamento')
    .select('id, valor, status')
    .eq('order_nsu', orderNsu)
    .maybeSingle()
  if (!lanc) {
    return Response.json({ erro: 'lançamento não encontrado' }, { status: 404 })
  }

  // Idempotência: já conciliado → no-op.
  if (lanc.status === 'pago') {
    return Response.json({ ok: true, jaPago: true, lancamento: lanc.id })
  }

  const { error } = await sb
    .from('lancamento')
    .update({
      status: 'pago',
      conciliado_por: 'webhook',
      transaction_nsu: body.transaction_nsu ?? null,
      capture_method: body.capture_method ?? null,
      receipt_url: body.receipt_url ?? null,
      pago_em: new Date().toISOString(),
    })
    .eq('id', lanc.id)
    .eq('status', 'pendente')
  if (error) return Response.json({ erro: error.message }, { status: 500 })

  return Response.json({ ok: true, conciliado: lanc.id })
}
