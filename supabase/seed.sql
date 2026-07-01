-- Seed de DEV (aplicado por `supabase db reset`). NÃO são valores oficiais.
-- ⚠️ TODO(dono): confirmar os valores reais da tarifa e a regra da 1ª hora (spec §5.4/§6).
--    Estes números são PLACEHOLDERS só para o ambiente local funcionar de ponta a ponta.

insert into config_sistema (id) values (1)
  on conflict (id) do nothing;

insert into tarifa (nome, minimo_minutos, valor_hora, tamanho_fracao_min, valor_fracao, aviso_antecedencia_min, ativo)
select 'play', 60, 20.00, 30, 10.00, 15, true
where not exists (select 1 from tarifa where ativo);
