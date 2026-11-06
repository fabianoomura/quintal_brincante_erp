# Check-in lento e duplicidade — 05/11/2026

## Diagnóstico

O ERP e o Supabase respondiam, mas o controlador WhatsApp registrava falhas
repetidas. O último evento consultado da Evolution era `close`. As ações de
check-in e checkout aguardavam religamento/envio depois de gravar os registros,
mantendo a interface ocupada durante falhas de integração. Faltava proteção
única no banco para impedir dois check-ins concorrentes da mesma criança no Play.

## Correção

- Boas-vindas/autorização, agradecimento/fila e fila após desacordo usam `after`
  do Next.js por meio de `agendarPosOperacao`: resposta não aguarda WhatsApp.
- Não há promise solta: Next/Vercel mantêm o callback após devolver a resposta.
  Trata-se de execução best-effort, limitada pela duração da função, não de uma
  fila durável com retry garantido. A auditoria de notificações permanece.
- Retirada a chamada síncrona redundante de wake do check-in. O trigger SQL e o
  adapter gerenciado continuam responsáveis pelo religamento.
- Verificação antecipada na aplicação e índice parcial único por `crianca_id`
  para Play com `saida is null`, inclusive de outro dia. Entradas concluídas e
  outros módulos não mudam. Corridas são recusadas pelo banco com mensagem amigável.
- Reabertura via RPC transacional, SECURITY INVOKER/RLS: uma colisão reverte
  também a remoção da cobrança pendente. Pagamentos feitos impedem reabertura.
- A migration não remove nem encerra duplicidades existentes: se houver,
  falha e exige revisão. Na consulta anterior à implantação não havia abertas
  duplicadas. Nenhuma presença ou cobrança real foi alterada nesta correção.

## Verificação

182 testes unitários; teste SQL em container PostgreSQL 17 isolado, sem rede ou
portas, removido ao final: dois inserts concorrentes, histórico preservado,
reabertura recusada com cobrança preservada e reabertura válida. Typecheck/lint.

Migration: `20261105220000_play_entrada_unica.sql`. A reconexão do WhatsApp é
uma pendência distinta; remover a espera da interface não comprova o envio.
Não simular check-in ou cobrança de famílias em produção para testar velocidade.
