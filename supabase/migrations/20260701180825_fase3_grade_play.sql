-- Fase 3 — grade de horários/valores do play. Preço FIXO por período (não por hora),
-- variando por dia da semana + janela de horário (almoço/jantar). Capacidade opcional.
-- Substitui o tarifador "estacionamento" na cobrança do play.
create table grade_play (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,               -- ex.: "2ª a 4ª — almoço"
  dias_semana int[] not null,              -- 0=dom .. 6=sáb
  hora_inicio time not null,
  hora_fim    time not null,
  valor       numeric(10,2) not null,
  capacidade  int,                          -- opcional/editável (vagas do período)
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table grade_play enable row level security;
create policy colab_read_grade on grade_play for select to authenticated using (is_colaborador());
create policy admin_all_grade  on grade_play for all    to authenticated using (is_admin()) with check (is_admin());
