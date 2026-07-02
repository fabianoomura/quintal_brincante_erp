-- Fase 3 — limpeza de tabelas órfãs:
-- `tarifa`: substituída pela planilha preco_hora (+ valor por feriado).
-- `turma`: nunca usada; os "planos por frequência" cumpriram o papel. Se as turminhas
--   voltarem na Fase 2+, recria-se com o modelo certo.
alter table mensalidade drop column if exists turma_id;
drop table if exists turma cascade;
drop table if exists tarifa cascade;
