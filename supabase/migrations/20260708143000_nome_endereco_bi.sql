-- Campos opcionais para BI e segmentacao futura.
-- Mantem `nome` como nome de exibicao/compatibilidade e adiciona partes separadas.

alter table crianca
  add column if not exists primeiro_nome text,
  add column if not exists sobrenome text,
  add column if not exists endereco text;

alter table contato
  add column if not exists primeiro_nome text,
  add column if not exists sobrenome text,
  add column if not exists endereco text;

-- Backfill suave para registros antigos. Nao sobrescreve o que ja estiver preenchido.
update crianca
set
  primeiro_nome = coalesce(primeiro_nome, split_part(trim(nome), ' ', 1)),
  sobrenome = coalesce(
    sobrenome,
    nullif(trim(substr(trim(nome), length(split_part(trim(nome), ' ', 1)) + 1)), '')
  )
where nome is not null;

update contato
set
  primeiro_nome = coalesce(primeiro_nome, split_part(trim(nome), ' ', 1)),
  sobrenome = coalesce(
    sobrenome,
    nullif(trim(substr(trim(nome), length(split_part(trim(nome), ' ', 1)) + 1)), '')
  )
where nome is not null;

-- Textos mais amigaveis. So atualiza os defaults antigos, preservando edicoes manuais.
update mensagem_template
set texto = 'A criança pediu para ir ao banheiro. Pode vir ajudar, por favor?'
where chave = 'banheiro'
  and texto in ('Precisa ir ao banheiro - pode vir ajudar?', 'Precisa ir ao banheiro — pode vir ajudar?');

update mensagem_template
set texto = 'A criança precisa trocar de roupa. Pode vir ao espaço, por favor?'
where chave = 'trocar'
  and texto in ('Precisa trocar de roupa - pode vir?', 'Precisa trocar de roupa — pode vir?');

update mensagem_template
set texto = 'A criança está chorando e precisando de você por aqui. Pode vir ao espaço?'
where chave = 'chorando'
  and texto in (
    'Esta chorando / ainda nao se adaptou - pode vir?',
    'Está chorando / ainda não se adaptou — pode vir?'
  );

update mensagem_template
set texto = 'Pode vir buscar a criança, por favor? Estamos aguardando por aqui.'
where chave = 'buscar'
  and texto = 'Pode vir buscar a crianca, por favor.';

update mensagem_template
set texto = 'Olá {{1}}, o tempo de {{2}} no play está chegando ao fim. Faltam {{3}} min. Pode vir se aproximando, por favor?'
where chave = 'aviso_tempo'
  and texto in (
    'Ola {{1}}, o tempo do(a) {{2}} no play esta acabando (faltam {{3}} min).',
    'Olá {{1}}, o tempo do(a) {{2}} no play está acabando (faltam {{3}} min).'
  );

update mensagem_template
set texto = 'Olá {{1}}, sobre {{2}}: {{3}}'
where chave = 'ocorrencia'
  and texto in (
    'Ola {{1}}, sobre {{2}}: {{3}}. Pode vir ao espaco?',
    'Olá {{1}}, sobre {{2}}: {{3}}. Pode vir ao espaço?'
  );

update mensagem_template
set nome = '💚 Boas-vindas', texto = 'Olá {{1}}! 🌳 {{2}} acabou de entrar no play.

Combinados do Quintal:
• As crianças permanecem no espaço do play.
• Se a criança quiser sair, o responsável vem buscá-la.
• Adultos não permanecem no espaço do play.

Qualquer coisa, avisamos por aqui. 💚'
where chave = 'boas_vindas'
  and nome = '💚 Boas-vindas (combinados)';
