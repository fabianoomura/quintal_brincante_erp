-- Seed de DEV (aplicado por `supabase db reset`). Config mínima p/ o app funcionar.
-- Dados de teste (crianças etc.) ficam em `npm run seed:dev`.

insert into config_sistema (id) values (1)
  on conflict (id) do nothing;

-- Planilha do play (valor/hora por dia da semana × hora). Valores reais do dono:
-- 2ª–4ª R$8 · 5ª–6ª R$15 · sáb/dom R$20, nas janelas 11–14h e 18–21h (editável em /grade).
insert into preco_hora (dia_semana, hora, valor)
select v.dia, h.hora, v.valor
from (values (1, 8.00), (2, 8.00), (3, 8.00), (4, 15.00), (5, 15.00), (6, 20.00), (0, 20.00)) as v(dia, valor)
cross join (values (11), (12), (13), (18), (19), (20)) as h(hora)
where not exists (select 1 from preco_hora);

-- Templates de mensagem (avisos rápidos do play + sistema).
insert into mensagem_template (chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem)
select * from (values
  ('banheiro', '🚽 Banheiro',      'aviso_rapido', 'banheiro'::tipo_ocorrencia,    'Precisa ir ao banheiro - pode vir ajudar?',              'utility', 1),
  ('trocar',   '👕 Trocar roupa',  'aviso_rapido', 'outro'::tipo_ocorrencia,       'Precisa trocar de roupa - pode vir?',                    'utility', 2),
  ('chorando', '😢 Chorando',      'aviso_rapido', 'nao_adaptou'::tipo_ocorrencia, 'Esta chorando / ainda nao se adaptou - pode vir?',       'utility', 3),
  ('buscar',   '🔔 Vir buscar',    'aviso_rapido', 'outro'::tipo_ocorrencia,       'Pode vir buscar a crianca, por favor.',                  'utility', 4),
  ('aviso_tempo','Aviso de tempo', 'sistema',      null,                            'Ola {{1}}, o tempo do(a) {{2}} no play esta acabando (faltam {{3}} min).', 'utility', 10),
  ('ocorrencia', 'Ocorrencia',     'sistema',      null,                            'Ola {{1}}, sobre {{2}}: {{3}}. Pode vir ao espaco?',     'utility', 11),
  ('aviso_geral','Aviso geral',    'sistema',      null,                            'Ola {{1}}, {{2}}',                                       'utility', 12)
) as t(chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem)
where not exists (select 1 from mensagem_template);
