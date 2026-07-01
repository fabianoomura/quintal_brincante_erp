-- Fase 3 — feriados: valor único de feriado (play mais caro) + datas locais.
-- Os feriados nacionais são calculados no código; a tabela guarda só os locais/extras.
alter table config_sistema add column valor_feriado numeric(10,2);

create table feriado (
  id         uuid primary key default gen_random_uuid(),
  data       date not null unique,
  nome       text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

alter table feriado enable row level security;
create policy colab_read_feriado on feriado for select to authenticated using (is_colaborador());
create policy admin_all_feriado  on feriado for all    to authenticated using (is_admin()) with check (is_admin());
