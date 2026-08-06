'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/colaborador'
import { dataISOValida } from '@/lib/financeiro-filtros'
import { createClient } from '@/lib/supabase/server'

export type OperacaoActionState = {
  ok: boolean
  mensagem: string
}

function inteiro(valor: FormDataEntryValue | null): number | null {
  const numero = Number(String(valor ?? '').trim())
  return Number.isInteger(numero) && numero >= 0 ? numero : null
}

function decimal(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? '').trim().replace(',', '.')
  const numero = Number(texto)
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) / 100 : null
}

function decimalOpcional(valor: FormDataEntryValue | null): number | null | undefined {
  const texto = String(valor ?? '').trim()
  if (!texto) return null
  const numero = Number(texto.replace(',', '.'))
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) / 100 : undefined
}

function hora(valor: FormDataEntryValue | null): string | null | undefined {
  const texto = String(valor ?? '').trim()
  if (!texto) return null
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto) ? texto : undefined
}

function diasEntre(de: string, ate: string): string[] {
  const resultado: string[] = []
  const atual = new Date(`${de}T12:00:00`)
  const fim = new Date(`${ate}T12:00:00`)
  while (atual <= fim) {
    resultado.push(`${atual.getFullYear()}-${String(atual.getMonth() + 1).padStart(2, '0')}-${String(atual.getDate()).padStart(2, '0')}`)
    atual.setDate(atual.getDate() + 1)
  }
  return resultado
}

export async function salvarOperacaoDia(
  _estado: OperacaoActionState,
  formData: FormData,
): Promise<OperacaoActionState> {
  const colaborador = await requireAdmin()
  const data = String(formData.get('data') ?? '')
  const pessoas = inteiro(formData.get('pessoas'))
  const custoPessoal = decimalOpcional(formData.get('custo_pessoal'))
  const outrosCustos = decimal(formData.get('outros_custos'))
  const abertura = hora(formData.get('abertura'))
  const fechamento = hora(formData.get('fechamento'))
  const aberto = formData.get('aberto') === 'true'
  const observacao = String(formData.get('observacao') ?? '').trim() || null

  if (!dataISOValida(data)) return { ok: false, mensagem: 'Informe uma data válida.' }
  if (pessoas == null) return { ok: false, mensagem: 'A quantidade de pessoas deve ser um número inteiro positivo ou zero.' }
  if (custoPessoal === undefined || outrosCustos == null) return { ok: false, mensagem: 'Os custos devem ser valores positivos ou zero.' }
  if (abertura === undefined || fechamento === undefined) return { ok: false, mensagem: 'Informe horários válidos.' }
  if (abertura && fechamento && fechamento <= abertura) return { ok: false, mensagem: 'O fechamento deve ser posterior à abertura.' }

  const supabase = await createClient()
  const { data: existente } = await supabase
    .from('operacao_play_dia')
    .select('criado_por')
    .eq('data', data)
    .maybeSingle()
  const { error } = await supabase.from('operacao_play_dia').upsert({
    data,
    aberto,
    abertura,
    fechamento,
    pessoas,
    custo_pessoal: custoPessoal,
    outros_custos: outrosCustos,
    observacao,
    criado_por: existente?.criado_por ?? colaborador.id,
    atualizado_por: colaborador.id,
  }, { onConflict: 'data' })

  if (error) return { ok: false, mensagem: `Não foi possível salvar: ${error.message}` }
  revalidatePath('/gerencial/viabilidade')
  return { ok: true, mensagem: `Operação de ${data.split('-').reverse().join('/')} salva.` }
}

export async function aplicarEscalaOperacao(
  _estado: OperacaoActionState,
  formData: FormData,
): Promise<OperacaoActionState> {
  const colaborador = await requireAdmin()
  const de = String(formData.get('de') ?? '')
  const ate = String(formData.get('ate') ?? '')
  const diasSelecionados = new Set(formData.getAll('dias').map(Number))
  const pessoas = inteiro(formData.get('pessoas'))
  const custoPessoal = decimalOpcional(formData.get('custo_pessoal'))
  const outrosCustos = decimal(formData.get('outros_custos'))
  const abertura = hora(formData.get('abertura'))
  const fechamento = hora(formData.get('fechamento'))

  if (!dataISOValida(de) || !dataISOValida(ate) || de > ate) return { ok: false, mensagem: 'Informe um período válido.' }
  if (diasSelecionados.size === 0) return { ok: false, mensagem: 'Selecione ao menos um dia da semana.' }
  if (pessoas == null || custoPessoal === undefined || outrosCustos == null) return { ok: false, mensagem: 'Revise equipe e custos informados.' }
  if (abertura === undefined || fechamento === undefined) return { ok: false, mensagem: 'Informe horários válidos.' }
  if (abertura && fechamento && fechamento <= abertura) return { ok: false, mensagem: 'O fechamento deve ser posterior à abertura.' }

  const datas = diasEntre(de, ate).filter((data) => diasSelecionados.has(new Date(`${data}T12:00:00`).getDay()))
  if (datas.length === 0) return { ok: false, mensagem: 'Nenhuma data do período corresponde aos dias selecionados.' }

  const supabase = await createClient()
  const { data: existentes, error: erroLeitura } = await supabase
    .from('operacao_play_dia')
    .select('data, criado_por')
    .in('data', datas)
  if (erroLeitura) return { ok: false, mensagem: `Não foi possível conferir a escala: ${erroLeitura.message}` }
  const criadores = new Map((existentes ?? []).map((item) => [item.data, item.criado_por]))
  const { error } = await supabase.from('operacao_play_dia').upsert(datas.map((data) => ({
    data,
    aberto: true,
    abertura,
    fechamento,
    pessoas,
    custo_pessoal: custoPessoal,
    outros_custos: outrosCustos,
    criado_por: criadores.get(data) ?? colaborador.id,
    atualizado_por: colaborador.id,
  })), { onConflict: 'data' })

  if (error) return { ok: false, mensagem: `Não foi possível aplicar a escala: ${error.message}` }
  revalidatePath('/gerencial/viabilidade')
  return { ok: true, mensagem: `Escala aplicada a ${datas.length} dia(s). Exceções podem ser ajustadas individualmente.` }
}
