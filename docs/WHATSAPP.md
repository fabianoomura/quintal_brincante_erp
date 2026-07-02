# WhatsApp Business API (Meta) — passo a passo

Objetivo: os avisos do play (banheiro, chorando, vir buscar, aviso de tempo…) chegarem de
verdade no celular do responsável. Hoje o sistema roda com provider `fake` (registra tudo,
não envia). O código já está pronto para plugar a Cloud API — falta a parte burocrática da
Meta, que só o dono consegue fazer.

**Regra do projeto:** o número dos avisos operacionais é missão crítica e NUNCA será usado
para marketing. Marketing (Fase 3) usará outro número.

---

## Parte 1 — Sua (burocracia Meta, ~1–3 dias por causa de verificações)

1. **Portfólio empresarial:** https://business.facebook.com → criar Portfólio de negócios
   do Vilarejo. Em Configurações → Central de segurança, faça a **verificação da empresa**
   (CNPJ + documento; a Meta pode levar 1–2 dias). Sem isso o envio fica limitado.
2. **App de desenvolvedor:** https://developers.facebook.com → Create App → tipo **Business**
   → adicionar o produto **WhatsApp**. Isso cria um WhatsApp Business Account (WABA) com um
   número de teste.
3. **Número real:** WhatsApp → API Setup → **Add phone number**. Atenção:
   - Use um número que **não esteja registrado** no app WhatsApp comum (ou delete a conta
     do app antes). Um chip novo pré-pago resolve.
   - Verificação por SMS/ligação.
4. **Token permanente:** Business Settings → **System Users** → criar usuário de sistema
   (admin) → Generate token → permissões `whatsapp_business_messaging` e
   `whatsapp_business_management`. Guarde o token (é o `WHATSAPP_TOKEN`).
5. **Anote:** o **Phone Number ID** (API Setup) — é o `WHATSAPP_PHONE_ID`.
6. **Forma de pagamento:** WhatsApp Manager → Billing. Conversas "utility" iniciadas pelo
   negócio são cobradas por conversa (tabela da Meta; centavos por conversa de 24h).
7. **Templates:** WhatsApp Manager → **Message templates** → Create template:
   - Categoria: **Utility** · Idioma: **pt_BR**
   - Crie um template para cada texto da tela **/mensagens** do sistema (copie o texto de lá;
     variáveis são `{{1}}`, `{{2}}`…). Sugestão de nomes: `aviso_tempo`, `ocorrencia`,
     `aviso_geral`.
   - Envie para aprovação (minutos a 48h). Conforme aprovarem, marque o status **Aprovado**
     na tela /mensagens do sistema.

## Parte 2 — Minha (código, ~1 sessão depois que você tiver o token)

1. Implementar o `CloudSender` no adapter (`src/lib/whatsapp/adapter.ts`):
   `POST https://graph.facebook.com/v21.0/{PHONE_ID}/messages` com
   `{ type: 'template', template: { name, language: { code: 'pt_BR' }, components } }`.
2. Envs novas (local e Vercel): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`,
   `WHATSAPP_PROVIDER=cloud`.
3. Teste real: enviar 1 mensagem de cada template aprovado para o seu celular.
4. O resto não muda: notificação, idempotência do aviso de tempo e auditoria já funcionam.

## Custos (ordem de grandeza)

- Número: chip pré-pago comum.
- Meta: cobrança por conversa utility iniciada pelo negócio (tabela oficial em
  https://developers.facebook.com/docs/whatsapp/pricing — centavos de real por conversa).
- Sem mensalidade de plataforma (integração direta, sem BSP).
