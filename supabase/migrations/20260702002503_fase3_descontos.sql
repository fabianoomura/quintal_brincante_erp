-- Fase 3 — descontos: na baixa (operador aplica % ou R$, habilitável) e por irmão
-- (% sobre o 2º filho em diante, mensalidade/colônia). O desconto fica no lançamento;
-- o valor efetivo (a receber/recebido) = valor - desconto.
alter table config_sistema add column desconto_ativo boolean not null default false;
alter table config_sistema add column desconto_irmao_percentual numeric(5,2); -- null/0 = desligado
alter table lancamento add column desconto numeric(10,2) not null default 0;
