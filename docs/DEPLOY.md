# Deploy — Quintal Brincante ERP

Colocar o sistema no ar: **Supabase (nuvem)** para banco/auth + **Vercel** para o app.
Tempo estimado: ~40 min. Pré-requisito: conta no GitHub (o repo já está lá).

---

## 1. Banco — Supabase Cloud (~15 min)

1. Crie a conta/projeto em https://supabase.com → **New project**
   - Nome: `quintal-brincante`
   - Região: escolha a região mais próxima do app. A produção atual foi criada em **East US**
     para casar com a Vercel free; **South America (São Paulo)** também é uma opção natural
     se a latência local pesar mais.
   - Guarde a **senha do banco** (Database password).
2. No terminal do projeto, conecte e aplique as migrations:
   ```bash
   supabase login                       # abre o navegador
   supabase link --project-ref <REF>   # REF = id do projeto (Settings → General)
   supabase db push                    # aplica as migrations versionadas
   ```
   O `db push` já cria o **bootstrap** (config_sistema, planilha de preços do play,
   templates de mensagem) — isso virou migration idempotente, não precisa rodar seed à mão.
   *Não* rode `scripts/seed-dev.mts` em produção (dados fake).
3. **Usuários reais:** painel → Authentication → Users → **Add user** (e-mail + senha,
   "Auto confirm"). Depois, SQL Editor:
   ```sql
   insert into colaborador (user_id, nome, funcao, papel_acesso)
   values ('<UUID do usuário criado>', 'Seu Nome', 'coordenação', 'admin');
   -- repita para cada operador com papel_acesso = 'operador'
   ```
4. Anote em Settings → API: **Project URL**, **anon key** e **service_role key**.

## 2. App — Vercel (~10 min)

1. https://vercel.com → **Add New → Project** → importe `fabianoomura/quintal_brincante_erp`.
2. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (⚠️ secreta) |
   | `CRON_SECRET` | um segredo forte (ex.: `openssl rand -hex 24`) |
   | `WHATSAPP_PROVIDER` | `evolution` em produção atual; `fake` para ambiente local sem envio |
   | `EVOLUTION_URL` | URL pública do servidor Evolution |
   | `EVOLUTION_API_KEY` | chave da Evolution API |
   | `EVOLUTION_INSTANCE` | nome da instância, ex.: `quintal` |
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
- [ ] Cadastro de criança/responsável salva nome separado e endereço estruturado.
- [ ] Tablet do play: abrir `https://<APP>/kiosk` e fixar a aba.
- [ ] `cron.job_run_details` mostra execuções com status `succeeded`.
- [ ] Aviso de tempo real chega no WhatsApp quando houver `tempo_contratado_min`.
- [ ] Trocar as senhas iniciais dos usuários.

## Quando as integrações reais chegarem

- **WhatsApp (Evolution):** provider atual documentado em
  [`docs/WHATSAPP-EVOLUTION.md`](WHATSAPP-EVOLUTION.md). A instância precisa permanecer
  conectada/open para os avisos chegarem.
- **WhatsApp (Meta):** o `CloudSender` **já está implementado** (`src/lib/whatsapp/adapter.ts`).
  Para voltar, use `WHATSAPP_PROVIDER=cloud`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` e
  `WHATSAPP_LANG` se não for `pt_BR`. Passo a passo em [`docs/WHATSAPP.md`](WHATSAPP.md).
- **InfinitePay:** validar assinatura HMAC real no webhook
  (`src/app/api/webhook/infinitepay/route.ts`) e ligar `conciliacao_automatica` nas Configurações.

Rotinas de limpeza seletiva, testes e diagnóstico estão em [`docs/OPERACAO.md`](OPERACAO.md).
