-- Fase 3 — grade do play em PLANILHA hora × dia da semana. Cada célula = valor/hora daquele
-- dia+hora (célula vazia = fechado). Substitui grade_play (períodos).
-- E cada FERIADO passa a ter seu próprio valor (calendário só de feriados).

drop table if exists grade_play cascade;

create table preco_hora (
  dia_semana int not null check (dia_semana between 0 and 6), -- 0=dom..6=sáb
  hora       int not null check (hora between 0 and 23),
  valor      numeric(10,2) not null,
  primary key (dia_semana, hora)
);

alter table preco_hora enable row level security;
create policy colab_read_preco on preco_hora for select to authenticated using (is_colaborador());
create policy admin_all_preco  on preco_hora for all    to authenticated using (is_admin()) with check (is_admin());

-- valor por feriado (o global valor_feriado deixa de ser usado)
alter table feriado add column valor numeric(10,2);
