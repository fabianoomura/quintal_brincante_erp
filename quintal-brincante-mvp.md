# Quintal Brincante — Sistema de Gestão (MVP)

> Spec de implementação. Sistema interno para um quintal brincante, usado **apenas pela equipe**.
> Sem cobrança pelo sistema; foco em organização e aprendizado.
> Status: planejamento → pronto para implementar a Fase 1.
>
> **Revisão 3** — inclui: play tarifado (modelo "estacionamento"), notificações WhatsApp
> (com disparo automático de aviso de tempo) e pagamento em dois modos (baixa manual com
> exportação de conciliação + automático via webhook, atrás de flag).

---

## 1. Contexto e objetivo

Quintal brincante dentro de um complexo esportivo, perto de um lago com prática de corrida.
O responsável muitas vezes deixa a criança e vai treinar no entorno — alcançável por celular,
não presente. Atende crianças por **quatro formas**:

| Produto | Como funciona |
|---|---|
| Mensalista ("aluninhos") | Matrícula recorrente; horários/dias variam; organizados em turminhas |
| Colônia de férias | Programa sazonal, em recessos |
| Diária | Pagamento por dia avulso |
| Espaço kids (play) | Cobrança por tempo de permanência, modelo "estacionamento" |

**Objetivo:** equipe saber *quem é cada criança*, *quem está no espaço agora*,
*quanto custou o tempo de play*, *quem está em dia* — e *avisar o responsável* quando precisa.

---

## 2. Decisões de escopo

Princípio: **o menor sistema que já é útil.** A coluna vertebral (`cadastro + presença`)
serve às três dores (financeiro, operação, cadastro) ao mesmo tempo.

**Mudança importante nesta revisão:** o **aviso de tempo precisa ser automático** (ninguém
cronometra cada criança na mão). Disparo automático e seguro só existe com a **WhatsApp
Business API oficial** + um **worker agendado**. Logo, ambos entram na Fase 1.

> Isso eleva o projeto de "helper de fim de semana" para um produtinho com backend de verdade
> (integrações externas + trabalho de fundo). Decisão consciente, registrada aqui.

**Sequência dentro da Fase 1** (o núcleo ainda sai primeiro):
- **1a** — Coluna vertebral: cadastro (criança/contatos/saúde) + presença (check-in/out).
- **1b** — Tarifador do play + financeiro (lançamento + status manual de pagamento).
- **1c** — Notificações: WhatsApp API + worker (aviso de tempo automático; ocorrência manual).

**Fora do MVP (Fase 2+):** estrutura rica de colônia, horário recorrente de turma,
login/auto-atendimento de pais, conciliação automática de pagamento por webhook.

---

## 3. Stack

| Camada | Escolha base | Observação |
|---|---|---|
| Banco + Auth | Supabase (Postgres + Auth + RLS) | Free tier, RLS nativa p/ dado de criança |
| Frontend | Next.js (App Router) | Hospedável no Vercel (free) |
| Worker agendado | `pg_cron` + Supabase Edge Function | Dispara o aviso de tempo |

**Revisão de stack pendente.** Com worker agendado + webhooks + integrações, o terreno passou
a favorecer também o stack que você já domina (**FastAPI + Celery beat** no VPS operacional).
Trade-off: Supabase = zero-ops, mas a lógica de fundo fica espalhada em Edge Functions;
FastAPI+Celery = mais controle e familiaridade, mas você herda manutenção/uptime de algo do
qual um terceiro depende. **Decidir antes da etapa 1c.** Até lá, 1a/1b não dependem dessa escolha.

---

## 4. Modelo de domínio

Átomo central: **`presenca`** — uma criança está no espaço numa data/horário, ocupando vaga.
Os quatro produtos convergem nela. Diária e play *são* presenças pagas; mensalidade e colônia
têm contrato à parte.

Camadas em volta:
- **Pessoas:** `crianca` ↔ `contato` (N:N, com `papel`: responsável / autorizado / emergência).
- **Tarifa:** config do play (`tarifa`), consumida pelo cálculo no check-out.
- **Eventos & avisos:** `ocorrencia` (algo aconteceu) gera `notificacao` (mensagem ao responsável).

```
  Mensalidade   Colônia        Diária      Play (espaço kids)
  [contrato]    [contrato]     [presença]  [presença + tempo + tarifa]
       \            \             |             /
        +----------> P R E S E N Ç A <---------+
                          |   \
                          |    \--> OCORRÊNCIA --> NOTIFICAÇÃO (WhatsApp)
                          v
                     FINANCEIRO (lançamento)
```

Dois mecanismos de aviso, distintos:
- **Aviso de tempo** — automático. Worker observa presenças de play com `tempo_contratado`
  ainda abertas e dispara quando falta pouco para o limite.
- **Ocorrência** — manual. A equipe registra um problema (banheiro, não se adaptou, etc.)
  e dispara o aviso. Humano no circuito, por design, em alerta sobre criança.

---

## 5. Schema (Fase 1)

Postgres / Supabase. UUIDs como PK. Valores monetários em `numeric(10,2)`.

### 5.1 Enums

```sql
create type papel_contato     as enum ('responsavel', 'autorizado', 'emergencia');
create type origem_presenca   as enum ('mensalista', 'diaria', 'espaco_kids', 'colonia');
create type status_lancamento as enum ('pendente', 'pago', 'cancelado');
create type tipo_ocorrencia   as enum ('banheiro', 'nao_adaptou', 'saude', 'comportamento', 'outro');
create type tipo_notificacao  as enum ('aviso_tempo', 'ocorrencia', 'aviso_geral');
create type status_notificacao as enum ('pendente', 'enviada', 'entregue', 'lida', 'falha');
```

### 5.2 Pessoas

```sql
create table crianca (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  nascimento  date,
  saude       text,                       -- alergias, restrições, observações de saúde
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table contato (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  telefone    text,                        -- formato E.164 p/ WhatsApp: +55DDDNUMERO
  email       text,
  created_at  timestamptz not null default now()
);

create table crianca_contato (
  crianca_id  uuid not null references crianca(id) on delete cascade,
  contato_id  uuid not null references contato(id) on delete cascade,
  papel       papel_contato not null,
  primary key (crianca_id, contato_id, papel)
);
```

### 5.3 Turma e mensalidade

```sql
-- OPCIONAL na Fase 1 (só rótulo de mensalista)
create table turma (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  faixa_etaria  text,
  capacidade    int,
  created_at    timestamptz not null default now()
);

create table mensalidade (
  id              uuid primary key default gen_random_uuid(),
  crianca_id      uuid not null references crianca(id) on delete cascade,
  turma_id        uuid references turma(id) on delete set null,
  valor           numeric(10,2) not null,
  dia_vencimento  int not null check (dia_vencimento between 1 and 31),
  inicio          date not null,
  fim             date,                    -- null = vigente
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);
```

### 5.4 Tarifa e configuração

```sql
-- Config única do play. Cálculo "estacionamento": piso de 1h + horas cheias + fração.
create table tarifa (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null default 'play',
  minimo_minutos     int  not null default 60,    -- piso de cobrança (1 hora)
  valor_hora         numeric(10,2) not null,       -- << PREENCHER
  tamanho_fracao_min int  not null,                -- << PREENCHER (ex.: 15 ou 30)
  valor_fracao       numeric(10,2) not null,       -- << PREENCHER
  aviso_antecedencia_min int not null default 15,  -- avisa faltando N min p/ o limite
  ativo              boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Flags do sistema (linha única). Onde ficam os "liga/desliga".
create table config_sistema (
  id                     int primary key default 1 check (id = 1),
  conciliacao_automatica boolean not null default false,  -- modo automático (Checkout/webhook)
  aviso_tempo_ativo      boolean not null default true,   -- worker de aviso de tempo
  created_at             timestamptz not null default now()
);
```

### 5.5 Presença (o átomo)

```sql
create table presenca (
  id                  uuid primary key default gen_random_uuid(),
  crianca_id          uuid not null references crianca(id) on delete cascade,
  data                date not null,
  entrada             time not null,
  saida               time,                    -- null = ainda no espaço
  origem              origem_presenca not null,
  tempo_contratado_min int,                     -- só play: limite previsto p/ o aviso
  valor               numeric(10,2),            -- calculado no check-out (play/diária)
  obs                 text,
  created_at          timestamptz not null default now()
);
```

### 5.6 Financeiro

```sql
create table lancamento (
  id              uuid primary key default gen_random_uuid(),
  crianca_id      uuid not null references crianca(id) on delete cascade,
  descricao       text not null,
  valor           numeric(10,2) not null,
  vencimento      date not null,
  status          status_lancamento not null default 'pendente',
  origem_tipo     text,                         -- 'mensalidade' | 'presenca'
  origem_id       uuid,                         -- vínculo polimórfico (valida na app)
  conciliado_por  text,                         -- 'manual' | 'webhook' (auditoria)
  -- campos do modo automático (preenchidos pelo webhook do Checkout):
  order_nsu       text,
  transaction_nsu text,
  capture_method  text,                         -- pix | credit_card | debit
  receipt_url     text,
  pago_em         timestamptz,
  created_at      timestamptz not null default now()
);
```

### 5.7 Ocorrências e notificações

```sql
create table ocorrencia (
  id           uuid primary key default gen_random_uuid(),
  crianca_id   uuid not null references crianca(id) on delete cascade,
  presenca_id  uuid references presenca(id) on delete set null,
  tipo         tipo_ocorrencia not null,
  descricao    text,
  criado_por   uuid,                            -- auth.users (membro da equipe)
  created_at   timestamptz not null default now()
);

create table notificacao (
  id              uuid primary key default gen_random_uuid(),
  crianca_id      uuid not null references crianca(id) on delete cascade,
  contato_id      uuid not null references contato(id) on delete restrict,
  tipo            tipo_notificacao not null,
  ocorrencia_id   uuid references ocorrencia(id) on delete set null,
  presenca_id     uuid references presenca(id) on delete set null,
  template        text,                          -- nome do template aprovado na Meta
  conteudo        text,                          -- mensagem renderizada (auditoria)
  status          status_notificacao not null default 'pendente',
  provider_msg_id text,                          -- id retornado pela Cloud API
  enviada_em      timestamptz,
  created_at      timestamptz not null default now()
);
```

### 5.8 Índices

```sql
create index idx_presenca_data        on presenca (data);
create index idx_presenca_abertas     on presenca (origem) where saida is null;  -- worker
create index idx_lancamento_status    on lancamento (status, vencimento);
create index idx_crianca_contato_cont on crianca_contato (contato_id);
create index idx_notificacao_status   on notificacao (status) where status = 'pendente';
```

---

## 6. Cálculo do play (tarifador)

Função pura, aplicada no **check-out**. Suposições (confirmar com a equipe):
piso de 1h; toda hora vale `valor_hora`; a fração incide só sobre o resto após as horas
cheias e **arredonda pra cima**.

```
calcularValorPlay(entrada, saida, tarifa):
    minutos      = max(ceil(duracao_minutos(entrada, saida)), tarifa.minimo_minutos)
    horas_cheias = minutos // 60
    resto        = minutos - horas_cheias * 60
    valor        = horas_cheias * tarifa.valor_hora
    se resto > 0:
        fracoes = ceil(resto / tarifa.tamanho_fracao_min)
        valor  += fracoes * tarifa.valor_fracao
    retorna valor
```

Exemplos (com `valor_hora` = R$X, fração 30 min = R$Y):

| Permanência | Cálculo | Valor |
|---|---|---|
| 0h20 | piso de 1h | X |
| 1h10 | 1h + 1 fração | X + Y |
| 2h00 | 2h | 2X |
| 2h05 | 2h + 1 fração | 2X + Y |

> Se a 1ª hora tiver preço próprio, separar em `valor_primeira_hora` + `valor_hora_adicional`.
> Decisão pendente até confirmação dos valores.

---

## 7. Notificações WhatsApp

**Canal:** WhatsApp Business API oficial (Cloud API), direto ou via BSP. Mensagens proativas
(fora da janela de 24h) exigem **templates aprovados** pela Meta — todos do tipo "utility".

**Envio como adapter.** O código que dispara é uma interface (`enviarWhatsApp`). Hoje:
Cloud API. Isso isola o resto do sistema do provedor.

Templates (poucos, com variáveis):
- `aviso_tempo` — "Olá {{1}}, o tempo do(a) {{2}} no play está acabando (faltam {{3}} min)."
- `ocorrencia` — "Olá {{1}}, sobre {{2}}: {{3}}. Pode vir ao espaço?" (motivo como variável
  cobre banheiro, não se adaptou, etc., com um template só).
- `aviso_geral` — broadcast administrativo.

**Worker (aviso de tempo, automático).** Agendado (pg_cron/Edge Function ou Celery beat),
roda a cada poucos minutos:
1. Busca presenças de play abertas (`saida is null`) com `tempo_contratado_min` definido.
2. Para cada uma, se `agora >= entrada + tempo_contratado - tarifa.aviso_antecedencia_min`
   e ainda não existe `notificacao` de `aviso_tempo` para essa presença → cria e envia.
3. **Idempotência:** a notificação registrada evita disparo repetido.

**Ocorrência (manual).** Equipe registra `ocorrencia` → cria `notificacao` (`pendente`)
→ adapter envia → grava `status` + `provider_msg_id`.

---

## 8. Pagamento — dois modos

A cobrança tem dois fluxos **distintos** (não são duas conciliações do mesmo pagamento):

**Manual (maquininha física).** Cobra na tela da InfiniteSmart e a equipe marca o
`lancamento` como `pago` (`conciliado_por = 'manual'`, `pago_em` = agora). Sempre disponível,
sem integração. É o **único** modo que concilia cobranças feitas na maquininha física — a
InfinitePay não expõe TEF/SDK para um sistema externo comandar a Smart.
*(Registrado para ninguém tentar de novo.)*

**Automático (Checkout / InfiniteTap), atrás de flag.** Pagamento por link (Pix/cartão) ou
aproximação no celular; o webhook devolve `transaction_nsu`, valor, `capture_method` e
`receipt_url` → o sistema vira o `lancamento` para `pago` (`conciliado_por = 'webhook'`) sozinho.
Controlado por `config_sistema.conciliacao_automatica` (**default `false`**): com o flag off,
o webhook é ignorado e tudo roda manual; ligar não exige mudança de código.

> A liberação de credenciais da InfinitePay pode ser burocrática — por isso o automático
> nasce desligado e entra quando as credenciais estiverem prontas.

### Exportação de conciliação (modo manual)

Endpoint/tela que gera uma planilha (`.xlsx` ou `.csv`) dos lançamentos de um período, para
bater contra o extrato da InfinitePay/banco. Colunas:

`data · criança · descrição · origem · valor · vencimento · status · método · transaction_nsu · pago_em · recibo`

Filtros: período (de/até) e status (pendente / pago / todos).

---

## 9. RLS e LGPD

Dados pessoais de menor **+ saúde** → proteção reforçada (LGPD). Cuidados: (1) mínimo de
dados; (2) consentimento do responsável registrado; (3) acesso restrito via RLS.

### MVP (equipe-only)

```sql
-- Habilitar RLS em TODAS as tabelas:
alter table crianca          enable row level security;
alter table contato          enable row level security;
alter table crianca_contato  enable row level security;
alter table turma            enable row level security;
alter table mensalidade      enable row level security;
alter table tarifa           enable row level security;
alter table presenca         enable row level security;
alter table lancamento       enable row level security;
alter table ocorrencia       enable row level security;
alter table notificacao      enable row level security;

-- Política por tabela (autenticado = equipe; anônimo não vê nada):
create policy "equipe_total_crianca" on crianca
  for all to authenticated using (true) with check (true);
-- ... repetir por tabela.
```

### Evolução (Fase 2, login de pais)

Trocar `using (true)` por checagem em `membro_equipe (user_id uuid references auth.users)`:
`using (exists (select 1 from membro_equipe m where m.user_id = auth.uid()))`.

---

## 10. Roadmap

| Fase | Entrega |
|---|---|
| **1a** | Cadastro (criança/contato/saúde) + presença (check-in/out) |
| **1b** | Tarifador do play + financeiro: lançamento, baixa manual e exportação de conciliação |
| **1c** | WhatsApp API + worker: aviso de tempo (auto) + ocorrência (manual) |
| **1d** | Modo automático de pagamento: webhook do Checkout vira o lançamento (atrás de flag, default off) |
| **2** | Recorrência de turma; colônia rica |
| **3** | Marketing/captação: lead, segmentação, consentimento; envio via plataforma (ou API oficial em número separado) |
| **Futuro** | Login de pais; produtização via ATL4S (multi-tenant) |

---

## 11. Critérios de verificação (Fase 1)

- **Cadastro** → ficha de um aluno em ≤2 toques, com saúde e autorizados visíveis.
- **Presença** → "quem está aqui agora" sai de `presenca` (data = hoje, `saida is null`).
- **Play** → check-out de 1h10 com fração de 30 min cobra `valor_hora + valor_fracao`;
  20 min cobra o piso de 1h.
- **Aviso de tempo** → presença com `tempo_contratado_min` gera exatamente UMA notificação
  `aviso_tempo` ao cruzar o limite menos a antecedência (testar idempotência).
- **Ocorrência** → registrar ocorrência cria uma notificação ao responsável certo.
- **Pagamento manual** → marcar um pendente como pago grava `conciliado_por='manual'` e `pago_em`.
- **Exportação** → baixar a planilha de um período traz as colunas da §8 com pendentes e pagos.
- **Flag de automático** → com `conciliacao_automatica=false` o webhook é ignorado; com `true`
  ele vira o lançamento (`conciliado_por='webhook'`) — alternar sem mexer em código.
- **RLS** → request anônimo retorna zero linhas em todas as tabelas.

---

## 12. Ordem de construção sugerida

```
1. Migration: enums + tabelas + índices          → verifica: db reset roda limpo
2. RLS em todas as tabelas                        → verifica: anon lê 0 linhas
3. Cadastro de criança + contatos                 → verifica: criar/editar/buscar ficha
4. Presença + tela "quem está aqui hoje"          → verifica: registrar entrada/saída
5. Tarifador do play (função pura + testes)       → verifica: tabela de exemplos da §11
6. Financeiro: lançamento + baixa manual          → verifica: marcar pendente como pago
7. Exportação da planilha de conciliação          → verifica: baixar xlsx/csv de um período
8. Decidir stack do worker (ver §3)               → verifica: decisão registrada
9. WhatsApp adapter + templates aprovados         → verifica: enviar 1 mensagem de teste
10. Worker do aviso de tempo                       → verifica: critério da §11 (idempotência)
11. Ocorrência → notificação manual                → verifica: critério da §11
12. Modo automático: webhook + flag                → verifica: liga/desliga sem tocar no código
```

---

## Anexo A — Marketing / captação (Fase 3, esboço)

> Módulo separado, **depois** do núcleo operacional. Esboço sujeito a duas definições:
> (1) ela já usa uma plataforma de marketing? (2) a base tem opt-in?
> **Defaults assumidos** até confirmar: envio via plataforma externa (adapter); sem opt-in
> garantido → o módulo começa coletando consentimento.

### Princípios (inegociáveis)

- **Número separado.** Marketing nunca compartilha número com os alertas operacionais — um
  ban de marketing não pode derrubar o aviso de tempo/ocorrência.
- **Opt-in obrigatório** (política da Meta + LGPD) e **opt-out** sempre ("SAIR"). Todo público
  é filtrado por consentimento `opt_in` vigente — sem exceção.
- **Marketing é outra categoria** de template: mais caro, com limite de frequência por
  destinatário e throttling de qualidade. Confirmar regras/preços atuais da Meta antes do volume.
- **Warm-up + relevância.** Base grande disparada fria queima o número. Segmentar e ir devagar.

### Arquitetura

O sistema é o **cérebro de segmentação** (monta públicos a partir do que só ele sabe:
frequência no play, última visita, é mensalista?). O **envio** é um adapter:
- **Impl A (default):** exporta/sincroniza o público para uma plataforma externa, que cuida de
  templates, opt-out e entregabilidade.
- **Impl B (opcional):** envio in-house pela API oficial, no número de marketing, com rate
  limiting e tratamento de opt-out.

### Esboço de modelo (NÃO faz parte do schema núcleo da §5)

```sql
-- Lead: contato que pode virar mensalista (ex.: responsável de criança no play)
create table lead (
  id          uuid primary key default gen_random_uuid(),
  contato_id  uuid not null references contato(id) on delete cascade,
  origem      text,                          -- 'play' | 'diaria' | 'indicacao' | ...
  status      text not null default 'novo',  -- novo | contatado | convertido | perdido
  created_at  timestamptz not null default now()
);

-- Ledger de consentimento: base de TODO público de marketing
create table consentimento (
  id            uuid primary key default gen_random_uuid(),
  contato_id    uuid not null references contato(id) on delete cascade,
  canal         text not null default 'whatsapp',
  status        text not null,               -- opt_in | opt_out
  origem        text,                         -- como foi coletado
  registrado_em timestamptz not null default now()
);

-- Público salvo: a segmentação como consulta nomeada
create table publico (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  definicao   jsonb not null,                -- ex.: play 2+ em 30d AND não-mensalista
  created_at  timestamptz not null default now()
);
```

> **Regra de ouro:** ao materializar um `publico`, sempre cruzar com `consentimento` e manter
> só quem está `opt_in`. Sem isso, nenhum disparo.

### Decisões pendentes

1. Plataforma externa existente vs. envio in-house (decide se a Impl B é necessária).
2. Estado do opt-in da base (decide se a 1ª ação é coleta de consentimento).

---

## Apêndice — convenções

- **PKs:** `uuid` com `gen_random_uuid()`. **Timestamps:** `timestamptz default now()`.
- **Dinheiro:** `numeric(10,2)`, nunca `float`. **Telefone:** E.164 (`+55DDDNUMERO`).
- **Soft delete:** `crianca.ativo`. **Nomes:** `snake_case`, tabelas no singular.
- **Tarifa:** assume hora única + fração arredondada pra cima (confirmar valores e regra da 1ª hora).
- **Maquininha física:** sem integração — concilia só manual. Automático (Checkout/InfiniteTap)
  fica atrás de flag, default off.
