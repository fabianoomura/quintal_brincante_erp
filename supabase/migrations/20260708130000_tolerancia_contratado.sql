-- Tolerância após o tempo contratado (play): se a criança passar do contratado em
-- até X minutos, cobra só o contratado; passou disso, cobra o tempo real.
-- Default 0 = sem tolerância (comportamento atual). Editável em /configuracoes.
alter table config_sistema
  add column if not exists tolerancia_min integer not null default 0;
