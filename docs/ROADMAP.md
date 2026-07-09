# Estado & Evolução — Quintal Brincante ERP

Doc vivo. Avaliação honesta do sistema + plano de evolução priorizado.
Atualizado em **2026-07-09**. Marque `[x]` conforme concluir.

> Contexto: o sistema entrou em produção em 2026-07-04 (Vercel + Supabase) e a equipe
> começou a testar. Detalhes de infra em [DEPLOY.md](DEPLOY.md), operação em
> [OPERACAO.md](OPERACAO.md) e WhatsApp atual em [WHATSAPP-EVOLUTION.md](WHATSAPP-EVOLUTION.md).

---

## 1. Estado atual

**MVP no ar e funcionando.** Login, RLS, presença/play, financeiro, mensalistas, colônia,
RBAC, workers agendados e WhatsApp operacional via Evolution estão rodando em produção.
Está no ponto **"MVP em uso assistido"**, não ainda **"produto redondo"** — a diferença está
no plano abaixo.

Ligado hoje:
- Cadastro de crianças (contatos, saúde, consentimento LGPD)
- Nome/sobrenome separados para criança e responsável, preservando o nome de exibição
- Endereço estruturado opcional para BI, com CEP e autopreenchimento por ViaCEP
- Presença (check-in/out) + tarifador do play (piso 1h + proporcional)
- Aviso de tempo e agradecimento de check-out via WhatsApp/Evolution
- Financeiro (baixa manual, descontos, export CSV) + Faturamento
- Mensalistas + planos + reposição de dias · Colônia
- RBAC (admin/operador) · Ambientes · Configurações
- Workers `pg_cron` (aviso de tempo a cada 5 min, mensalidades dia 1)

Ainda **não** ligado de verdade:
- **InfinitePay** — conciliação automática atrás de flag (`conciliacao_automatica=false`).
- **Sinal de vida dos workers** — jobs rodam, mas ainda não alertam o admin se ficarem mudos.
- **Testes ponta a ponta das telas** — há testes unitários robustos, mas E2E ainda é próximo passo.

---

## 2. Fundação sólida (por que está acima da média)

Estas decisões são o que separa uma ferramenta de um protótipo — e já estão feitas:

- **RLS em todas as tabelas.** Dado de criança é sensível; anônimo enxerga zero (testado).
- **Regra de negócio em tabela de config, não no código.** Preços, descontos, capacidade e
  antecedência são editáveis pela equipe, sem mexer em código.
- **Dados preparados para BI sem travar a operação.** Nome/sobrenome e endereço estruturado
  são opcionais, então melhoram análise futura sem impedir cadastro rápido no balcão.
- **Mensagens configuráveis com variáveis padronizadas.** Templates editáveis usam catálogo
  comum de variáveis, e avisos rápidos do play têm até 6 ativos por vez.
- **Lógica crítica com teste puro.** Tarifador, feriados, desconto de irmão, playground,
  recebimentos, mensagens e endereço têm testes — mudanças futuras avisam se quebrarem algo.
- **Boas práticas de dados.** Dinheiro em `numeric`, telefone E.164, migrations idempotentes,
  segredos só em variáveis de ambiente.

---

## 3. Limitações honestas (o que ainda não é)

Nada aqui é "defeito" — é o mapa do que falta pra virar produto maduro:

1. **É um MVP interno.** Construído rápido; vão aparecer bugs quando a equipe usar de verdade.
   Normal — é assim que amadurece. Colher feedback do teste é a prioridade agora.
2. **O aviso de tempo depende da Evolution conectada.** O fluxo real foi validado, mas a
   confiabilidade operacional depende da instância e do chip permanecerem saudáveis.
3. **Backup não está definido.** Hoje dependemos do que o plano do Supabase oferece por padrão.
4. **Sem "sinal de vida" dos workers.** Se um agendamento parar, ninguém é avisado (falha calada).
5. **Sem trilha de auditoria completa.** Sabemos das notificações; não de "quem alterou o quê".
6. **Cobertura E2E ainda falta.** Há 89 testes unitários, mas os fluxos de tela ainda precisam
   de testes ponta a ponta.
7. **Dependência de dev.** Sob medida = exatamente o que você quer, sem taxa por aluno; o preço
   é depender de alguém que mexa no código pra mudanças grandes.

---

## 4. Plano de evolução (priorizado)

### P1 — Provar o valor e proteger contra dor silenciosa
- [x] **Validar o WhatsApp do chip dedicado/Evolution.** Aceite cumprido: aviso de tempo real
      chegou no celular em 2026-07-09.
- [ ] **Sinal de vida dos workers.** Um aviso (e-mail/WhatsApp p/ admin) se um worker falhar ou
      ficar X horas sem rodar. *Aceite:* derrubar o worker de propósito gera alerta.
- [ ] **Backup.** Confirmar retenção do plano e, se preciso, um dump agendado extra. *Aceite:*
      existe cópia recuperável de ontem.
- [ ] **Coletar feedback do teste da equipe** e corrigir os bugs que aparecerem.
- [ ] **Cobrança por WhatsApp.** Botão “Cobrar” nos lançamentos pendentes, usando template
      editável com nome, valor e referência.

### P2 — Robustez e confiança
- [ ] Trilha de auditoria (quem deu baixa, quem editou preço/ficha).
- [ ] Testes ponta a ponta dos fluxos críticos (check-in→out→baixa→mensagem).
- [ ] Revisão de LGPD além do consentimento: política de retenção e exclusão a pedido.
- [ ] Página de "saúde do sistema" simples pro admin (últimas execuções dos workers).
- [ ] Melhorar relatórios/BI usando os novos campos estruturados de nome e endereço.

### P3 — Depois que o núcleo estiver redondo
- [ ] WhatsApp de **produção** robusto: manter chip dedicado estável no Evolution ou migrar para
      Meta Cloud API se a operação pedir mais garantia.
- [ ] InfinitePay real (assinatura HMAC + link de checkout), ligar `conciliacao_automatica`.
- [ ] Marketing/captação (Fase 3 da spec) — número separado, opt-in obrigatório.

---

## 5. Planos pagos (provável próximo passo)

O free serve pra começar, mas tem pegadinhas reais pra um negócio que cobra:

| | Free | Pago (recomendado quando "pra valer") |
|---|---|---|
| **Supabase** | projeto **pausa** após inatividade; backup curto | **Pro (~US$25/mês)**: sem pausar, backup diário (retenção ~7 dias), PITR opcional, mais recursos |
| **Vercel** | Hobby é, no termo, **não-comercial**; limites de banda/build | **Pro (~US$20/mês/membro)**: uso comercial ok, mais banda e build |

Ordem de grandeza ~US$45/mês (confirme os preços atuais no site de cada um). Vale a pena assim
que o teste virar uso real — some a tranquilidade de backup + não pausar + estar dentro do termo.

**Ao migrar pra pago:** nada de código muda. No Supabase Pro, ative os backups automáticos e
(se quiser) PITR; no Vercel Pro, nada além do upgrade. Anote a mudança no [DEPLOY.md](DEPLOY.md).

---

## 6. Como usar este doc

É um mapa, não um contrato. A cada rodada de evolução: marque o que saiu, ajuste prioridades
com o que o teste da equipe mostrar, e mantenha o "Estado atual" honesto. O que a equipe **usa**
manda mais que o que está planejado aqui.
