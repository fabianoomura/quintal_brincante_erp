-- Quintal Brincante — RLS equipe-only (spec §9, MVP)
-- Autenticado = equipe (acesso total). Anônimo (sem JWT) → 0 linhas.
-- Na Fase 2 (login de pais), trocar `using (true)` por checagem em membro_equipe.

-- Habilitar RLS em TODAS as tabelas
alter table crianca          enable row level security;
alter table contato          enable row level security;
alter table crianca_contato  enable row level security;
alter table turma            enable row level security;
alter table mensalidade      enable row level security;
alter table tarifa           enable row level security;
alter table config_sistema   enable row level security;
alter table presenca         enable row level security;
alter table lancamento       enable row level security;
alter table ocorrencia       enable row level security;
alter table notificacao      enable row level security;

-- Política por tabela: equipe autenticada tem acesso total; anônimo não vê nada.
create policy equipe_total_crianca         on crianca         for all to authenticated using (true) with check (true);
create policy equipe_total_contato         on contato         for all to authenticated using (true) with check (true);
create policy equipe_total_crianca_contato on crianca_contato for all to authenticated using (true) with check (true);
create policy equipe_total_turma           on turma           for all to authenticated using (true) with check (true);
create policy equipe_total_mensalidade     on mensalidade     for all to authenticated using (true) with check (true);
create policy equipe_total_tarifa          on tarifa          for all to authenticated using (true) with check (true);
create policy equipe_total_config_sistema  on config_sistema  for all to authenticated using (true) with check (true);
create policy equipe_total_presenca        on presenca        for all to authenticated using (true) with check (true);
create policy equipe_total_lancamento      on lancamento      for all to authenticated using (true) with check (true);
create policy equipe_total_ocorrencia      on ocorrencia      for all to authenticated using (true) with check (true);
create policy equipe_total_notificacao     on notificacao     for all to authenticated using (true) with check (true);
