-- Boas-vindas ("combinados") na primeira entrada do play.
-- Template editável em /mensagens (chave 'boas_vindas'); enum ganha o novo tipo.

alter type tipo_notificacao add value if not exists 'boas_vindas';

insert into mensagem_template (chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem)
select
  'boas_vindas',
  '💚 Boas-vindas (combinados)',
  'sistema',
  null,
  'Olá {{1}}! 🌳 Boas-vindas ao Quintal Brincante — {{2}} acabou de entrar no play.

Nossos combinados:
• As crianças não podem ficar saindo do local.
• Caso a criança queira sair, o responsável deverá vir buscá-la.
• Não é permitida a presença/permanência de adultos no espaço do play.

Qualquer coisa, avisamos por aqui. 💚',
  'utility',
  13
where not exists (select 1 from mensagem_template where chave = 'boas_vindas');
