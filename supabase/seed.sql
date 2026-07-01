-- Seed de DEV (aplicado por `supabase db reset`). NÃO são valores oficiais.
-- ⚠️ TODO(dono): confirmar os valores reais da tarifa e a regra da 1ª hora (spec §5.4/§6).
--    Estes números são PLACEHOLDERS só para o ambiente local funcionar de ponta a ponta.

insert into config_sistema (id) values (1)
  on conflict (id) do nothing;

insert into tarifa (nome, minimo_minutos, valor_hora, tamanho_fracao_min, valor_fracao, aviso_antecedencia_min, ativo)
select 'play', 60, 20.00, 30, 10.00, 15, true
where not exists (select 1 from tarifa where ativo);

-- Grade do play (valores REAIS do dono; horários 11–14 / 18–21 são ponto de partida editável).
insert into grade_play (nome, dias_semana, hora_inicio, hora_fim, valor, capacidade)
select * from (values
  ('2a a 4a - almoco',  array[1,2,3], time '11:00', time '14:00', 8.00,  2),
  ('2a a 4a - jantar',  array[1,2,3], time '18:00', time '21:00', 8.00,  5),
  ('5a e 6a - almoco',  array[4,5],   time '11:00', time '14:00', 15.00, 3),
  ('5a e 6a - jantar',  array[4,5],   time '18:00', time '21:00', 15.00, 8),
  ('Sabado - almoco',   array[6],     time '11:00', time '14:00', 20.00, 10),
  ('Sabado - jantar',   array[6],     time '18:00', time '21:00', 20.00, 15),
  ('Domingo - almoco',  array[0],     time '11:00', time '14:00', 20.00, 10),
  ('Domingo - jantar',  array[0],     time '18:00', time '21:00', 20.00, 6)
) as g(nome, dias_semana, hora_inicio, hora_fim, valor, capacidade)
where not exists (select 1 from grade_play);
