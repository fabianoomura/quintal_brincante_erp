# Diário do projeto — Quintal Brincante ERP

Registro do que foi feito, decisão a decisão. Complementa o [ROADMAP.md](ROADMAP.md)
(plano de evolução), o [DEPLOY.md](DEPLOY.md) (infra) e o
[WHATSAPP-EVOLUTION.md](WHATSAPP-EVOLUTION.md) (canal de avisos).
Última atualização: **2026-07-05**.

---

## Estado atual: EM PRODUÇÃO ✅

- **App:** https://quintal-brincante-erp.vercel.app (Vercel; deploy automático a cada
  `git push` na `main` — repo `fabianoomura/quintal_brincante_erp`)
- **Banco/Auth:** Supabase cloud (ref `verzmbntyibvtwfozhdu`), 19 migrations, RLS em tudo
- **Workers:** `pg_cron` → `aviso-tempo` (a cada 5 min) e `mensalidades` (dia 1, 06h BRT)
- **WhatsApp:** Evolution API no Railway (instância `quintal`) — mensagens reais chegando;
  aguardando conexão do **chip dedicado** (QR)
- **Dados:** banco de produção limpo (2026-07-05) — só cadastros (4 crianças + responsáveis),
  grade de preços (60 células), templates e configs; financeiro/presenças zerados p/ operação real

---

## O que foi construído (por área)

### Núcleo (Etapas 1a–1d do CLAUDE.md)
- Schema completo + RLS equipe-only (anônimo = 0 linhas, testado em produção)
- Cadastro de crianças: responsáveis/autorizados/emergência, saúde, foto (webcam/arquivo),
  CPF/RG do responsável, consentimento LGPD com selo de pendência
- Presença (check-in/out) com origem (play/diária/mensalista/colônia), ambientes e lotação
- Financeiro: lançamentos, baixa manual com modalidade + desconto, export CSV, avulsos
- Webhook InfinitePay atrás de flag `conciliacao_automatica` (default off)

### Play (o coração da operação)
- **Preço:** valor/hora por planilha (dia da semana × hora) em `/grade` + feriados com valor
  próprio em `/calendario` (sugere feriados nacionais) · **piso de 1h + proporcional**
  (ex.: 20/h → 40min = R$20 · 1h15 = R$25) — travado no check-in, calculado no check-out
- **Playground:** cronômetro ao vivo por criança, custo em tempo real, barra de tempo
  contratado, avisos rápidos (banheiro/trocar/chorando/buscar), modo quiosque p/ tablet
- **Busca de criança** (filtra digitando, sem acento) + botão **“+ Cadastrar criança”**
  que abre a ficha completa e volta pro play
- **Recebimento no check-out:** pop-up com Dinheiro / Pix / Débito / Crédito → baixa na
  hora, ou “deixar pendente” (caso “foi embora sem pagar” fica registrado no Financeiro)

### Mensalistas / Colônia / Gestão
- Planos por frequência (2x, 3x/semana…), matrículas, reposição de dias, desconto por
  irmão automático (mesmo responsável/CPF), geração mensal idempotente (worker + botão)
- Colônias com vagas/valor, edição, inscrição gera lançamento (com desconto de irmão)
- Faturamento por operação/mês · Gerencial (admin) · RBAC admin/operador · Colaboradores
- `/mensagens`: textos dos avisos editáveis + status de aprovação (p/ era Meta; hoje serve
  de catálogo dos textos)
- Ajuda contextual: botão “?” em toda tela explica o que ela faz (textos em `src/lib/ajuda.ts`)

### Qualidade
- 56 testes unitários (tarifador, grade, feriados, irmãos, aviso-tempo, adapters WhatsApp,
  máscaras) + testes de integração contra Supabase local
- Máscaras de digitação: CPF (`054.593.509-13`) e telefone (`(43) 99120-3404`); servidor
  normaliza telefone p/ E.164 e recusa número sem DDD

---

## Deploy em produção (2026-07-04)

1. Supabase cloud criado (região East US — casa com a Vercel free, também US)
2. `supabase db push` (19 migrations) + **bootstrap virou migration idempotente**
   (config, grade, templates — `db push` deixa a base pronta sozinho)
3. Admin criado; RLS verificada; extensões `pg_cron`/`pg_net` + 2 jobs agendados
4. Vercel conectada ao GitHub; envs; domínio `quintal-brincante-erp.vercel.app`
5. Verificação ponta a ponta: login, worker 401 sem secret / 200 com secret

## Consertos importantes pós-deploy (aprendizados)

| Bug | Causa | Lição |
|---|---|---|
| “Não funciona nada” no play (check-in/cadastro travando) | `financeiro/actions.ts` (`'use server'`) exportava `const MODALIDADES` — arquivo *use server* só pode exportar função async; TODAS as actions de qualquer rota que importa o módulo quebravam com 500 | **Testar clicando na tela** (Playwright) — testes só de backend não pegaram; a mensagem real só aparece no dev local |
| Modal de ajuda abria no topo | `backdrop-blur` do header vira *containing block* p/ `position:fixed` | Modais via `createPortal(document.body)` (componente `modal.tsx`) |
| Webcam “retângulo preto gigante” | vídeo esticado + attach do stream por `setTimeout` | preview compacto + attach via `useEffect` + botão só habilita com vídeo rodando |
| Botões presos em “Salvando…” | handlers sem try/catch/finally | todo handler de action com try/catch/finally e erro visível |

## WhatsApp — Evolution API (2026-07-05)

- **Decisão do dono:** API não-oficial (Evolution/Baileys), sem burocracia Meta.
  `EvolutionSender` no adapter (`WHATSAPP_PROVIDER=evolution`); `CloudSender` Meta oficial
  continua implementado em stand-by (voltar = trocar envs)
- Servidor no **Railway** (template Evolution API + Redis + Postgres):
  `https://evolution-api-production-3357.up.railway.app`, instância `quintal`
- **Pegadinha resolvida:** QR dava “não foi possível conectar o dispositivo” → env
  `CONFIG_SESSION_PHONE_VERSION` no Railway com a versão atual do WhatsApp Web
  (fonte: `wppconnect-team/wa-version` no GitHub)
- Mensagens de teste **chegaram** (acentos/emojis ok — enviar via Node/fetch; curl no
  terminal Windows corrompe UTF-8)
- **Privacidade:** conectar um chip sincroniza contatos/conversas pro banco do Evolution;
  “Disconnect” NÃO apaga — **deletar a instância** apaga (feito; instância atual nasceu
  zerada). Chip dedicado deve ter agenda mínima
- **Pendente:** equipe escanear o QR com o chip dedicado → validação final do aviso de
  tempo (worker já provado: detectou, tentou enviar, registrou `falha` sem celular — auditoria ok)

## Fila de próximos passos

1. ⏳ Chip dedicado no QR → validação final (aviso de tempo chegando)
2. Botão **“💬 Cobrar”** nos lançamentos pendentes (texto editável, com nome/valor)
3. ROADMAP P1: backup + “sinal de vida” dos workers (alerta se pararem)
4. InfinitePay real (HMAC + checkout) atrás da flag
5. Supabase Pro / Vercel Pro quando o uso firmar (free pausa por inatividade / termo não-comercial)

## Regras de trabalho que valem ouro aqui

- Validar fluxo **clicando na tela** (Playwright é devDependency), não só via API/banco
- Arquivo `'use server'`: **só** exporta função async (`export type` ok; `const` quebra tudo)
- Depois de deploy, aba aberta fica “velha” → hard refresh; considerar Skew Protection na Vercel
- Dinheiro em `numeric`, telefone E.164, segredos só em env, RLS sempre
