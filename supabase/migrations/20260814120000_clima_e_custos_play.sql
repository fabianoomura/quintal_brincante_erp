-- Separa os custos diários do Play e registra o clima, que influencia diretamente
-- o movimento. Entradas financeiras continuam vindo dos lançamentos de presença.
alter table public.operacao_play_dia
  add column if not exists custo_alimentacao numeric(12,2) not null default 0,
  add column if not exists clima text,
  add column if not exists temperatura_media numeric(5,2);

alter table public.operacao_play_dia
  add constraint operacao_play_custo_alimentacao_valido
    check (custo_alimentacao >= 0),
  add constraint operacao_play_clima_valido
    check (clima is null or clima in (
      'sol', 'sol_entre_nuvens', 'nublado', 'garoa', 'chuva', 'tempestade'
    )),
  add constraint operacao_play_temperatura_valida
    check (temperatura_media is null or temperatura_media between -10 and 60);

comment on column public.operacao_play_dia.custo_alimentacao is
  'Gastos do dia com alimentação, café, água e itens semelhantes.';
comment on column public.operacao_play_dia.outros_custos is
  'Outras saídas variáveis do Play, sem incluir equipe ou alimentação.';
comment on column public.operacao_play_dia.clima is
  'Condição climática predominante informada para analisar o impacto no movimento.';
comment on column public.operacao_play_dia.temperatura_media is
  'Temperatura média aproximada do dia, em graus Celsius.';
