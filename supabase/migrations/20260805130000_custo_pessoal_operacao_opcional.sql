-- O custo pode chegar depois da escala. Null significa "ainda não informado";
-- zero continua significando que o custo real do dia foi zero.
alter table public.operacao_play_dia
  alter column custo_pessoal drop default,
  alter column custo_pessoal drop not null;
