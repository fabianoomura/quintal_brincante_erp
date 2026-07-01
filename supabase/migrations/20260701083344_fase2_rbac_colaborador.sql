-- Fase 2 — RBAC: colaborador com login + níveis de acesso (admin/operador).
-- Evolui a RLS de "qualquer autenticado" (MVP) para baseada em colaborador (spec §9).

-- ─────────────────────────────────────────────────────────────
-- Colaborador (funcionário) — vinculado ao auth.users p/ login.
-- ─────────────────────────────────────────────────────────────
create type papel_acesso as enum ('admin', 'operador');

create table colaborador (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete set null,
  nome         text not null,
  funcao       text,                                   -- educador, recepção, coordenação...
  papel_acesso papel_acesso not null default 'operador',
  telefone     text,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Helpers de RLS. SECURITY DEFINER: rodam como owner e não sofrem RLS,
-- evitando recursão quando a política é na própria tabela colaborador.
-- ─────────────────────────────────────────────────────────────
create or replace function is_colaborador() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from colaborador where user_id = auth.uid() and ativo
  );
$$;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from colaborador
    where user_id = auth.uid() and ativo and papel_acesso = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Substituir as políticas do MVP (using true) por políticas por papel.
-- Tier A (operacional): qualquer colaborador ativo tem acesso total.
-- Tier B (gestão/config): admin escreve; qualquer colaborador lê.
-- ─────────────────────────────────────────────────────────────

-- Remove as políticas antigas equipe_total_*
drop policy equipe_total_crianca         on crianca;
drop policy equipe_total_contato         on contato;
drop policy equipe_total_crianca_contato on crianca_contato;
drop policy equipe_total_turma           on turma;
drop policy equipe_total_mensalidade     on mensalidade;
drop policy equipe_total_tarifa          on tarifa;
drop policy equipe_total_config_sistema  on config_sistema;
drop policy equipe_total_presenca        on presenca;
drop policy equipe_total_lancamento      on lancamento;
drop policy equipe_total_ocorrencia      on ocorrencia;
drop policy equipe_total_notificacao     on notificacao;

-- Tier A — operacional (qualquer colaborador)
create policy colab_all_crianca         on crianca         for all to authenticated using (is_colaborador()) with check (is_colaborador());
create policy colab_all_contato         on contato         for all to authenticated using (is_colaborador()) with check (is_colaborador());
create policy colab_all_crianca_contato on crianca_contato for all to authenticated using (is_colaborador()) with check (is_colaborador());
create policy colab_all_presenca        on presenca        for all to authenticated using (is_colaborador()) with check (is_colaborador());
create policy colab_all_lancamento      on lancamento      for all to authenticated using (is_colaborador()) with check (is_colaborador());
create policy colab_all_ocorrencia      on ocorrencia      for all to authenticated using (is_colaborador()) with check (is_colaborador());
create policy colab_all_notificacao     on notificacao     for all to authenticated using (is_colaborador()) with check (is_colaborador());

-- Tier B — gestão/config (leitura p/ colaborador; escrita só admin)
alter table colaborador enable row level security;

create policy colab_read_turma   on turma   for select to authenticated using (is_colaborador());
create policy admin_all_turma    on turma   for all    to authenticated using (is_admin()) with check (is_admin());

create policy colab_read_mensalidade on mensalidade for select to authenticated using (is_colaborador());
create policy admin_all_mensalidade  on mensalidade for all    to authenticated using (is_admin()) with check (is_admin());

create policy colab_read_tarifa  on tarifa  for select to authenticated using (is_colaborador());
create policy admin_all_tarifa   on tarifa  for all    to authenticated using (is_admin()) with check (is_admin());

create policy colab_read_config  on config_sistema for select to authenticated using (is_colaborador());
create policy admin_all_config   on config_sistema for all    to authenticated using (is_admin()) with check (is_admin());

create policy colab_read_colaborador on colaborador for select to authenticated using (is_colaborador());
create policy admin_all_colaborador  on colaborador for all    to authenticated using (is_admin()) with check (is_admin());
