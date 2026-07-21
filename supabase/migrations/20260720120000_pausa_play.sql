-- Pausa do play: para o cronômetro quando a criança precisa sair um instante
-- (banheiro, lanche, colo). O tempo pausado NÃO é cobrado nem conta para o aviso
-- de tempo. `pausada_em` não-nulo = pausada agora (guarda o instante em que pausou);
-- `pausa_total_seg` acumula os segundos das pausas já retomadas.
alter table presenca
  add column if not exists pausada_em timestamptz,
  add column if not exists pausa_total_seg integer not null default 0;
