# WhatsApp via Evolution API (não-oficial)

Decisão do dono (2026-07-05): usar API **não-oficial** (Evolution API, que usa Baileys
por baixo) em vez da Meta oficial. O `EvolutionSender` está implementado no adapter e o
aviso real de tempo do play foi validado em produção em **2026-07-09**.

**Como funciona:** o Evolution é um servidor que fica **logado no WhatsApp do número
dedicado** (como WhatsApp Web). O sistema chama a API REST dele e a mensagem sai desse número.

---

## Status atual

- Provider usado: `WHATSAPP_PROVIDER=evolution`
- Instância: `quintal`
- Uso principal: avisos operacionais aos responsáveis
- Aviso de tempo: validado com envio real
- Templates: editáveis em `/mensagens`; a Evolution envia o texto renderizado diretamente
- Variáveis principais: `{{responsavel_nome}}`, `{{crianca_nome}}`, `{{minutos_restantes}}`
  e `{{detalhe}}`, vindas do catálogo `mensagem_variavel`
- Avisos rápidos do play: até 6 ativos por vez, ordenados pela tela de mensagens

O `CloudSender` da Meta oficial segue implementado em stand-by. Voltar para a Meta é troca de
envs e revisão dos templates aprovados.

---

## Riscos e cuidados

- **É contra os termos do WhatsApp.** O número pode ser **banido**. Por isso:
  - Use um **chip dedicado**, nunca o número pessoal.
  - Volume baixo e mensagens úteis (nosso caso: avisos aos responsáveis) reduzem o risco.
  - Evite mandar para quem nunca conversou com o número; peça aos responsáveis para salvarem
    o contato e mandarem um "oi" no primeiro dia.
- **Respostas dos pais** chegam no WhatsApp do número dedicado. Dá para acompanhar pelo celular
  ou pelo painel do Evolution.
- A regra do projeto continua: este número é dos avisos operacionais. **Marketing nunca usa
  este número.**
- Conectar um chip sincroniza contatos/conversas para o banco do Evolution. "Disconnect" não
  apaga esses dados; para zerar, delete a instância.

---

## Subir ou recriar a Evolution API

O Evolution precisa de um servidor ligado 24/7. Opções:

| Opção | Custo | Nota |
|---|---|---|
| **Railway / Render** | ~US$5/mês | Mais fácil: deploy por template, sem gerenciar servidor. |
| **VPS barata** (Hetzner, Contabo, Oracle Free) | ~R$20–30/mês (Oracle: grátis) | Mais controle. Precisa instalar Docker. |
| PC no espaço | zero | Só se ficar ligado sempre; não recomendado. |

Com Docker (VPS):

```bash
docker run -d --name evolution \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=ESCOLHA_UMA_CHAVE_FORTE \
  -v evolution_instances:/evolution/instances \
  atendai/evolution-api:latest
```

Depois:

1. Acesse `http://SEU_SERVIDOR:8080/manager` (login = a chave acima).
2. Crie uma instância, por exemplo `quintal`.
3. Clique em **Connect** para gerar o QR code.
4. No celular com o chip dedicado: WhatsApp → Aparelhos conectados → Conectar aparelho →
   escaneie o QR.
5. Coloque HTTPS na frente (Caddy/Traefik/Cloudflare Tunnel/Railway URL pública).

Pegadinha já vista: se o QR falhar com erro de conexão do dispositivo, confira a env
`CONFIG_SESSION_PHONE_VERSION` no servidor Evolution. Ela precisa acompanhar uma versão atual
do WhatsApp Web.

---

## Envs do sistema

No `.env.local` e na Vercel:

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_URL=https://evo.seudominio.com
EVOLUTION_API_KEY=A_CHAVE_QUE_VOCE_ESCOLHEU
EVOLUTION_INSTANCE=quintal
EVOLUTION_WEBHOOK_SECRET=UM_SEGREDO_LONGO_SO_PARA_O_WEBHOOK
```

Depois de alterar env na Vercel, faça redeploy.

Teste rápido direto, sem o sistema:

```bash
curl -X POST "https://evo.seudominio.com/message/sendText/quintal" \
  -H "apikey: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"number":"5543999999999","text":"Teste do Quintal"}'
```

No Windows, prefira Node/fetch ou um cliente HTTP que preserve UTF-8 se o texto tiver acentos
ou emojis.

---

## Webhook → Central de Conversas

A Central de Conversas (`/conversas` no sistema) guarda o histórico operacional no banco do ERP.
Desde a alteração de 28/10/2026, o webhook só importa mensagens de telefones presentes em
`contato` (com ou sem o nono dígito). Números sem cadastro são ignorados antes de gravar
conversa, conteúdo ou payload. A existência de uma conversa antiga não libera o número.
Para as mensagens **recebidas** chegarem lá, a instância precisa apontar o webhook para o
app (evento `MESSAGES_UPSERT`). Configuração (uma vez, via REST da Evolution):

```bash
curl -X POST "https://evo.seudominio.com/webhook/set/quintal" \
  -H "apikey: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://quintal-brincante-erp.vercel.app/api/webhooks/evolution?secret=UM_SEGREDO_LONGO_SO_PARA_O_WEBHOOK",
      "webhook_by_events": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

- O `secret` da URL tem que ser o MESMO da env `EVOLUTION_WEBHOOK_SECRET` na Vercel.
- Sem a env configurada, o endpoint responde 503 e não processa nada (fail-closed).
- Conferir a config: `GET https://evo.seudominio.com/webhook/find/quintal` (header `apikey`).
- Grupos, status e broadcast são ignorados; mensagem sem texto (mídia/figurinha) entra
  como "[conteúdo não suportado]" com o payload cru guardado em `raw_payload`.
- Reentrega não duplica (índice único por `provider_msg_id` na conversa).
- Falha de banco devolve HTTP 500 para permitir reentrega; descarte intencional de número
  sem cadastro devolve HTTP 200. O cadastro posterior volta a permitir novas mensagens,
  mas mensagens descartadas não são recuperadas automaticamente.
- Responsáveis cadastrados continuam podendo responder fora do horário do Play e após
  o check-out. Esta mudança não liga/desliga a Evolution nem filtra por presença ativa.

---

## Limpeza automática de conversas não identificadas (28/10/2026)

**Ativação:** aplicar o arquivo inteiro
`supabase/migrations/20261028120000_retencao_conversas_nao_identificadas.sql`
no Supabase e publicar o código do webhook. Não exige nova variável de ambiente.
A migration instala/confere `pg_cron`; se a extensão não puder ser habilitada, a migration
falha, em vez de deixar uma automação apenas aparente. A primeira limpeza ocorre no próximo
agendamento (não durante a aplicação da migration).

- Execução diária às **03h20 de São Paulo** (06h20 UTC), até **500 conversas por execução**.
- Exclui conversa e mensagens em cascata somente após **mais de 7 dias sem atividade**,
  quando não há contato correspondente nem vínculo operacional. A data de inserção também
  é conferida: histórico antigo recém-importado não é apagado imediatamente.
- Antes de excluir, confere novamente o cadastro, inclusive máscara de telefone e nono
  dígito, vinculando automaticamente os casos com uma única correspondência. Havendo
  mais de um contato possível, preserva a conversa sem escolher uma pessoa.
- Preserva conversas identificadas, mensagens vinculadas a criança/presença, mensagens
  enviadas por colaborador e **qualquer mensagem de saída**, inclusive do próprio celular.
  Portanto, algumas conversas ainda podem aparecer como “não identificadas” e serem
  corretamente preservadas por segurança.
- Revalida as proteções sob lock antes de excluir. Falha na execução reverte a transação;
  o cron tenta novamente no dia seguinte. A execução é restrita ao serviço do banco.
- Mantém auditoria apenas com data e contagens, sem cópia do telefone/conteúdo apagado.
  Administradores podem consultar as contagens; usuários comuns não podem executar o expurgo.

Conferir agendamento e auditoria no SQL Editor:

```sql
select jobname, schedule, active
from cron.job where jobname = 'whatsapp-limpar-nao-identificadas';

select executada_em, conversas_identificadas, conversas_excluidas, mensagens_excluidas
from public.whatsapp_limpeza_execucao
order by executada_em desc limit 10;

select status, start_time, end_time, return_message
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'whatsapp-limpar-nao-identificadas')
order by start_time desc limit 10;
```

Validação local: `npm run test:retencao` exige o contêiner Supabase local
`supabase_db_quintal_brincante`. Aplica a migration e verifica os casos protegidos,
cascata, agendamento e permissões **dentro de uma transação revertida**, sem `.env`
ou conexão com produção.

### Limite: Supabase não é o banco da Evolution

Esta rotina **não apaga mensagens do celular nem o histórico próprio da Evolution**.
A rota `deleteMessageForEveryone` apaga mensagens para todos no WhatsApp e **não deve ser
usada** para retenção de banco. Uma política interna da Evolution depende de acesso e
validação do banco/versão no servidor; permanece pendente, sem exclusão remota implementada.
Desligar serviços por ausência de crianças também não faz parte desta alteração.

O filtro evita novas gravações desnecessárias no ERP, mas a Evolution ainda recebe os
eventos. No levantamento de custos de 28/10, aproximadamente **97% do custo do projeto
Railway era RAM** de Postgres, Evolution e Redis; apagar histórico do Supabase não reduz
diretamente essa cobrança nem garante redução relevante da RAM dos serviços Railway.

---

## O que está pronto no código

- `EvolutionSender` (`src/lib/whatsapp/adapter.ts`), com testes.
- Renderização dos templates de `/mensagens`.
- Agradecimento de check-out (`agradecimento_checkout`) e boas-vindas usam os mesmos helpers
  de renderização dos avisos.
- Aviso de tempo em `src/lib/whatsapp/avisoTempo.ts`, com lógica pura e testes.
- Auditoria na tabela `notificacao` (conteúdo, status, provider, id externo, data).
- `CloudSender` da Meta oficial em stand-by.

---

## Diagnóstico rápido

Se uma mensagem não chegar:

1. Confira se a instância Evolution está `open/connected`.
2. Confira se o telefone do responsável tem DDD e foi normalizado para E.164.
3. Veja as notificações recentes:

```sql
select created_at, status, tipo, destino, erro, provider_msg_id, conteudo
from notificacao
order by created_at desc
limit 20;
```

4. Se o status ficou `falha`, leia `erro`.
5. Se não houve linha em `notificacao`, investigue o fluxo que deveria criar a mensagem
   (ocorrência, botão de aviso rápido ou worker de aviso de tempo).
