-- Fase 3 — colônia de férias: programa sazonal com período, valor e vagas.
-- Edições geridas pelo admin; inscrição feita por qualquer colaborador (recepção).

create table colonia (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  inicio      date not null,
  fim         date not null,
  valor       numeric(10,2) not null,
  vagas       int,                        -- null = sem limite
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table colonia enable row level security;
create policy colab_read_colonia on colonia for select to authenticated using (is_colaborador());
create policy admin_all_colonia  on colonia for all    to authenticated using (is_admin()) with check (is_admin());

create table inscricao_colonia (
  id          uuid primary key default gen_random_uuid(),
  colonia_id  uuid not null references colonia(id) on delete cascade,
  crianca_id  uuid not null references crianca(id) on delete cascade,
  valor       numeric(10,2) not null,
  created_at  timestamptz not null default now(),
  unique (colonia_id, crianca_id)         -- evita inscrição duplicada
);

alter table inscricao_colonia enable row level security;
create policy colab_all_inscricao on inscricao_colonia
  for all to authenticated using (is_colaborador()) with check (is_colaborador());

create index idx_inscricao_colonia on inscricao_colonia (colonia_id);
