# Controle do Railway por movimento do Play

## Situação em 28/10/2026

Implementação preparada e testada localmente. **A automação de ligar/desligar não
está ativa em produção.** O usuário autorizou a publicação do controlador e, em
seguida, a criação do domínio público para validação HTTP.
Nesta publicação não houve aplicação de migration no Supabase remoto, publicação
do app na Vercel, parada/reinício de serviços existentes nem alteração de volumes.

O **Play Power Controller** (`f2d8b0c1-7ef1-4847-9383-cd6f50a01f99`) foi publicado
no deployment `63f6c7e1-8d8c-4929-a72f-bb97a9990dd8`: **SUCCESS**, uma réplica online,
healthcheck configurado em `/health` e servidor iniciado na porta 8080 sem erros
nos logs consultados. As variáveis de produção do Supabase e a referência ao token
Railway compartilhado estão presentes. Valores não foram expostos. Isso não valida
as credenciais em uso nem o ciclo completo de parada/reconexão.

Os deployments de Evolution, Postgres e Redis permaneceram exatamente os mesmos
antes/depois da publicação, todos online. Após autorização explícita adicional, foi
criado o domínio público **https://play-power-controller-production.up.railway.app**,
apontando para a porta 8080. A tentativa inicial havia sido bloqueada pela revisão
de segurança; o bloqueio não foi contornado.

Validação externa: `GET /health` retornou **200** com `ok=true`. `POST /__auth_probe`
(rota inexistente) retornou **401** sem segredo e com segredo inválido. Esses testes
não chamaram `/wake`, `/tick` ou `/send`, nem validaram credenciais de integração,
nem acionaram operações nos serviços. A ativação e o ciclo real continuam pendentes.

Após o usuário informar a execução da migration, a consulta ao Supabase remoto
confirmou `enabled=false`, `session_persistence_verified=false`, margem de 600 segundos
e cron `railway-play-control` ativo a cada minuto. Sem as duas flags, o cron não
aciona o controlador. Nenhum estado foi habilitado.

Foram criados no **Vault de produção do ERP** os segredos `play_control_url` e
`play_control_secret`, uma ocorrência de cada, sem imprimir valores. Antes da
gravação, a mesma rota inexistente `/__auth_probe` retornou 401 sem segredo e 404
com o segredo local, comprovando que a cópia local corresponde ao controlador.
A gravação usou uma transação que exigia as duas flags desligadas e recusava
sobrescrever segredos existentes. A leitura posterior confirmou nomes/quantidades
e flags ainda falsas. Não houve chamada de `/wake`, `/tick` ou `/send`.

O acesso à equipe Vercel foi liberado após aprovação do consentimento específico
para `team_95oWTb2geg4NsF2NIjdujzV3`. Projeto confirmado:
`quintal-brincante-erp` (`prj_aJeOUnKNfb2Ta9a53ZMHUG4De3Nj`). Não era um bloqueio
de Deployment Protection do site.

Foram adicionadas, **somente em Production**, `PLAY_CONTROL_URL`,
`PLAY_CONTROL_SECRET` (tipo sensitive/Secret) e `PLAY_CONTROL_ENABLED=false`.
Nenhuma variável anterior foi sobrescrita e não houve redeploy do ERP nessa etapa.
Os valores secretos não foram exibidos. O adapter novo permanece desligado; só deve
ser habilitado numa janela de manutenção após verificar a persistência da sessão.
Validação do código local nesta etapa: 174 testes unitários aprovados, typecheck,
lint dos arquivos alterados e build de produção concluídos. O usuário autorizou
commit/push/deploy do ERP com `PLAY_CONTROL_ENABLED=false`. Publicar pela integração
GitHub/Vercel e conferir o commit e status READY antes de considerar a entrega no ar.

**Pendências para ativação:** validação da persistência da sessão e teste completo,
além da conferência da publicação do código autorizado. O controlador Railway e o Vault já estão configurados;
não repetir essas etapas nem habilitar o SQL sem verificar a persistência e a
publicação do aplicativo. Não é necessário reinstalar/reconectar a Vercel.
O token Railway e a chave Evolution ainda não foram exercitados pelo controlador.
Não habilitar as flags SQL nem parar serviços antes de concluir essas verificações.

O segredo de controle foi gerado; a cópia local está em `.tmp/railway-play-control.secret`
(ignorada pelo Git). Não colocar seu conteúdo em commits, logs ou mensagens.

Projeto: `6cfa871d-55dd-4a39-a8fc-ee670e122b21` (`quintal_brincante_erp`).
Ambiente production: `88af682c-8065-47a4-b389-73f1aa228667`.

## Comportamento implementado

- Entrada/reabertura no Play agenda `/wake` pelo Supabase depois do commit. O check-in
  do app também aguarda `/wake` antes das boas-vindas, inclusive sem template ativo.
- O controlador inicia **Postgres → Evolution** e aguarda a instância `quintal`
  informar estado `open` antes de enviar. Um timeout vira falha auditável no ERP.
- Com a flag do app ativa, **todos** os envios pelo adapter, incluindo conversas,
  fila e workers, passam por `/send`. Um lock com lease no Supabase cobre o envio inteiro.
- Um cron no **Supabase do ERP** chama `/tick` a cada minuto. Não se usa o Postgres
  que será desligado para armazenar estado nem executar o agendamento.
- A margem é de **10 minutos inteiros após a última atividade**, verificada no banco.
  Não depende de timers em memória, aba aberta ou processo da Vercel continuar vivo.
  A precisão do desligamento é a margem mais a próxima execução do cron.
- Presença aberta de Play, inclusive de outro dia, fila ativa de hoje, qualquer envio
  pendente ou falha criada desde a implantação da migration bloqueiam a parada.
  Falha não é considerada envio concluído: exige reenvio/resolução pela equipe.
  Falhas históricas anteriores à migration não bloqueiam; pendências antigas bloqueiam.
- Checkout normal, sem cobrança, desacordo, exclusão, reabertura e alterações de
  mensagens/fila atualizam a margem via triggers. Mensagens recebidas também a estendem.
- Sem bloqueios e após a margem: para **Evolution → Postgres**. Confere novamente
  a atividade antes de cada parada e depois da última; novo check-in causa religamento.
  O `/wake`/`/send` concorrente aguarda o lock e só envia depois da reconexão.
- Sem leitura confiável do banco, lock válido ou confirmação Railway, interrompe a
  operação. Não prossegue para parar o Postgres se não confirmou a parada da Evolution.

Envio concluído significa **aceito pela Evolution com id de mensagem**, conforme a
auditoria existente do ERP. Isso não comprova entrega/leitura no aparelho da família;
a margem permite completar a transmissão. Não se faz retry automático de um POST
de envio com resultado incerto, para evitar mensagens duplicadas.

## Persistência e limites

O Redis permanece ligado, com seu volume `/data`. O Postgres mantém o volume
`55d91169-6768-4647-8e43-74321958e6bf`, em `/var/lib/postgresql/data`.
O controlador usa apenas `deploymentStop` e `deploymentRedeploy`: não remove serviços,
deployments, volumes, instâncias WhatsApp, credenciais ou dados. Nunca chama logout,
disconnect, deleteInstance ou exclusão de mensagens.

A Evolution atual não tem volume próprio. Sua sessão pode estar no Postgres ou no
Redis, conforme a configuração da imagem em execução. **A persistência da sessão
ainda não foi validada em produção**; não alterar seu backend nem recriar a instância.
A configuração SQL exige `session_persistence_verified=true` para habilitar o controle.
Antes disso, confirmar a versão/imagem em execução, onde estão as credenciais da
instância `quintal`, e que estão no Postgres/Redis persistente. Uma imagem com sessão
em filesystem efêmero precisa ser corrigida com uma migração de sessão planejada
antes de permitir paradas. Não basta anexar um volume vazio e reiniciar.

O controlador e o Redis geram custo residual. Volumes continuam cobrados mesmo com
serviços parados. O primeiro check-in pode demorar enquanto inicia e reconecta.
Enquanto a Evolution está parada, o ERP não recebe respostas em tempo real;
a importação posterior depende da sincronização do WhatsApp. Pausas prolongadas
podem exigir nova vinculação do WhatsApp mesmo preservando o armazenamento.

## Ativar futuramente

1. Revisar as alterações staged do Railway e confirmar que só incluem o controlador.
   Configurar nele **segredos de produção**, nunca os valores locais de `.env.local`:
   `RAILWAY_PROJECT_TOKEN` (token do projeto limitado ao ambiente production),
   `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do Supabase do ERP.
   O token da conexão OAuth desta conversa não é um token disponível ao serviço.
   A chave Evolution é referenciada como `${{Evolution API.AUTHENTICATION_API_KEY}}`;
   preservar a variável sealed original. O alvo HTTP é a rede privada da Evolution.
2. Após autorização de publicação, aplicar o staged do controlador. Gerar domínio
   público Railway na porta 8080; confirmar `GET /health` 200 e POST sem segredo 401.
   Healthcheck comprova o servidor HTTP, não credenciais/integração prontas.
3. Aplicar integralmente `20261028140000_railway_play_control.sql` no Supabase remoto.
   A migration deixa `enabled=false` e `session_persistence_verified=false`.
4. Criar os segredos `play_control_url` e `play_control_secret` no Supabase Vault:
   a URL pública do controlador, sem rota, e o mesmo `PLAY_CONTROL_SECRET` do Railway.
   Usar o dashboard/Vault, sem imprimir segredos no SQL Editor compartilhado.
5. Verificar a persistência conforme seção anterior. Registrar a evidência operacional.
   Em uma janela sem atendimento, configurar na Vercel `PLAY_CONTROL_ENABLED=true`,
   `PLAY_CONTROL_URL` (URL pública) e `PLAY_CONTROL_SECRET` (mesmo segredo). Preservar
   `WHATSAPP_PROVIDER=evolution` e as variáveis Evolution existentes para rollback.
   Publicar o código do app com essas variáveis **antes** de habilitar o SQL. Durante
   essa breve transição os envios via controlador ficam indisponíveis, por segurança.
6. Depois de confirmar que o app novo está publicado e todos os envios passam pelo
   controlador, habilitar o estado SQL:

   ```sql
   update public.railway_play_state
   set session_persistence_verified = true, enabled = true,
       last_activity_at = clock_timestamp(), revision = revision + 1
   where id;
   ```

7. Em janela sem atendimento, validar um ciclo controlado: primeiro check-in, WhatsApp
   `open`, boas-vindas aceitas, último checkout e agradecimento aceito; só depois dos
   10 minutos confirmar parada na ordem. Verificar novo check-in durante a margem,
   reabertura e envio pela Central de Conversas. Confirmar reconexão sem QR, com
   sessão e volumes intactos. Esse teste real ainda está pendente.

## Conferência e recuperação

```sql
select enabled, session_persistence_verified, margin_seconds, last_activity_at,
       revision, lease_until
from public.railway_play_state;

select jobname, schedule, active from cron.job where jobname = 'railway-play-control';
select status, start_time, end_time, return_message from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'railway-play-control')
order by start_time desc limit 10;

-- Respostas HTTP do pg_net; não selecionar headers, que contêm o segredo.
select id, status_code, timed_out, error_msg, created from net._http_response
order by created desc limit 10;

```

O cron registra o agendamento HTTP; conferir também a resposta HTTP do pg_net e os
logs Railway. Um job SQL bem-sucedido sozinho não comprova uma reconciliação concluída.
Não existe alerta externo novo para falhas nesta implementação.

Para desativar: `update public.railway_play_state set enabled=false where id;`.
Esperar o lease corrente terminar, religar Postgres e depois Evolution pelo Railway,
confirmar `quintal` em `open`, então configurar `PLAY_CONTROL_ENABLED=false` no app
e republicar. Desabilitar não religa automaticamente serviços já parados.
Se houve timeout de mutation Railway, conferir o estado real antes de repetir ações.
Não liberar manualmente um lease de uma execução ainda viva.

## Validação local

`npm test`, `npm run typecheck`, `npm run lint` e `npm run test:railway`.
O último exige o container `supabase_db_quintal_brincante`; executa a migration e os
cenários SQL dentro de uma transação revertida, sem credenciais de produção.
Os testes de controlador simulam Railway/WhatsApp; não param serviços reais.

Referências: [API Railway](https://docs.railway.com/integrations/api),
[parar/reiniciar deployments](https://docs.railway.com/integrations/api/manage-deployments),
[persistência da Evolution](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts).
