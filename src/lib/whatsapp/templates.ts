// Templates WhatsApp (utility) — spec §7. Poucos, com variáveis.
// A renderização produz: o texto final (auditoria em notificacao.conteudo) e o array de
// variáveis (o que a Cloud API precisa quando o envio real existir).

export type TemplateRender = {
  template: string
  variaveis: string[]
  conteudo: string
}

// aviso_tempo — "Olá {{1}}, o tempo do(a) {{2}} no play está acabando (faltam {{3}} min)."
export function tplAvisoTempo(
  responsavel: string,
  crianca: string,
  minutosRestantes: number,
): TemplateRender {
  const variaveis = [responsavel, crianca, String(minutosRestantes)]
  return {
    template: 'aviso_tempo',
    variaveis,
    conteudo: `Olá ${responsavel}, o tempo do(a) ${crianca} no play está acabando (faltam ${minutosRestantes} min).`,
  }
}

// ocorrencia — "Olá {{1}}, sobre {{2}}: {{3}}. Pode vir ao espaço?"
export function tplOcorrencia(
  responsavel: string,
  motivo: string,
  detalhe: string,
): TemplateRender {
  const variaveis = [responsavel, motivo, detalhe]
  return {
    template: 'ocorrencia',
    variaveis,
    conteudo: `Olá ${responsavel}, sobre ${motivo}: ${detalhe}. Pode vir ao espaço?`,
  }
}
