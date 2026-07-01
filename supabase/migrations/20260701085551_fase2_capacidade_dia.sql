-- Fase 2 — capacidade máxima de crianças simultâneas no dia.
-- null = sem limite definido (não alerta). Gerido pelo admin em Configurações.
alter table config_sistema add column capacidade_dia int;
