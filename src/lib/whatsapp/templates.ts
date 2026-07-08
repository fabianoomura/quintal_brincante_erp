// Templates WhatsApp (utility) — spec §7. Poucos, com variáveis.
// A renderização produz: o texto final (auditoria em notificacao.conteudo) e o array de
// variáveis (o que a Cloud API precisa quando o envio real existir).

export type TemplateRender = {
  template: string
  variaveis: string[]
  conteudo: string
}

const TEXTO_AVISO_TEMPO =
  'Olá {{1}}, o tempo de {{2}} no play está chegando ao fim. Faltam {{3}} min. Pode vir se aproximando, por favor?'
const TEXTO_OCORRENCIA = 'Olá {{1}}, sobre {{2}}: {{3}}'

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

export function renderizarTemplate(texto: string, variaveis: string[]): string {
  return variaveis.reduce(
    (acc, valor, index) => acc.replaceAll(`{{${index + 1}}}`, valor),
    texto,
  )
}

// aviso_tempo — "Olá {{1}}, o tempo do(a) {{2}} no play está acabando (faltam {{3}} min)."
export function tplAvisoTempo(
  responsavel: string,
  crianca: string,
  minutosRestantes: number,
  textoTemplate = TEXTO_AVISO_TEMPO,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const variaveis = [
    nomePessoaMensagem(responsavel, primeiroNomeResponsavel),
    nomePessoaMensagem(crianca, primeiroNomeCrianca),
    String(minutosRestantes),
  ]
  return {
    template: 'aviso_tempo',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis),
  }
}

// ocorrencia — "Olá {{1}}, sobre {{2}}: {{3}}"
export function tplOcorrencia(
  responsavel: string,
  crianca: string,
  detalhe: string,
  textoTemplate = TEXTO_OCORRENCIA,
  primeiroNomeResponsavel?: string | null,
  primeiroNomeCrianca?: string | null,
): TemplateRender {
  const variaveis = [
    nomePessoaMensagem(responsavel, primeiroNomeResponsavel),
    nomePessoaMensagem(crianca, primeiroNomeCrianca),
    detalhe,
  ]
  return {
    template: 'ocorrencia',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis),
  }
}
