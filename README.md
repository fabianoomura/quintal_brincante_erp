# Quintal Brincante ERP

Sistema interno de gestão para um espaço de recreação infantil. O foco é operação diária:
cadastro de crianças, responsáveis, presença, play por tempo, financeiro, mensalistas,
colônia de férias e avisos por WhatsApp.

## Estado

MVP em produção, com Supabase + Vercel. O estado operacional mais recente fica em
[`docs/DIARIO.md`](docs/DIARIO.md) e o plano de evolução em [`docs/ROADMAP.md`](docs/ROADMAP.md).
A spec inicial [`quintal-brincante-mvp.md`](quintal-brincante-mvp.md) é histórica.

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
ou ambiente descartável, porque os testes criam e alteram dados.

## Documentação

- [`docs/DIARIO.md`](docs/DIARIO.md): histórico e estado real do projeto
- [`docs/ROADMAP.md`](docs/ROADMAP.md): prioridades e próximos passos
- [`docs/DEPLOY.md`](docs/DEPLOY.md): deploy em Supabase/Vercel
- [`docs/WHATSAPP-EVOLUTION.md`](docs/WHATSAPP-EVOLUTION.md): provider atual de WhatsApp
- [`docs/WHATSAPP.md`](docs/WHATSAPP.md): Meta Cloud API, mantida em stand-by
