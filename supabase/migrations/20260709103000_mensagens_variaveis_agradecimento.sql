-- Variaveis padronizadas para mensagens e agradecimento ao encerrar checkout.

alter type tipo_notificacao add value if not exists 'agradecimento_checkout';

create table if not exists mensagem_variavel (
  id          uuid primary key default gen_random_uuid(),
  chave       text not null unique check (chave ~ '^[a-z0-9_]+$'),
  placeholder text generated always as ('{{' || chave || '}}') stored,
  rotulo      text not null,
  descricao   text not null,
  exemplo     text,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table mensagem_variavel enable row level security;

drop policy if exists colab_read_msg_var on mensagem_variavel;
drop policy if exists admin_all_msg_var on mensagem_variavel;

create policy colab_read_msg_var
  on mensagem_variavel for select to authenticated using (is_colaborador());

create policy admin_all_msg_var
  on mensagem_variavel for all to authenticated using (is_admin()) with check (is_admin());

insert into mensagem_variavel (chave, rotulo, descricao, exemplo, ordem)
values
  ('responsavel_nome', 'Responsável', 'Primeiro nome do responsável principal.', 'Fabiano', 1),
  ('crianca_nome', 'Criança', 'Primeiro nome da criança.', 'Helena', 2),
  ('minutos_restantes', 'Minutos restantes', 'Minutos que faltam para acabar o tempo contratado.', '15', 3),
  ('detalhe', 'Detalhe do aviso', 'Texto do aviso rapido ou da ocorrencia.', 'A crianca precisa trocar de roupa.', 4),
  ('valor', 'Valor', 'Valor formatado em reais, quando a mensagem envolver cobranca.', 'R$ 25,00', 5),
  ('data', 'Data', 'Data de referencia da mensagem.', '09/07/2026', 6)
on conflict (chave) do update
set
  rotulo = excluded.rotulo,
  descricao = excluded.descricao,
  exemplo = excluded.exemplo,
  ordem = excluded.ordem,
  ativo = true;

insert into mensagem_template (chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem)
values (
  'agradecimento_checkout',
  '💚 Agradecimento checkout',
  'sistema',
  null,
  'Obrigado pela visita, {{responsavel_nome}}! {{crianca_nome}} já saiu do play. Até a próxima! 💚',
  'utility',
  14
)
on conflict (chave) do nothing;

-- Migra os defaults conhecidos para variaveis nomeadas, preservando edicoes manuais.
update mensagem_template
set texto = 'Olá {{responsavel_nome}}, o tempo de {{crianca_nome}} no play está chegando ao fim. Faltam {{minutos_restantes}} min. Pode vir se aproximando, por favor?'
where chave = 'aviso_tempo'
  and texto in (
    'Ola {{1}}, o tempo do(a) {{2}} no play esta acabando (faltam {{3}} min).',
    'Olá {{1}}, o tempo do(a) {{2}} no play está acabando (faltam {{3}} min).',
    'Olá {{1}}, o tempo de {{2}} no play está chegando ao fim. Faltam {{3}} min. Pode vir se aproximando, por favor?'
  );

update mensagem_template
set texto = 'Olá {{responsavel_nome}}, sobre {{crianca_nome}}: {{detalhe}}'
where chave = 'ocorrencia'
  and texto in (
    'Ola {{1}}, sobre {{2}}: {{3}}. Pode vir ao espaco?',
    'Olá {{1}}, sobre {{2}}: {{3}}. Pode vir ao espaço?',
    'Olá {{1}}, sobre {{2}}: {{3}}'
  );

update mensagem_template
set texto = 'Olá {{responsavel_nome}}! 🌳 {{crianca_nome}} acabou de entrar no play.

Combinados do Quintal:
• As crianças permanecem no espaço do play.
• Se a criança quiser sair, o responsável vem buscá-la.
• Adultos não permanecem no espaço do play.

Qualquer coisa, avisamos por aqui. 💚'
where chave = 'boas_vindas'
  and texto like 'Olá {{1}}!%{{2}}%';
