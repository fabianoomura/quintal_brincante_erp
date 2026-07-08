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
): TemplateRender {
  const variaveis = [responsavel, crianca, String(minutosRestantes)]
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
): TemplateRender {
  const variaveis = [responsavel, crianca, detalhe]
  return {
    template: 'ocorrencia',
    variaveis,
    conteudo: renderizarTemplate(textoTemplate, variaveis),
  }
}
