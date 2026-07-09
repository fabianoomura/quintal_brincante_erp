# Operação — Quintal Brincante ERP

Runbook curto para tarefas recorrentes, validações e comandos que mexem em dados. Em produção,
leia duas vezes antes de executar SQL. O projeto lida com dados de crianças.

Última atualização: **2026-07-09**.

---

## Testes antes de publicar

Use estes comandos para validar mudança de código:

```bash
npm run test
npm run lint
npm run build
```

Em 2026-07-09, a suíte unitária estava com **86 testes passando**. Ela cobre playground,
checkout, recebimentos, mensagens/WhatsApp, aviso de tempo, endereço/ViaCEP, tarifador,
grade, feriados, mensalidades e regras financeiras.

### Testes de integração

Os testes de integração criam e alteram dados. Rode só contra Supabase local ou ambiente
descartável.

```bash
supabase start
supabase db reset
npm run setup:users
npm run seed:dev
npm run test:it
```

No Windows, se precisar chamar o executável diretamente:

```powershell
npm.cmd run test:it
```

Se `npm run test:it` falhar com conexão recusada em `127.0.0.1:54321`, o Supabase local/Docker
provavelmente não está rodando.

---

## Limpeza segura de dados de teste em produção

Objetivo: apagar histórico operacional de teste mantendo **cadastros de crianças,
responsáveis, vínculos, configurações, templates, grade, feriados, ambientes e colaboradores**.

Use este bloco apenas quando tiver certeza de que as tabelas abaixo contêm somente dados de
teste ou dados que podem ser descartados. Se já houver operação real misturada, não rode este
bloco geral: faça uma limpeza filtrada por período/IDs.

### 1. Conferir volume antes

```sql
select 'notificacao' as tabela, count(*) from notificacao
union all select 'ocorrencia', count(*) from ocorrencia
union all select 'lancamento', count(*) from lancamento
union all select 'presenca', count(*) from presenca
union all select 'reposicao', count(*) from reposicao
union all select 'inscricao_colonia', count(*) from inscricao_colonia
union all select 'mensalidade', count(*) from mensalidade;
```

### 2. Apagar histórico operacional

```sql
begin;

delete from notificacao;
delete from ocorrencia;
delete from lancamento;
delete from presenca;
delete from reposicao;
delete from inscricao_colonia;
delete from mensalidade;

commit;
```

Se estiver apenas ensaiando, troque `commit;` por `rollback;`.

### 3. Conferir depois

```sql
select 'notificacao' as tabela, count(*) from notificacao
union all select 'ocorrencia', count(*) from ocorrencia
union all select 'lancamento', count(*) from lancamento
union all select 'presenca', count(*) from presenca
union all select 'reposicao', count(*) from reposicao
union all select 'inscricao_colonia', count(*) from inscricao_colonia
union all select 'mensalidade', count(*) from mensalidade;
```

---

## Reset opcional de configs operacionais

Normalmente **não** precisa mexer em configs depois de apagar testes. Use só se quiser voltar
algumas flags ao estado conservador.

```sql
update config_sistema
set
  conciliacao_automatica = false,
  aviso_tempo_ativo = true,
  aviso_antecedencia_min = 15,
  tolerancia_min = 0,
  capacidade_dia = null,
  valor_feriado = null,
  desconto_ativo = false,
  desconto_irmao_percentual = null
where id = 1;
```

---

## Aviso de tempo do play

- O worker roda via `pg_cron` a cada 5 minutos.
- A antecedência padrão é `config_sistema.aviso_antecedencia_min = 15`.
- A mensagem só dispara quando `config_sistema.aviso_tempo_ativo = true` e a presença tem
  `tempo_contratado_min`.
- O disparo é idempotente: uma presença deve gerar no máximo uma notificação de aviso de tempo.
- Auditoria: tabela `notificacao`, com status, conteúdo renderizado, provider e datas.

Para diagnosticar falhas, confira:

```sql
select created_at, status, tipo, destino, erro, provider_msg_id, conteudo
from notificacao
order by created_at desc
limit 20;
```

Também confira se a instância Evolution está `open/connected` e se o telefone do responsável
está normalizado com DDD.

---

## O que não apagar em produção

Evite apagar estas tabelas em limpeza comum:

- `crianca`
- `contato`
- `crianca_contato`
- `config_sistema`
- `mensagem_template`
- `preco_hora`
- `feriado`
- `ambiente`
- `colaborador`

Essas tabelas são a base da operação. Se precisar mexer nelas, faça backup ou export antes.
