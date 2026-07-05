// Modalidades de recebimento manual. Fica FORA de qualquer arquivo 'use server'
// (esses só podem exportar funções async — const/objeto quebra o módulo inteiro).
export const MODALIDADES = ['dinheiro', 'pix', 'debito', 'credito', 'maquininha'] as const
export type Modalidade = (typeof MODALIDADES)[number]
