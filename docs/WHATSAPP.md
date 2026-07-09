# WhatsApp Business Platform (Meta oficial)

Guia para migrar do provider atual **Evolution API** para a API oficial da Meta
(`WHATSAPP_PROVIDER=cloud`).

Hoje, produção usa Evolution. O `CloudSender` oficial já está implementado em
`src/lib/whatsapp/adapter.ts`; a migração depende principalmente de configuração na Meta,
templates aprovados e teste real.

**Regra do projeto:** o número dos avisos operacionais é missão crítica e nunca deve ser usado
para marketing. Marketing, se existir no futuro, usa outro número e opt-in separado.

---

## O que já está pronto no código

- Provider `cloud` no adapter de WhatsApp.
- Envio para `https://graph.facebook.com/{version}/{PHONE_ID}/messages`.
- Templates com variáveis posicionais para a Meta e texto renderizado para auditoria.
- Auditoria em `notificacao`, independente do provider.
- Helpers de renderização para:
  - `boas_vindas`
  - `aviso_tempo`
  - `ocorrencia`
  - `agradecimento_checkout`

Para ativar, as envs mudam para:

```env
WHATSAPP_PROVIDER=cloud
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_ID=...
WHATSAPP_LANG=pt_BR
```

---

## O que precisa na Meta

1. **Portfólio empresarial**
   - Criar ou usar um Business Portfolio no Meta Business.
   - Fazer verificação da empresa se a operação precisar de limites maiores e produção estável.

2. **App de desenvolvedor**
   - Criar app tipo Business no Meta Developers.
   - Adicionar o produto WhatsApp.
   - Associar/criar uma WhatsApp Business Account (WABA).

3. **Número oficial**
   - Usar número dedicado.
   - O número não pode estar ativo no WhatsApp comum ao mesmo tempo.
   - Anotar o **Phone Number ID** para `WHATSAPP_PHONE_ID`.

4. **Token permanente**
   - Criar System User no Business Manager.
   - Gerar token com permissões de WhatsApp.
   - Guardar como `WHATSAPP_TOKEN`.

5. **Forma de pagamento**
   - Configurar billing no WhatsApp Manager.
   - Os avisos do Quintal entram como mensagens operacionais/utility.

---

## Templates oficiais

Na Evolution, a gente envia texto livre renderizado. Na Meta oficial, mensagens iniciadas pelo
sistema precisam usar templates aprovados.

Crie no WhatsApp Manager templates com estes nomes, porque são os nomes usados no código:

| Template | Uso | Variáveis |
|---|---|---|
| `boas_vindas` | Entrada no play com combinados | `{{1}}` responsável, `{{2}}` criança |
| `aviso_tempo` | Tempo contratado chegando ao fim | `{{1}}` responsável, `{{2}}` criança, `{{3}}` minutos |
| `ocorrencia` | Avisos rápidos e ocorrências | `{{1}}` responsável, `{{2}}` criança, `{{3}}` detalhe |
| `agradecimento_checkout` | Agradecimento ao sair do play | `{{1}}` responsável, `{{2}}` criança |

Na tela `/mensagens`, a equipe edita usando variáveis nomeadas, como
`{{responsavel_nome}}`, `{{crianca_nome}}`, `{{minutos_restantes}}` e `{{detalhe}}`.
O código também mantém o array posicional necessário para a Meta.

Ao alterar um texto que será usado na Meta oficial, mantenha a mesma quantidade e ordem de
variáveis do template aprovado, ou aprove uma nova versão na Meta.

---

## Checklist de migração

1. Criar/configurar WABA e número oficial.
2. Criar token permanente e `WHATSAPP_PHONE_ID`.
3. Aprovar os templates acima em `pt_BR`.
4. Marcar status dos templates em `/mensagens`.
5. Alterar envs na Vercel para `WHATSAPP_PROVIDER=cloud`.
6. Redeploy.
7. Testar uma mensagem de cada tipo com responsável de teste.
8. Conferir `notificacao.status`, `provider_msg_id` e `enviada_em`.

---

## Custos e trade-off

- Meta oficial reduz risco de bloqueio por uso não-oficial.
- Exige templates aprovados e maior cuidado ao editar textos.
- Há cobrança da WhatsApp Business Platform conforme regras vigentes da Meta.
- Continua sendo recomendado manter número operacional separado de marketing.
