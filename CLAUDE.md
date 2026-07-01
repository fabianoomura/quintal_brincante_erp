# CLAUDE.md — Quintal Brincante

Arquivo de orientação para o Claude Code. Leia isto primeiro, sempre.
A **fonte de verdade do schema e das regras** é `docs/quintal-brincante-mvp.md`.
Este arquivo é o resumo operacional + plano de trabalho.

---

## O que é

Sistema interno de gestão de um quintal brincante (espaço de recreação infantil),
usado **apenas pela equipe**. Cuida de cadastro de crianças, presença (check-in/out),
cobrança do play por tempo, financeiro e avisos no WhatsApp. Sem cobrança pelo sistema;
o objetivo é organização e aprendizado. Mobile-first: a equipe usa no celular/tablet.

---

## Como trabalhar aqui (princípios)

- **Pense antes de codar.** Declare suposições. Se houver interpretações possíveis,
  apresente-as — não escolha em silêncio. Se algo está ambíguo, pergunte.
- **Simplicidade primeiro.** O mínimo de código que resolve. Nada especulativo:
  sem abstração para uso único, sem "flexibilidade" não pedida, sem tratar caso impossível.
- **Mudanças cirúrgicas.** Toque só no necessário. Não refatore o que não está quebrado,
  não "melhore" código adjacente. Remova só os órfãos que SUAS mudanças criaram.
- **Orientado a meta.** Toda tarefa tem critério de aceite verificável (ver plano abaixo).
  "Adicionar X" vira "escrever o teste de X e fazer passar". Faça loop até verde.
- **Não hardcode regra de negócio.** Valores de tarifa, flags, limites vivem em tabela
  de config — nunca no código.

---

## Stack

- **Frontend:** Next.js (App Router), PWA, mobile-first.
- **Banco + Auth:** Supabase (Postgres + Auth + RLS).
- **Integrações:** WhatsApp Business API (oficial); InfinitePay (Checkout + webhook).
- **Worker agendado (aviso de tempo):** **DECIDIDO (2026-06-30) — Supabase (`pg_cron` chamando
  um endpoint do worker).** Motivo: zero-ops, sem herdar uptime de VPS. Arquitetura escolhida p/
  ficar testável e portável: a **lógica** vive em `src/lib/whatsapp/avisoTempo.ts` (função pura,
  com testes); um **endpoint** `POST /api/worker/aviso-tempo` (guardado por `CRON_SECRET`) roda a
  varredura usando service role; o `pg_cron` chama esse endpoint a cada poucos minutos. Se um dia
  precisar sair do Supabase, só o disparo muda — a lógica não.

---

## Regras do projeto (não-negociáveis)

1. **Dados de criança = LGPD reforçada.** Coleta mínima; consentimento do responsável
   registrado; acesso restrito. RLS habilitada em TODAS as tabelas. No MVP, autenticado =
   equipe; anônimo não vê nada (request sem JWT → 0 linhas).
2. **WhatsApp: dois números.** O número dos alertas operacionais (utility) é missão crítica e
   **nunca** compartilha com marketing — um ban de marketing não pode derrubar o aviso de criança.
3. **InfinitePay — maquininha física NÃO integra.** Não existe TEF/SDK para o sistema comandar
   a InfiniteSmart. Conciliação é **manual** (baixa na mão) ou **automática via Checkout/webhook**,
   esta atrás de `config_sistema.conciliacao_automatica` (default `false`). Não tente integrar a
   maquininha física.
4. **Play por PERÍODO (grade), não por hora.** Decisão do dono (2026-07-01): o play tem
   **valor fixo por período**, variando por dia da semana + janela de horário (almoço/jantar) —
   ex.: 2ª–4ª R$8, 5ª–6ª R$15, sáb/dom R$20. Tabela `grade_play` (dias + horário + valor +
   capacidade opcional), gerida em `/grade`. O valor é fixado no **check-in** pela hora de
   entrada (`encontrarSlot`, função pura + testes); capacidade limita vagas do período. O
   antigo tarifador "estacionamento" (`calcularValorPlay`) foi **substituído** para o play.
5. **Dinheiro:** `numeric`, nunca `float`. **Telefone:** E.164 (`+55DDDNUMERO`).
6. **Segredos** (chaves Supabase, token WhatsApp, credencial InfinitePay) só em variáveis de
   ambiente. Nunca commitados.

---

## Valores de config pendentes (preencher, não inventar)

Vivem em `tarifa` / `config_sistema` (ver spec §5.4). Enquanto o dono não confirmar, deixe-os
como variáveis de config com TODO — não chute número no código nem nos testes (use fixtures):

- `valor_hora`, `tamanho_fracao_min`, `valor_fracao`, `aviso_antecedencia_min`
- Regra da 1ª hora (preço único vs. primeira hora diferente)

---

## Plano de construção

O núcleo (1a/1b) sai primeiro; alertas e modo automático vêm depois. Cada tarefa só está
"pronta" quando o critério de aceite passa.

### Etapa 1a — Coluna vertebral

1. **Migrations:** enums + tabelas + índices da spec §5.
   *Aceite:* `supabase db reset` roda limpo do zero.
2. **RLS** em todas as tabelas (equipe-only).
   *Aceite:* request anônimo retorna 0 linhas; autenticado lê/escreve.
3. **Cadastro** de criança + contatos (responsável/autorizado/emergência) + saúde.
   *Aceite:* criar, editar e buscar uma ficha completa em ≤2 toques no mobile.
4. **Presença** + tela "quem está aqui hoje".
   *Aceite:* registrar entrada e saída; lista de hoje sai de `presenca` (data=hoje, `saida is null`).

### Etapa 1b — Play + financeiro

5. **Tarifador do play** (função pura + testes).
   *Aceite:* tabela de exemplos da spec §6 passa (0h20 → 1h; 1h10 → 1h+fração; 2h05 → 2h+fração).
6. **Financeiro:** `lancamento` + baixa manual (`conciliado_por='manual'`, `pago_em`).
   *Aceite:* marcar um lançamento pendente como pago.
7. **Exportação de conciliação** (`.csv` primeiro; `.xlsx` só se pedirem).
   *Aceite:* baixar planilha de um período com as colunas da spec §8.

### Etapa 1c — WhatsApp + worker

8. **Decidir stack do worker** (ver seção Stack). *Aceite:* decisão registrada neste arquivo.
9. **Adapter de envio WhatsApp** + templates utility aprovados na Meta.
   *Aceite:* enviar 1 mensagem de teste por template aprovado.
10. **Worker do aviso de tempo** (agendado).
    *Aceite:* presença de play com `tempo_contratado_min` gera **exatamente uma** notificação
    ao cruzar o limite menos a antecedência (testar idempotência).
11. **Ocorrência → notificação** (disparada pela equipe: não se adaptou, banheiro, etc.).
    *Aceite:* registrar ocorrência cria notificação ao responsável correto.

### Etapa 1d — Modo automático de pagamento (atrás de flag)

12. **Webhook InfinitePay** vira o `lancamento` para pago (`conciliado_por='webhook'`).
    *Aceite:* com `conciliacao_automatica=false` o webhook é ignorado; com `true` ele concilia —
    alternar sem mexer em código.

### Fases 2+ (não começar sem o núcleo no ar)

- **2:** recorrência de turma; colônia de férias completa.
- **3:** captação/marketing (módulo separado — ver spec, Anexo A). Opt-in obrigatório; número
  separado; sistema só segmenta, envio via plataforma ou API oficial.

---

## Definição de "pronto" (global)

- Testes da etapa passam.
- RLS testada (anônimo = 0 linhas).
- Migrations idempotentes (`db reset` limpo).
- Sem segredos no repositório.
- Diff contém só o que a tarefa pedia (mudança cirúrgica).

---

## Setup (preencher ao iniciar o repo)

```bash
# Banco local
supabase start
supabase db reset

# Frontend
npm install
npm run dev
```

Variáveis de ambiente esperadas (`.env.local`, fora do git):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `INFINITEPAY_*` (quando chegar em 1c/1d).

---

## Layout sugerido do repositório

```
/CLAUDE.md                      (este arquivo)
/docs/quintal-brincante-mvp.md  (spec — fonte de verdade do schema)
/supabase/migrations/           (SQL)
/app/                           (Next.js App Router)
/lib/                           (tarifador, adapter WhatsApp, helpers)
/tests/                         (testes; tarifador é prioridade)
```
