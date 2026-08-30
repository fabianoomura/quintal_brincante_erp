// Templates WhatsApp (utility).
// A renderizacao produz texto final para auditoria/Evolution e tambem o array posicional
// que a Cloud API da Meta usa quando o provider oficial estiver ativo.

export type TemplateRender = {
  template: string
  variaveis: string[]
  conteudo: string
}

export type VariaveisMensagem = Record<string, string | number | null | undefined>

const TEXTO_AVISO_TEMPO =
  'Olá {{responsavel_nome}}, o tempo de {{crianca_nome}} no play está chegando ao fim. Faltam {{minutos_restantes}} min. Pode vir se aproximando, por favor?'
const TEXTO_OCORRENCIA = 'Olá {{responsavel_nome}}, sobre {{crianca_nome}}: {{detalhe}}'
const TEXTO_BOAS_VINDAS = `💚 Boas-vindas ao nosso Play Vila Verde!

Olá, {{responsavel_nome}}! 🌿
Que alegria receber {{crianca_nome}} por aqui!

📲 A partir de agora, estamos conectados por este WhatsApp.

Esse é um dos nossos principais protocolos de cuidado e segurança: sempre que {{crianca_nome}} precisar de você — para ir ao banheiro, se alimentar, pedir colo ou por qualquer outra necessidade — nossa equipe entrará em contato por este número.

Pode ficar tranquilo e aproveitar seu tempo por aqui. Se sua criança precisar de você, nós vamos chamar. Só mantenha o celular por perto. 💚

💵 VALORES — por hora
Segunda, terça e quarta — R$ 15/h
Quinta, sexta, sábado e domingo — R$ 25/h

⏱️ O tempo é contínuo e não pode ser pausado.
A criança pode sair e retornar ao Play sempre que precisar, mas a contagem segue normalmente. Em caso de não adaptação, a primeira hora é contabilizada integralmente.`
const TEXTO_BOAS_VINDAS_PARTE_2 = `🌿 Antes da brincadeira começar, alguns combinados importantes de cuidado e segurança:

🪟 O Play é território das crianças.
Nosso espaço foi pensado para elas e, por segurança, somente nossa equipe permanece dentro do Play. Os adultos responsáveis podem ficar pertinho, nas mesas próximas ao vidro.

🚻 Precisou ir ao banheiro?
Para a segurança das crianças e também da nossa equipe, não acompanhamos crianças ao banheiro. Chamaremos por este WhatsApp para que o responsável venha buscar {{crianca_nome}} na recepção e, depois, a traga de volta.

🍎 Comidas e bebidas ficam do lado de fora.
Você pode retirar {{crianca_nome}} para se alimentar e trazê-la de volta normalmente.

🤝 Cuidado também é a forma como nos tratamos.
Respeito e cordialidade com nossos colaboradores são indispensáveis. Não serão toleradas ofensas, ameaças ou qualquer forma de desrespeito à nossa equipe.

💚 Com os combinados feitos, que comece a brincadeira!

Equipe Vilarejo Londrina 🌿`
// Botão interativo não é confiável na Evolution/Baileys → resposta por texto SIM/NÃO.
const TEXTO_AUTORIZACAO_IMAGEM = `📸 Só mais uma coisinha, {{responsavel_nome}}: você autoriza o uso da imagem de {{crianca_nome}} nos registros do Vilarejo?

Responda *SIM* ou *NÃO* por aqui mesmo, por favor. 💚`
const TEXTO_AGRADECIMENTO_CHECKOUT =
  'Obrigado pela visita, {{responsavel_nome}}! {{crianca_nome}} já saiu do play. Até a próxima! 💚'
const TEXTO_DESCULPA_ENGANO =
  'Ops, {{responsavel_nome}}! Foi engano nosso: {{crianca_nome}} continua aqui no play. 🙈 Pode desconsiderar a mensagem de saída. Desculpe pelo susto! 💚'
const TEXTO_FILA_SUA_VEZ =
  '🎉 Boa notícia, {{responsavel_nome}}! Chegou a vez de {{crianca_nome}} no play. Vocês têm {{minutos_tolerancia}} min para chegar — depois disso a vaga passa para a próxima criança da fila. Até já! 💚'

export function nomePessoaMensagem(
  nome: string | null | undefined,
  primeiroNome?: string | null,
): string {
  const preferido = primeiroNome?.trim()
  if (preferido) return preferido

  const nomeLimpo = nome?.trim() ?? ''
  return nomeLimpo.split(/\s+/)[0] ?? ''
}

export const nomeResponsavelMensagem = nomePessoaMensagem

export function renderizarTemplate(
  texto: string,
  variaveis: string[] = [],
  variaveisNomeadas: VariaveisMensagem = {},
): string {
  const comPosicionais = variaveis.reduce(
    (acc, valor, index) => acc.replaceAll(`{{${index + 1}}}`, valor),
    texto,
  )

  return Object.entries(variaveisNomeadas).reduce((acc, [chave, valor]) => {
    if (valor == null) return acc
    return acc.replaceAll(`{{${chave}}}`, String(valor))
  }, comPosicionais)
}

function nomesMensagem(
  responsavel: string,
  crianca: string,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
) {
  return {
    responsavel_nome: nomePessoaMensagem(responsavel, primeiroNomeResponsavel),
    crianca_nome: nomePessoaMensagem(crianca, primeiroNomeCrianca),
  }
}

export function tplAvisoTempo(
  responsavel: string,
  crianca: string,
  minutosRestantes: number,
  textoTemplate = TEXTO_AVISO_TEMPO,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const ctx = {
    ...nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca),
    minutos_restantes: String(minutosRestantes),
  }
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome, ctx.minutos_restantes]
  return {
    template: 'aviso_tempo',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}

export function tplOcorrencia(
  responsavel: string,
  crianca: string,
  detalhe: string,
  textoTemplate = TEXTO_OCORRENCIA,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const nomes = nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca)
  const detalheRenderizado = renderizarTemplate(detalhe, [], nomes)
  const ctx = { ...nomes, detalhe: detalheRenderizado }
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome, ctx.detalhe]
  return {
    template: 'ocorrencia',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}

export function tplBoasVindas(
  responsavel: string,
  crianca: string,
  textoTemplate = TEXTO_BOAS_VINDAS,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const ctx = nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca)
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome]
  return {
    template: 'boas_vindas',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}

export function tplBoasVindasParte2(
  responsavel: string,
  crianca: string,
  textoTemplate = TEXTO_BOAS_VINDAS_PARTE_2,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const ctx = nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca)
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome]
  return {
    template: 'boas_vindas_parte_2',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}

export function tplAutorizacaoImagem(
  responsavel: string,
  crianca: string,
  textoTemplate = TEXTO_AUTORIZACAO_IMAGEM,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const ctx = nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca)
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome]
  return {
    template: 'autorizacao_imagem',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}

export function tplFilaSuaVez(
  responsavel: string,
  crianca: string,
  minutosTolerancia: number,
  textoTemplate = TEXTO_FILA_SUA_VEZ,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const ctx = {
    ...nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca),
    minutos_tolerancia: String(minutosTolerancia),
  }
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome, ctx.minutos_tolerancia]
  return {
    template: 'fila_sua_vez',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}

export function tplAgradecimentoCheckout(
  responsavel: string,
  crianca: string,
  textoTemplate = TEXTO_AGRADECIMENTO_CHECKOUT,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const ctx = nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca)
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome]
  return {
    template: 'agradecimento_checkout',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}

// Desculpa quando um check-out foi feito por engano e a presença é reaberta.
export function tplDesculpaEngano(
  responsavel: string,
  crianca: string,
  textoTemplate = TEXTO_DESCULPA_ENGANO,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const ctx = nomesMensagem(responsavel, crianca, primeiroNomeResponsavel, primeiroNomeCrianca)
  const variaveis = [ctx.responsavel_nome, ctx.crianca_nome]
  return {
    template: 'desculpa_engano',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis, ctx),
  }
}
