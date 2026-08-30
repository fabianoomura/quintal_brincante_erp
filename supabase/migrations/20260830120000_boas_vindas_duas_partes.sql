-- Divide as boas-vindas do Play em duas mensagens menores, mantendo ambas
-- editáveis em /mensagens e enviadas em sequência a cada check-in.
update public.mensagem_template
set
  nome = '💚 Boas-vindas — parte 1',
  texto = $mensagem$💚 Boas-vindas ao nosso Play Vila Verde!

Olá, {{responsavel_nome}}! 🌿
Que alegria receber {{crianca_nome}} por aqui!

📲 A partir de agora, estamos conectados por este WhatsApp.

Esse é um dos nossos principais protocolos de cuidado e segurança: sempre que {{crianca_nome}} precisar de você — para ir ao banheiro, se alimentar, pedir colo ou por qualquer outra necessidade — nossa equipe entrará em contato por este número.

Pode ficar tranquilo e aproveitar seu tempo por aqui. Se sua criança precisar de você, nós vamos chamar. Só mantenha o celular por perto. 💚

💵 VALORES — por hora
Segunda, terça e quarta — R$ 15/h
Quinta, sexta, sábado e domingo — R$ 25/h

⏱️ O tempo é contínuo e não pode ser pausado.
A criança pode sair e retornar ao Play sempre que precisar, mas a contagem segue normalmente. Em caso de não adaptação, a primeira hora é contabilizada integralmente.$mensagem$,
  ordem = 13
where chave = 'boas_vindas';

insert into public.mensagem_template (
  chave, nome, tipo, tipo_ocorrencia, texto, categoria, ordem, ativo
)
values (
  'boas_vindas_parte_2',
  '🌿 Boas-vindas — parte 2 (combinados)',
  'sistema',
  null,
  $mensagem$🌿 Antes da brincadeira começar, alguns combinados importantes de cuidado e segurança:

🪟 O Play é território das crianças.
Nosso espaço foi pensado para elas e, por segurança, somente nossa equipe permanece dentro do Play. Os adultos responsáveis podem ficar pertinho, nas mesas próximas ao vidro.

🚻 Precisou ir ao banheiro?
Para a segurança das crianças e também da nossa equipe, não acompanhamos crianças ao banheiro. Chamaremos por este WhatsApp para que o responsável venha buscar {{crianca_nome}} na recepção e, depois, a traga de volta.

🍎 Comidas e bebidas ficam do lado de fora.
Você pode retirar {{crianca_nome}} para se alimentar e trazê-la de volta normalmente.

🤝 Cuidado também é a forma como nos tratamos.
Respeito e cordialidade com nossos colaboradores são indispensáveis. Não serão toleradas ofensas, ameaças ou qualquer forma de desrespeito à nossa equipe.

💚 Com os combinados feitos, que comece a brincadeira!

Equipe Vilarejo Londrina 🌿$mensagem$,
  'utility',
  14,
  true
)
on conflict (chave) do update
set
  nome = excluded.nome,
  tipo = excluded.tipo,
  tipo_ocorrencia = excluded.tipo_ocorrencia,
  texto = excluded.texto,
  categoria = excluded.categoria,
  ordem = excluded.ordem,
  ativo = excluded.ativo;
