-- Fase 3 — reposição de dia do mensalista. Ex.: criança vai Ter/Sex; viajou e perdeu um dia,
-- pode repor em outra data. Registra a falta e (opcionalmente) a data de reposição.
-- Ligada à criança (sobrevive a troca de matrícula). Operacional (recepção registra).

create table reposicao (
  id             uuid primary key default gen_random_uuid(),
  crianca_id     uuid not null references crianca(id) on delete cascade,
  data_falta     date not null,
  data_reposicao date,                       -- null = ainda a repor
  obs            text,
  created_at     timestamptz not null default now()
);

alter table reposicao enable row level security;
create policy colab_all_reposicao on reposicao
  for all to authenticated using (is_colaborador()) with check (is_colaborador());

create index idx_reposicao_crianca on reposicao (crianca_id);
