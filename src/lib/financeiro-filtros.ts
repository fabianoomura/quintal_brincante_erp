export const STATUS_FINANCEIRO = ['pendente', 'pago', 'cancelado', 'todos'] as const
export type StatusFinanceiro = (typeof STATUS_FINANCEIRO)[number]

export const ORIGENS_FINANCEIRO = ['presenca', 'mensalidade', 'colonia', 'avulso', 'todos'] as const
export type OrigemFinanceiro = (typeof ORIGENS_FINANCEIRO)[number]

export const MODALIDADES_FINANCEIRO = [
  'dinheiro',
  'pix',
  'debito',
  'credito',
  'cortesia',
  'todos',
] as const
export type ModalidadeFinanceiro = (typeof MODALIDADES_FINANCEIRO)[number]

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function pertence<T extends readonly string[]>(valor: string | undefined, opcoes: T): valor is T[number] {
  return !!valor && (opcoes as readonly string[]).includes(valor)
}

export function dataISOValida(valor: string): boolean {
  if (!DATA_RE.test(valor)) return false
  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
}

export function normalizarFiltrosFinanceiros(
  sp: { status?: string; de?: string; ate?: string; origem?: string; modalidade?: string },
  padraoData?: string,
) {
  const status: StatusFinanceiro = pertence(sp.status, STATUS_FINANCEIRO) ? sp.status : 'pendente'
  const origem: OrigemFinanceiro = pertence(sp.origem, ORIGENS_FINANCEIRO) ? sp.origem : 'todos'
  const modalidade: ModalidadeFinanceiro = pertence(sp.modalidade, MODALIDADES_FINANCEIRO)
    ? sp.modalidade
    : 'todos'
  const de = sp.de === '' ? '' : dataISOValida(sp.de ?? '') ? sp.de! : padraoData ?? ''
  const ate = sp.ate === '' ? '' : dataISOValida(sp.ate ?? '') ? sp.ate! : padraoData ?? ''
  const erro = de && ate && de > ate ? 'A data inicial não pode ser posterior à data final.' : null
  return { status, origem, modalidade, de, ate, erro }
}

export function normalizarMes(valor: string | undefined, padrao: string): string {
  return valor && MES_RE.test(valor) ? valor : padrao
}

export function periodoDoMes(mes: string): { de: string; ate: string } {
  const [ano, numeroMes] = mes.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, numeroMes, 0)).getUTCDate()
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimoDia).padStart(2, '0')}` }
}
