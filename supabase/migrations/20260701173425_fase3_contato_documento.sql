-- Fase 3 — documento do responsável (CPF preferencial; RG opcional).
-- Guardado no contato (a pessoa). ⚠️ dado pessoal (LGPD): acesso já restrito pela RLS.
alter table contato add column cpf text;
alter table contato add column rg  text;
