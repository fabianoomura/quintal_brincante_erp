-- Quintal Brincante — Fase 1, schema inicial (spec §5)
-- Enums + tabelas + índices. RLS vem na migration seguinte.

-- ─────────────────────────────────────────────────────────────
-- 5.1 Enums
-- ─────────────────────────────────────────────────────────────
create type papel_contato      as enum ('responsavel', 'autorizado', 'emergencia');
create type origem_presenca    as enum ('mensalista', 'diaria', 'espaco_kids', 'colonia');
create type status_lancamento  as enum ('pendente', 'pago', 'cancelado');
create type tipo_ocorrencia     as enum ('banheiro', 'nao_adaptou', 'saude', 'comportamento', 'outro');
create type tipo_notificacao    as enum ('aviso_tempo', 'ocorrencia', 'aviso_geral');
create type status_notificacao  as enum ('pendente', 'enviada', 'entregue', 'lida', 'falha');

-- ─────────────────────────────────────────────────────────────
-- 5.2 Pessoas
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5.3 Turma e mensalidade
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5.4 Tarifa e configuração
-- ─────────────────────────────────────────────────────────────
create table tarifa (
  id                     uuid primary key default gen_random_uuid(),
  nome                   text not null default 'play',
  minimo_minutos         int  not null default 60,    -- piso de cobrança (1 hora)
  valor_hora             numeric(10,2) not null,       -- << PREENCHER (seed)
  tamanho_fracao_min     int  not null,                -- << PREENCHER (ex.: 15 ou 30)
  valor_fracao           numeric(10,2) not null,       -- << PREENCHER
  aviso_antecedencia_min int  not null default 15,     -- avisa faltando N min p/ o limite
  ativo                  boolean not null default true,
  created_at             timestamptz not null default now()
);

create table config_sistema (
  id                     int primary key default 1 check (id = 1),
  conciliacao_automatica boolean not null default false,  -- modo automático (Checkout/webhook)
  aviso_tempo_ativo      boolean not null default true,   -- worker de aviso de tempo
  created_at             timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.5 Presença (o átomo)
-- ─────────────────────────────────────────────────────────────
create table presenca (
  id                   uuid primary key default gen_random_uuid(),
  crianca_id           uuid not null references crianca(id) on delete cascade,
  data                 date not null,
  entrada              time not null,
  saida                time,                    -- null = ainda no espaço
  origem               origem_presenca not null,
  tempo_contratado_min int,                      -- só play: limite previsto p/ o aviso
  valor                numeric(10,2),            -- calculado no check-out (play/diária)
  obs                  text,
  created_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.6 Financeiro
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5.7 Ocorrências e notificações
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- 5.8 Índices
-- ─────────────────────────────────────────────────────────────
create index idx_presenca_data        on presenca (data);
create index idx_presenca_abertas     on presenca (origem) where saida is null;  -- worker
create index idx_lancamento_status    on lancamento (status, vencimento);
create index idx_crianca_contato_cont on crianca_contato (contato_id);
create index idx_notificacao_status   on notificacao (status) where status = 'pendente';
