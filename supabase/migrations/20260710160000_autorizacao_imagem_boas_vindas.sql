-- Autorização de uso de imagem + novo texto de boas-vindas (2026-07-10).

-- 1) Resposta do responsável sobre uso de imagem da criança.
--    null = ainda não respondeu (pendente) · true = autorizou · false = negou.
alter table crianca add column if not exists autorizacao_imagem boolean;
alter table crianca add column if not exists autorizacao_imagem_em timestamptz;

-- 2) Tipo próprio de notificação p/ a pergunta de autorização (auditoria separada
--    das boas-vindas; enviada 1x no total enquanto o cadastro estiver sem resposta).
alter type tipo_notificacao add value if not exists 'autorizacao_imagem';

-- 3) Novo texto das boas-vindas (combinados do Play Vila Verde), sem a pergunta de
--    autorização — ela virou o template próprio abaixo. Editável em /mensagens.
update mensagem_template set texto = '💚 Boas-vindas ao nosso Play Vila Verde!

Olá, {{responsavel_nome}}! 🌿
Que alegria receber {{crianca_nome}} por aqui!

Antes da brincadeira começar, alguns combinados de cuidado:

🪟 O Play é território das crianças: adultos não permanecem no espaço. Se quiser ficar pertinho, escolha uma mesa próxima ao vidro.

🚻 Precisou ir ao banheiro? A gente te chama pelo celular para buscar {{crianca_nome}} e, depois, é só trazer de volta.

🍎 Comidas e bebidas ficam do lado de fora, combinado? Assim, a brincadeira acontece sem interrupções.

⏱️ O tempo é contínuo: saídas não pausam o cronômetro e, caso {{crianca_nome}} não se adapte, a primeira hora será contabilizada integralmente.

📹 Nosso espaço é monitorado por câmeras, como parte dos nossos protocolos de cuidado e segurança.

🌿 Pronto. Por aqui começa a nossa grande aventura! 💚

Sempre que precisar, estamos à disposição.

Equipe Vilarejo Londrina 🌿'
where chave = 'boas_vindas';

-- 4) Pergunta de autorização de imagem (botão interativo não é confiável na Evolution/
--    Baileys → resposta por texto SIM/NÃO, registrada pela equipe no cadastro).
insert into mensagem_template (chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem)
select
  'autorizacao_imagem',
  '📸 Autorização de imagem',
  'sistema',
  null,
  '📸 Só mais uma coisinha, {{responsavel_nome}}: você autoriza o uso da imagem de {{crianca_nome}} nos registros do Vilarejo?

Responda *SIM* ou *NÃO* por aqui mesmo, por favor. 💚',
  'utility',
  15
where not exists (select 1 from mensagem_template where chave = 'autorizacao_imagem');
