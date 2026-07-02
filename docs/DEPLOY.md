# Deploy — Quintal Brincante ERP

Colocar o sistema no ar: **Supabase (nuvem)** para banco/auth + **Vercel** para o app.
Tempo estimado: ~40 min. Pré-requisito: conta no GitHub (o repo já está lá).

---

## 1. Banco — Supabase Cloud (~15 min)

1. Crie a conta/projeto em https://supabase.com → **New project**
   - Nome: `quintal-brincante` · Região: **South America (São Paulo)**
   - Guarde a **senha do banco** (Database password).
2. No terminal do projeto, conecte e aplique as migrations:
   ```bash
   supabase login                       # abre o navegador
   supabase link --project-ref <REF>   # REF = id do projeto (Settings → General)
   supabase db push                    # aplica as 13 migrations
   ```
3. **Config mínima:** no painel → SQL Editor, cole e execute o conteúdo de
   [`supabase/seed.sql`](../supabase/seed.sql) (config_sistema, planilha de preços do play,
   templates de mensagem). *Não* rode `scripts/seed-dev.mts` em produção (dados fake).
4. **Usuários reais:** painel → Authentication → Users → **Add user** (e-mail + senha,
   "Auto confirm"). Depois, SQL Editor:
   ```sql
   insert into colaborador (user_id, nome, funcao, papel_acesso)
   values ('<UUID do usuário criado>', 'Seu Nome', 'coordenação', 'admin');
   -- repita para cada operador com papel_acesso = 'operador'
   ```
5. Anote em Settings → API: **Project URL**, **anon key** e **service_role key**.

## 2. App — Vercel (~10 min)

1. https://vercel.com → **Add New → Project** → importe `fabianoomura/quintal_brincante_erp`.
2. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (⚠️ secreta) |
   | `CRON_SECRET` | um segredo forte (ex.: `openssl rand -hex 24`) |
   | `WHATSAPP_PROVIDER` | `fake` (até as credenciais da Meta) |
   | `INFINITEPAY_WEBHOOK_SECRET` | um segredo forte (troca quando integrar de verdade) |

3. **Deploy.** A URL final fica tipo `https://quintal-brincante.vercel.app`.

## 3. Workers agendados — pg_cron (~10 min)

No painel do Supabase → Database → Extensions: habilite **pg_cron** e **pg_net**.
Depois, SQL Editor (troque `<APP>` pela URL da Vercel e `<CRON_SECRET>` pelo segredo):

```sql
-- Aviso de tempo do play: a cada 5 minutos
select cron.schedule(
  'aviso-tempo', '*/5 * * * *',
  $$ select net.http_post(
       url     := 'https://<APP>/api/worker/aviso-tempo',
       headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb
     ) $$
);

-- Mensalidades do mês: dia 1, 06:00 (BRT ≈ 09:00 UTC)
select cron.schedule(
  'mensalidades', '0 9 1 * *',
  $$ select net.http_post(
       url     := 'https://<APP>/api/worker/mensalidades',
       headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb
     ) $$
);
```

Conferir: `select * from cron.job;` — e depois `select * from cron.job_run_details order by start_time desc limit 5;`

## 4. Checklist pós-deploy

- [ ] Login com o admin real funciona; operador vê só o operacional.
- [ ] Janela anônima: nenhuma tela/dado acessível (RLS ok).
- [ ] Check-in/out no play cobra pela planilha (`/grade`).
- [ ] Tablet do play: abrir `https://<APP>/kiosk` e fixar a aba.
- [ ] `cron.job_run_details` mostra execuções com status `succeeded`.
- [ ] Trocar as senhas iniciais dos usuários.

## Quando as integrações reais chegarem

- **WhatsApp (Meta):** criar o WhatsApp Business, submeter os templates de `/mensagens`,
  implementar o `CloudSender` no adapter (`src/lib/whatsapp/adapter.ts`) e trocar
  `WHATSAPP_PROVIDER=cloud` + tokens nas envs da Vercel.
- **InfinitePay:** validar assinatura HMAC real no webhook
  (`src/app/api/webhook/infinitepay/route.ts`) e ligar `conciliacao_automatica` nas Configurações.
