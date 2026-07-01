-- Fase 2 — planos de mensalidade: o preço varia por frequência (diário / 2x / 3x na semana).
-- O plano define frequência + valor de referência; a mensalidade aponta p/ um plano e pode
-- opcionalmente fixar quais dias da semana a criança vem.

create table plano_mensalidade (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,                 -- ex.: "3x por semana"
  dias_por_semana  int  not null check (dias_por_semana between 1 and 7),
  valor            numeric(10,2) not null,        -- valor de referência do plano
  ativo            boolean not null default true,
  created_at       timestamptz not null default now()
);

alter table plano_mensalidade enable row level security;
create policy colab_read_plano on plano_mensalidade for select to authenticated using (is_colaborador());
create policy admin_all_plano  on plano_mensalidade for all    to authenticated using (is_admin()) with check (is_admin());

-- Liga a mensalidade ao plano + dias fixos opcionais (0=domingo .. 6=sábado).
alter table mensalidade add column plano_id    uuid references plano_mensalidade(id) on delete set null;
alter table mensalidade add column dias_semana int[];
