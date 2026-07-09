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
- Variáveis principais: primeiro nome do responsável, primeiro nome da criança e, quando
  necessário, minutos restantes/descrição da ocorrência

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

## O que está pronto no código

- `EvolutionSender` (`src/lib/whatsapp/adapter.ts`), com testes.
- Renderização dos templates de `/mensagens`.
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
