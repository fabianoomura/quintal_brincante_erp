-- Fase 2 — ambientes/salas (OPCIONAL). Quem controla espaços distintos (ateliê,
-- brinquedoteca, área externa) usa; quem não usa deixa presenca.ambiente_id nulo.

create table ambiente (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  capacidade  int,                        -- lotação da sala (opcional)
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table ambiente enable row level security;
create policy colab_read_ambiente on ambiente for select to authenticated using (is_colaborador());
create policy admin_all_ambiente  on ambiente for all    to authenticated using (is_admin()) with check (is_admin());

alter table presenca add column ambiente_id uuid references ambiente(id) on delete set null;
