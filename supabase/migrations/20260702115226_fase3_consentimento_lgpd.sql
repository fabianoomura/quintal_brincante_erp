-- Fase 3 — consentimento LGPD (spec §9): registro do consentimento do responsável para
-- guardar os dados da criança (cadastro, saúde e foto). Null = ainda não coletado.
alter table crianca add column consentimento_em  timestamptz;
alter table crianca add column consentimento_por text;   -- nome do responsável que consentiu
