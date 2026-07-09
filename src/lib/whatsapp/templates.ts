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
const TEXTO_BOAS_VINDAS = `Olá {{responsavel_nome}}! 🌳 {{crianca_nome}} acabou de entrar no play.

Combinados do Quintal:
• As crianças permanecem no espaço do play.
• Se a criança quiser sair, o responsável vem buscá-la.
• Adultos não permanecem no espaço do play.

Qualquer coisa, avisamos por aqui. 💚`
const TEXTO_AGRADECIMENTO_CHECKOUT =
  'Obrigado pela visita, {{responsavel_nome}}! {{crianca_nome}} já saiu do play. Até a próxima! 💚'

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
