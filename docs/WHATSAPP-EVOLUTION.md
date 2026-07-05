# WhatsApp via Evolution API (não-oficial) — passo a passo

Decisão do dono (2026-07-05): usar API **não-oficial** (Evolution API, que usa Baileys
por baixo) em vez da Meta oficial. O `EvolutionSender` já está implementado no adapter —
falta só subir o servidor Evolution e apontar as envs.

**Como funciona:** o Evolution é um servidorzinho (Docker) que fica **logado no WhatsApp
do seu número** (você escaneia um QR code, como no WhatsApp Web). O sistema chama a API
REST dele e a mensagem sai do seu número normal.

## ⚠️ Riscos e cuidados (leia antes)

- **É contra os termos do WhatsApp.** O número pode ser **banido**. Por isso:
  - Use um **chip dedicado** (pré-pago barato), NUNCA o número pessoal.
  - Volume baixo e mensagens úteis (nosso caso: avisos aos responsáveis) = risco menor.
  - Evite mandar para quem nunca conversou com o número; peça aos responsáveis para
    salvarem o contato e mandarem um "oi" no primeiro dia (reduz muito o risco).
- **Respostas dos pais** chegam no WhatsApp do número (dá pra acompanhar pelo celular
  ou pelo próprio painel do Evolution).
- A regra do projeto continua: este número é dos avisos operacionais. **Marketing nunca
  usa este número.**

## Parte 1 — Sua: subir o Evolution API (~30 min)

O Evolution precisa de um servidor ligado 24/7 (a Vercel não serve p/ isso). Opções:

| Opção | Custo | Nota |
|---|---|---|
| **VPS barata** (Hetzner, Contabo, Oracle Free) | ~R$20–30/mês (Oracle: grátis) | Mais controle. Precisa instalar Docker. |
| **Railway / Render** | ~US$5/mês | Mais fácil: deploy por template, sem gerenciar servidor. |
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
2. **Crie uma instância** (ex.: `quintal`).
3. Clique em **Connect** → aparece o **QR code**.
4. No celular com o **chip dedicado**: WhatsApp → Aparelhos conectados → Conectar
   aparelho → escaneie o QR. Pronto, a instância fica "open/connected".
5. (Recomendado) Coloque HTTPS na frente (Caddy/Traefik/Cloudflare Tunnel) —
   a URL pública é o que vai na env.

## Parte 2 — Minha/joint: ligar no sistema (~5 min)

Envs (local `.env.local` e Vercel → Settings → Environment Variables):

```
WHATSAPP_PROVIDER=evolution
EVOLUTION_URL=https://evo.seudominio.com      # URL do servidor Evolution
EVOLUTION_API_KEY=A_CHAVE_QUE_VOCE_ESCOLHEU
EVOLUTION_INSTANCE=quintal
```

Redeploy na Vercel → o próximo aviso do play sai de verdade no WhatsApp.

Teste rápido direto (sem o sistema), p/ validar o Evolution:

```bash
curl -X POST "https://evo.seudominio.com/message/sendText/quintal" \
  -H "apikey: SUA_CHAVE" -H "Content-Type: application/json" \
  -d '{"number":"5543999999999","text":"Teste do Quintal 🎠"}'
```

## O que já está pronto no código

- `EvolutionSender` (`src/lib/whatsapp/adapter.ts`), com testes.
- Envia o **texto renderizado** dos templates de `/mensagens` (não-oficial não tem
  aprovação de template — o texto vai direto).
- Auditoria intacta: toda notificação continua gravada na tabela `notificacao`
  (conteúdo, status, id, data) — independente do provider.
- A Meta oficial (`CloudSender`) segue implementada; voltar a ela = trocar envs.
