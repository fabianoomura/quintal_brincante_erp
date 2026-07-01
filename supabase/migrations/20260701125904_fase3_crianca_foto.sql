-- Fase 3 — foto da criança (avatar). Imagem compactada como data URL (base64) no banco,
-- p/ não depender do Storage. ⚠️ Dado sensível de menor (LGPD): acesso já restrito pela RLS;
-- exige consentimento do responsável (ver backlog de consentimento).
alter table crianca add column foto text;
