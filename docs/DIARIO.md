# Diário do projeto — Quintal Brincante ERP

Registro do que foi feito, decisão a decisão. Complementa o [ROADMAP.md](ROADMAP.md)
(plano de evolução), o [DEPLOY.md](DEPLOY.md) (infra), o [OPERACAO.md](OPERACAO.md)
(rotinas do dia a dia) e o [WHATSAPP-EVOLUTION.md](WHATSAPP-EVOLUTION.md) (canal de avisos).
Última atualização: **2026-07-10**.

---

## Estado atual: EM PRODUÇÃO ✅

- **App:** https://quintal-brincante-erp.vercel.app (Vercel; deploy automático a cada
  `git push` na `main` — repo `fabianoomura/quintal_brincante_erp`)
- **Banco/Auth:** Supabase cloud (ref `verzmbntyibvtwfozhdu`), 24 migrations versionadas,
  RLS em tudo
- **Workers:** `pg_cron` → `aviso-tempo` (a cada 5 min) e `mensalidades` (dia 1, 06h BRT)
- **WhatsApp:** Evolution API no Railway (instância `quintal`) — mensagens reais chegando;
  aviso real de tempo do play validado em 2026-07-09
- **Dados:** cadastros, grade, templates e configs preservados. Para remover apenas dados
  de teste operacionais (presenças, lançamentos, ocorrências etc.), usar o runbook em
  [OPERACAO.md](OPERACAO.md)

---

## O que foi construído (por área)

### Núcleo (Etapas 1a–1d do CLAUDE.md)
- Schema completo + RLS/RBAC por colaborador (anônimo = 0 linhas, testado em produção)
- Cadastro de crianças: responsáveis/autorizados/emergência, saúde, foto (webcam/arquivo),
  CPF/RG do responsável, consentimento LGPD com selo de pendência
- Nome de criança e responsável separado em `primeiro_nome` + `sobrenome`, mantendo `nome`
  como campo de exibição/compatibilidade
- Endereço opcional estruturado para BI: `cep`, `logradouro`, `numero`, `complemento`,
  `bairro`, `cidade`, `uf`, com preenchimento por ViaCEP quando possível
- Presença (check-in/out) com origem (play/diária/mensalista/colônia), ambientes e lotação
- Financeiro: lançamentos, baixa manual com modalidade + desconto, export CSV, avulsos
- Webhook InfinitePay atrás de flag `conciliacao_automatica` (default off)

### Play (o coração da operação)
- **Preço:** valor/hora por planilha (dia da semana × hora) em `/grade` + feriados com valor
  próprio em `/calendario` (sugere feriados nacionais) · **piso de 1h + proporcional**
  (ex.: 20/h → 40min = R$20 · 1h15 = R$25) — travado no check-in, calculado no check-out
- **Playground:** cronômetro ao vivo por criança, custo em tempo real, barra de tempo
  contratado, avisos rápidos (banheiro/trocar/chorando/buscar), modo quiosque p/ tablet
- **Aviso de tempo:** quando a presença tem `tempo_contratado_min`, o worker dispara uma
  notificação única antes do fim. A antecedência padrão é `aviso_antecedencia_min = 15`
  minutos e pode ser alterada em `config_sistema`
- **Busca de criança** (filtra digitando, sem acento) + botão **“+ Cadastrar criança”**
  que abre a ficha completa, permite foto por webcam/arquivo e volta pro play
- **Recebimento no check-out:** pop-up com Dinheiro / Pix / Débito / Crédito → baixa na
  hora, ou “deixar pendente” (caso “foi embora sem pagar” fica registrado no Financeiro)
- **Agradecimento no check-out:** ao encerrar uma sessão do play, envia mensagem editável
  de agradecimento ao responsável, com auditoria em `notificacao`

### Mensalistas / Colônia / Gestão
- Planos por frequência (2x, 3x/semana…), matrículas, reposição de dias, desconto por
  irmão automático (mesmo responsável/CPF), geração mensal idempotente (worker + botão)
- Colônias com vagas/valor, edição, inscrição gera lançamento (com desconto de irmão)
- Faturamento por operação/mês · Gerencial (admin) · RBAC admin/operador · Colaboradores
- `/mensagens`: textos dos avisos editáveis + status de aprovação; hoje funciona como
  catálogo dos textos enviados pela Evolution API
- Templates revisados para tom mais amigável. As variáveis usam nomes padronizados em
  `mensagem_variavel`, como `{{responsavel_nome}}` e `{{crianca_nome}}`
- Avisos rápidos do play são editáveis, ordenáveis e limitados a 6 ativos na tela; é possível
  criar avisos extras como inativos e substituir depois
- Ajuda contextual: botão “?” em toda tela explica o que ela faz (textos em `src/lib/ajuda.ts`)

### Qualidade
- 101 testes unitários cobrindo tarifador, grade, feriados, irmãos, aviso-tempo (incl. retry),
  adapters WhatsApp, renderização de mensagens, playground/checkout (incl. saída manual),
  recebimentos, endereço/ViaCEP e máscaras
- CI no GitHub Actions: lint + typecheck + testes unitários em cada push/PR
- Testes de integração existem contra Supabase local, mas exigem Supabase/Docker rodando.
  Ver [OPERACAO.md](OPERACAO.md) para a sequência segura
- Máscaras de digitação: CPF (`054.593.509-13`) e telefone (`(43) 99120-3404`); servidor
  normaliza telefone p/ E.164 e recusa número sem DDD

---

## Deploy em produção (2026-07-04)

1. Supabase cloud criado (região East US — casa com a Vercel free, também US)
2. `supabase db push` inicial (19 migrations) + **bootstrap virou migration idempotente**
   (config, grade, templates — `db push` deixa a base pronta sozinho)
3. Admin criado; RLS verificada; extensões `pg_cron`/`pg_net` + 2 jobs agendados
4. Vercel conectada ao GitHub; envs; domínio `quintal-brincante-erp.vercel.app`
5. Verificação ponta a ponta: login, worker 401 sem secret / 200 com secret

Desde então, as migrations evoluíram para nomes/endereço estruturados, templates revisados,
integração ViaCEP e reforço dos testes.

## Consertos importantes pós-deploy (aprendizados)

| Bug | Causa | Lição |
|---|---|---|
| “Não funciona nada” no play (check-in/cadastro travando) | `financeiro/actions.ts` (`'use server'`) exportava `const MODALIDADES` — arquivo *use server* só pode exportar função async; TODAS as actions de qualquer rota que importa o módulo quebravam com 500 | **Testar clicando na tela** (Playwright) — testes só de backend não pegaram; a mensagem real só aparece no dev local |
| Modal de ajuda abria no topo | `backdrop-blur` do header vira *containing block* p/ `position:fixed` | Modais via `createPortal(document.body)` (componente `modal.tsx`) |
| Webcam “retângulo preto gigante” | vídeo esticado + attach do stream por `setTimeout` | preview compacto + attach via `useEffect` + botão só habilita com vídeo rodando |
| Botões presos em “Salvando…” | handlers sem try/catch/finally | todo handler de action com try/catch/finally e erro visível |

## WhatsApp — Evolution API (2026-07-05 → validado em 2026-07-09)

- **Decisão do dono:** API não-oficial (Evolution/Baileys), sem burocracia Meta.
  `EvolutionSender` no adapter (`WHATSAPP_PROVIDER=evolution`); `CloudSender` Meta oficial
  continua implementado em stand-by (voltar = trocar envs)
- Servidor no **Railway** (template Evolution API + Redis + Postgres):
  `https://evolution-api-production-3357.up.railway.app`, instância `quintal`
- **Pegadinha resolvida:** QR dava “não foi possível conectar o dispositivo” → env
  `CONFIG_SESSION_PHONE_VERSION` no Railway com a versão atual do WhatsApp Web
  (fonte: `wppconnect-team/wa-version` no GitHub)
- Mensagens de teste **chegaram** (acentos/emojis ok — enviar via Node/fetch; curl no
  terminal Windows pode corromper UTF-8)
- Aviso real de tempo do play **chegou no WhatsApp** em 2026-07-09. A auditoria segue na
  tabela `notificacao`, com status, conteúdo renderizado, provider e datas
- **Privacidade:** conectar um chip sincroniza contatos/conversas pro banco do Evolution;
  “Disconnect” NÃO apaga — **deletar a instância** apaga. Chip dedicado deve ter agenda mínima

## Blindagem de concorrência e resiliência (2026-07-10)

Rodada de correções vinda de auditoria do código (corridas e falhas silenciosas):

- **Cobrança em dobro impossível:** índice único em `lancamento (origem_tipo, origem_id,
  vencimento)` + o check-out só gera lançamento se foi ELE que fechou a presença (update
  condicional com select). Dois aparelhos clicando juntos: o segundo recebe "já teve check-out".
- **Check-out esquecido não some mais:** banner em `/presenca` e `/playground` lista presenças
  abertas de dias anteriores (antes ficavam invisíveis para sempre); a equipe informa a hora
  real da saída e a cobrança vai pro Financeiro — sem mandar agradecimento atrasado.
- **Aviso de tempo com retry:** envio que falhou é retentado pelo worker (até 3 tentativas,
  coluna `notificacao.tentativas`), reaproveitando a mesma linha; índice único garante no
  máx. 1 aviso por presença mesmo com execuções sobrepostas.
- **Webhook InfinitePay fail-closed:** sem `INFINITEPAY_WEBHOOK_SECRET` responde 503 e não
  processa (antes, sem a env, aceitava qualquer chamada).
- **Produção sem provider explícito quebra alto:** `WHATSAPP_PROVIDER` ausente em produção
  agora lança erro em vez de cair no fake e marcar notificação como "enviada" sem enviar nada.
- **CI:** GitHub Actions roda lint + typecheck + testes a cada push (script `npm run typecheck`).
- Migration `20260710090000_unicidade_lancamento_retry_aviso` aplicada em produção no mesmo dia.

## Autorização de imagem + boas-vindas Vila Verde (2026-07-10)

- **Novo texto de boas-vindas** (combinados do Play Vila Verde / Equipe Vilarejo Londrina),
  aplicado por migration e editável em `/mensagens`.
- **Autorização de uso de imagem**: a pergunta virou template próprio (`autorizacao_imagem`),
  enviado em **todo check-in do play enquanto o cadastro não tem resposta** (quem respondeu
  SIM ou NÃO não é perguntado de novo). Botão interativo não é
  confiável na Evolution/Baileys → resposta por texto **SIM/NÃO**, registrada pela equipe.
- **Onde aparece:** ficha da criança (seção Autorizou/Negou + selos "📸 imagem pendente" /
  "📸 imagem NÃO autorizada") e card do playground/quiosque (chip 📸 ok / pendente / não usar).
- **Fluxo de boas-vindas:** enviado em toda nova entrada no play, inclusive quando a criança
  entra novamente no mesmo dia. Cada disparo fica vinculado à nova presença.
- Futuro (Central de Conversas): a resposta SIM/NÃO poderá ser capturada automaticamente
  pelo webhook e o registro manual vira só conferência.

## Central de Conversas WhatsApp (2026-07-10)

O ERP virou ponto central de atendimento: a equipe vê e responde mensagens dos responsáveis
sem abrir WhatsApp Web. A Evolution é só gateway; TODO o histórico vive no Supabase.

- **Banco:** `whatsapp_conversa` (1 por telefone, dona = contato/responsável; `contato_id`
  null = número não identificado — mensagem nunca se perde) e `whatsapp_mensagem` (vínculo
  opcional com criança/presença). Última mensagem e não lidas atualizadas por **trigger**
  (atômico). Dedupe por índice único de `provider_msg_id`. RLS Tier A. Realtime habilitado.
- **Webhook** `POST /api/webhooks/evolution?secret=...` (`MESSAGES_UPSERT`): grava recebidas
  E enviadas pelo chip (fromMe); fail-closed sem `EVOLUTION_WEBHOOK_SECRET`. Trata o **pulo
  do nono dígito** (JID sem o 9 casa com o cadastro com 9 — `src/lib/whatsapp/jid.ts`, puro
  e testado). Config da instância documentada no [WHATSAPP-EVOLUTION.md](WHATSAPP-EVOLUTION.md).
- **Dual-write:** toda notificação do sistema (boas-vindas, aviso de tempo, agradecimento,
  autorização) também entra na conversa — a equipe vê a pergunta E a resposta.
- **/conversas:** caixa de entrada geral (estilo WhatsApp Business) + chat com bolhas,
  horário, separador de dia, envio pela equipe (auditado em `enviado_por`) e **tempo real**
  (Supabase Realtime, sem polling). Não lidas zeram ao abrir.
- **Playground/quiosque:** botão **💬 WhatsApp** no card (badge vermelho com não lidas ao
  vivo) abre a conversa do responsável carimbando `?crianca=&presenca=` — mensagens de lá
  ficam vinculadas à permanência.
- Pendente de config p/ ligar em produção: env `EVOLUTION_WEBHOOK_SECRET` na Vercel +
  webhook apontado na instância (runbook no WHATSAPP-EVOLUTION.md).
- **Autorização automática:** respostas isoladas `SIM`/`S` e `NÃO`/`NAO`/`N`
  (sem distinção de maiúsculas ou acentos) atualizam a ficha da criança da pergunta
  pendente mais recente daquele contato. Respostas livres não são inferidas.
- Futuro: status de entrega/leitura (`MESSAGES_UPDATE`), mídia.
- **Avisos globais de conversa:** sino no cabeçalho e badge no menu mostram o total de
  mensagens não lidas em tempo real. Em `Quem está aqui`, cada criança tem atalho para
  o chat do responsável, com badge próprio e vínculo à presença atual.
- **Colaboradores editáveis:** admin pode alterar nome, função e telefone de uma ficha
  existente; papel e status continuam nos controles dedicados.
- **Base PWA:** manifesto, modo standalone, service worker com headers seguros e fallback
  offline neutro. Dados autenticados não são armazenados no cache do navegador.
- **Instalação PWA:** ícones PNG 192/512 (arvorezinha verde em fundo grafite) e botão
  `Instalar app` no cabeçalho quando o navegador libera o prompt de instalação.
- Pendente: fila offline transacional para check-in/check-out, com idempotência no banco.
- **Excedente do Play em blocos:** tolerância inicial `0` (continua configurável); após
  o tempo contratado, cada bloco iniciado de 30 min acrescenta 50% da tarifa/hora.
  Assim, até 30 min excedentes = meia hora; de 31 a 60 min = hora adicional cheia.
- **Recebimento com ajuste:** o valor pode ser editado no modal antes de escolher a forma
  de pagamento; o lançamento é atualizado com o valor efetivamente recebido antes da baixa.
- **Limite do play + fila de espera (2026-07-13):** teto de crianças simultâneas no play em
  `config_sistema.capacidade_play` (definido em 20 após o primeiro dia operacional; editável).
  Lotou → check-in bloqueia e a criança entra na `fila_espera`; quando abre vaga o sistema
  chama a próxima e avisa o responsável (template `fila_sua_vez`); não chegou em
  `fila_tolerancia_min` (padrão 10) → expira e chama a seguinte. Chamado tem vaga reservada
  (conta na lotação). Processa no check-out (na hora) e no worker `POST /api/worker/fila`
  (pg_cron a cada 2 min — **job novo, agendar em produção**; runbook no DEPLOY.md). A tela do
  play mostra lotação (X/20), previsão da próxima vaga (menor tempo contratado restante) e a
  fila com prazos. Encerramento de check-out esquecido agora aceita valor manual (em branco =
  cálculo automático).
- **Fix instalação PWA:** o middleware de auth redirecionava `/manifest.webmanifest`,
  `/sw.js` e `/offline` para `/login` (o navegador busca o manifest sem cookies), então o
  Chrome não oferecia "Instalar app". Corrigido excluindo esses caminhos do matcher.
- **Passada de UX (2026-07-13, pedido do dono do projeto):** compactar e organizar mantendo
  cores/ícones. Play: lotação vira chip no título, banner de esquecidos colapsa em 1 linha
  (com valor manual), entrada única com `Entrar`/`+ Fila`, fila em pills, cards ~40% menores
  (avisos rápidos atrás do ⚡). Início: tiles horizontais agrupados por seção. Configurações:
  cards agrupados em seções (Espaço e play / Avisos WhatsApp / Financeiro). Crianças: linhas
  densas de 1 linha. Financeiro: filtros numa linha; contagem + avulso + CSV na mesma barra.
  Próxima leva sugerida: /mensagens (colapsar templates em linhas, editar ao expandir).
- **2ª passada de UX (2026-07-13, com jornada simulada de operador via Playwright):**
  /mensagens: templates viram linhas colapsadas (nome + preview + status; expande p/ editar).
  Ficha nova criança: essenciais visíveis (nome, nascimento, saúde, foto, responsável+WhatsApp);
  endereços/documentos em `<details>` colapsados — 25→8 campos visíveis, salvar sem rolagem.
  Financeiro: busca instantânea por criança acima dos lançamentos. Fila de espera virou
  "filinha": avatares em pé na linha pontilhada, posição no ombro, 🔔+prazo p/ chamada.
  Cards do play: 4 colunas em telas largas; botão vira só "Check-out" (valor já está no card).
- **3ª passada de UX (2026-07-13):** recebimento UNIFICADO — o Financeiro abre o mesmo modal
  do play (valor editável + desconto quando a flag está ligada + maquininha); `BaixaButton`
  removido; o play também ganhou desconto no modal. Ficha da criança: contatos sobem pro topo
  (telefone do responsável é o mais consultado), edição colapsada em `<details>`, saúde vira
  selo vermelho nos badges. Conversas: avatar com foto da criança, "🧒 nome(s)" na linha e
  não lidas com fundo destacado. Gerencial: KPIs viram links (A receber → financeiro
  filtrado, etc.); atalhos redundantes do rodapé removidos.

## Fila de próximos passos

1. Sinal de vida dos workers: alerta se `aviso-tempo` ou `mensalidades` parar/falhar
2. Botão **“💬 Cobrar”** nos lançamentos pendentes (texto editável, com nome/valor)
3. Backup: confirmar retenção do plano Supabase e decidir se precisa dump adicional
4. InfinitePay real (HMAC + checkout) atrás da flag
5. Testes ponta a ponta dos fluxos críticos: check-in → checkout → baixa → mensagem
6. Supabase Pro / Vercel Pro quando o uso firmar (free pausa por inatividade / termo não-comercial)

## Regras de trabalho que valem ouro aqui

- Validar fluxo **clicando na tela** (Playwright é devDependency), não só via API/banco
- Arquivo `'use server'`: **só** exporta função async (`export type` ok; `const` quebra tudo)
- Depois de deploy, aba aberta fica “velha” → hard refresh; considerar Skew Protection na Vercel
- Dinheiro em `numeric`, telefone E.164, segredos só em env, RLS sempre
