-- Avisos rápidos extras do play (emergência + coringa "Outra") e o template de
-- desculpa quando um check-out é feito por engano. Tudo idempotente (on conflict).
-- Os avisos rápidos e mensagens vivem em tabela de config (editáveis em /mensagens),
-- nunca no código.

-- Tipo de notificação novo p/ auditar o pedido de desculpa (usado só em runtime, não
-- neste arquivo — seguro adicionar aqui como as migrations anteriores fizeram).
alter type tipo_notificacao add value if not exists 'desculpa_engano';

-- 5) Emergência/machucado (tipo 'saude'): faltava um botão rápido para "ralou o joelho".
-- 6) "Outra" (tipo 'outro'): coringa para o que não se encaixa nos demais.
-- + template de desculpa por engano no check-out (sistema, editável).
insert into mensagem_template (chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem)
values
  ('emergencia', '🩹 Machucou', 'aviso_rapido', 'saude'::tipo_ocorrencia,
   'teve um machucadinho leve brincando. Já cuidamos e está tudo bem, mas queríamos avisar. Se puder, venha ao espaço.',
   'utility', 5),
  ('outro_aviso', '💬 Outra', 'aviso_rapido', 'outro'::tipo_ocorrencia,
   'precisamos falar com você um instante. Pode vir ao espaço?',
   'utility', 6),
  ('desculpa_engano', '🙈 Desculpa (engano no check-out)', 'sistema', null,
   'Ops, {{responsavel_nome}}! Foi engano nosso: {{crianca_nome}} continua aqui no play. 🙈 Pode desconsiderar a mensagem de saída. Desculpe pelo susto! 💚',
   'utility', 15)
on conflict (chave) do nothing;
