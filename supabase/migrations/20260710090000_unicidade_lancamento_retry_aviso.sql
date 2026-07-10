-- Blindagem de concorrência (2026-07-10).
-- A idempotência de lançamento e de aviso de tempo era garantida só por
-- leitura-antes-de-escrita no código; aqui ela passa a ser garantida pelo banco.

-- 1) No máx. 1 lançamento por origem + vencimento. Protege contra check-out duplo
--    simultâneo (quiosque + celular) e geração concorrente de mensalidade (botão +
--    pg_cron). Avulsos (origem_id null) ficam de fora.
create unique index if not exists uq_lancamento_origem_vencimento
  on lancamento (origem_tipo, origem_id, vencimento)
  where origem_id is not null;

-- 2) No máx. 1 notificação de aviso_tempo por presença. Duas execuções sobrepostas
--    do worker não conseguem inserir (e portanto enviar) o aviso duas vezes.
create unique index if not exists uq_notificacao_aviso_tempo
  on notificacao (presenca_id)
  where tipo = 'aviso_tempo' and presenca_id is not null;

-- 3) Contador de tentativas de envio. Aviso que FALHOU pode ser reenviado (com teto)
--    atualizando a MESMA linha — sem violar o índice acima.
alter table notificacao
  add column if not exists tentativas int not null default 1;
