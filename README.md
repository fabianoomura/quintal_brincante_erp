# Quintal Brincante ERP

Sistema interno de gestão para um espaço de recreação infantil. O foco é operação diária:
cadastro de crianças, responsáveis, presença, play por tempo, financeiro, mensalistas,
colônia de férias e avisos por WhatsApp.

## Estado

MVP em produção, com Supabase + Vercel. O estado operacional mais recente fica em
[`docs/DIARIO.md`](docs/DIARIO.md) e o plano de evolução em [`docs/ROADMAP.md`](docs/ROADMAP.md).
A spec inicial [`quintal-brincante-mvp.md`](quintal-brincante-mvp.md) é histórica.

Desde 2026-07-09, o aviso real de tempo do play via WhatsApp/Evolution foi validado em
produção. O módulo de mensagens usa variáveis padronizadas, avisos rápidos configuráveis
e mensagem de agradecimento no check-out. Os testes unitários cobrem os pontos críticos de
playground, recebimentos, mensagens, endereço e regras financeiras.

## Principais fluxos

- Cadastro de crianças e responsáveis, com nome/sobrenome separados, foto por webcam/arquivo
  e dados opcionais para BI.
- Endereço estruturado com CEP, logradouro, número, complemento, bairro, cidade e UF; o CEP
  usa ViaCEP para preencher automaticamente quando possível.
- Playground com check-in/out, tempo contratado, aviso antecipado, agradecimento no check-out
  e recebimento no checkout.
- Mensagens editáveis com variáveis padrão, como `{{responsavel_nome}}` e
  `{{crianca_nome}}`; avisos rápidos do play têm até 6 ativos por vez.
- Financeiro com lançamentos, baixa manual, descontos e exportação CSV.

## Stack

- Next.js 16 App Router, React 19 e Tailwind CSS 4
- Supabase Auth/Postgres/RLS
- WhatsApp por adapter: `fake`, `evolution` ou `cloud`
- Workers via endpoints protegidos por `CRON_SECRET`

## Setup local

```bash
npm install
npm run dev
```

O app local sobe em http://localhost:6006.

Para banco local:

```bash
supabase start
supabase db reset
npm run setup:users
npm run seed:dev
```

## Scripts

```bash
npm run dev       # Next dev na porta 6006
npm run build     # build de produção
npm run lint      # ESLint
npm run test      # testes unitários puros
npm run test:it   # integração contra Supabase local
```

Antes de rodar `npm run test:it`, confirme que `.env.local` aponta para um Supabase local
ou ambiente descartável, porque os testes criam e alteram dados. Na prática, rode antes
`supabase start`, `supabase db reset`, `npm run setup:users` e `npm run seed:dev`.

## Documentação

- [`docs/DIARIO.md`](docs/DIARIO.md): histórico e estado real do projeto
- [`docs/ROADMAP.md`](docs/ROADMAP.md): prioridades e próximos passos
- [`docs/DEPLOY.md`](docs/DEPLOY.md): deploy em Supabase/Vercel
- [`docs/OPERACAO.md`](docs/OPERACAO.md): comandos de operação, testes e limpeza segura
- [`docs/WHATSAPP-EVOLUTION.md`](docs/WHATSAPP-EVOLUTION.md): provider atual de WhatsApp
- [`docs/WHATSAPP.md`](docs/WHATSAPP.md): Meta Cloud API, mantida em stand-by
