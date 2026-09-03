'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/colaborador'
import { dataISOValida } from '@/lib/financeiro-filtros'
import { buscarClimaHistoricoInmet } from '@/lib/inmet'
import { createClient } from '@/lib/supabase/server'
import { CLIMAS_PLAY, type ClimaPlay } from '@/lib/viabilidade'
import { buscarPresencasRelatorio } from '../dados'
import { buscarReceitasPlay } from './dados'

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

function temperaturaOpcional(valor: FormDataEntryValue | null): number | null | undefined {
  const texto = String(valor ?? '').trim()
  if (!texto) return null
  const numero = Number(texto.replace(',', '.'))
  return Number.isFinite(numero) && numero >= -10 && numero <= 60
    ? Math.round(numero * 10) / 10
    : undefined
}

function climaOpcional(valor: FormDataEntryValue | null): ClimaPlay | null | undefined {
  const texto = String(valor ?? '').trim()
  if (!texto) return null
  return (CLIMAS_PLAY as readonly string[]).includes(texto) ? texto as ClimaPlay : undefined
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
  const custoAlimentacao = decimal(formData.get('custo_alimentacao'))
  const outrosCustos = decimal(formData.get('outros_custos'))
  const clima = climaOpcional(formData.get('clima'))
  const temperaturaMedia = temperaturaOpcional(formData.get('temperatura_media'))
  const abertura = hora(formData.get('abertura'))
  const fechamento = hora(formData.get('fechamento'))
  const aberto = formData.get('aberto') === 'true'
  const observacao = String(formData.get('observacao') ?? '').trim() || null

  if (!dataISOValida(data)) return { ok: false, mensagem: 'Informe uma data válida.' }
  if (pessoas == null) return { ok: false, mensagem: 'A quantidade de pessoas deve ser um número inteiro positivo ou zero.' }
  if (custoPessoal === undefined || custoAlimentacao == null || outrosCustos == null) return { ok: false, mensagem: 'Os custos devem ser valores positivos ou zero.' }
  if (clima === undefined || temperaturaMedia === undefined) return { ok: false, mensagem: 'Revise o clima e a temperatura média informados.' }
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
    custo_alimentacao: custoAlimentacao,
    outros_custos: outrosCustos,
    clima,
    temperatura_media: temperaturaMedia,
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
  const custoAlimentacao = decimal(formData.get('custo_alimentacao'))
  const outrosCustos = decimal(formData.get('outros_custos'))
  const abertura = hora(formData.get('abertura'))
  const fechamento = hora(formData.get('fechamento'))

  if (!dataISOValida(de) || !dataISOValida(ate) || de > ate) return { ok: false, mensagem: 'Informe um período válido.' }
  if (diasSelecionados.size === 0) return { ok: false, mensagem: 'Selecione ao menos um dia da semana.' }
  if (pessoas == null || custoPessoal === undefined || custoAlimentacao == null || outrosCustos == null) return { ok: false, mensagem: 'Revise equipe e custos informados.' }
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
    custo_alimentacao: custoAlimentacao,
    outros_custos: outrosCustos,
    criado_por: criadores.get(data) ?? colaborador.id,
    atualizado_por: colaborador.id,
  })), { onConflict: 'data' })

  if (error) return { ok: false, mensagem: `Não foi possível aplicar a escala: ${error.message}` }
  revalidatePath('/gerencial/viabilidade')
  return { ok: true, mensagem: `Escala aplicada a ${datas.length} dia(s). Exceções podem ser ajustadas individualmente.` }
}

export async function preencherClimaRetroativo(
  _estado: OperacaoActionState,
  formData: FormData,
): Promise<OperacaoActionState> {
  const colaborador = await requireAdmin()
  const de = String(formData.get('de') ?? '')
  const ate = String(formData.get('ate') ?? '')

  if (!dataISOValida(de) || !dataISOValida(ate) || de > ate) {
    return { ok: false, mensagem: 'Informe um período válido.' }
  }
  const totalDias = Math.floor((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000) + 1
  if (totalDias > 366) {
    return { ok: false, mensagem: 'Consulte no máximo 366 dias por vez.' }
  }

  const supabase = await createClient()
  const [presencas, receitas, operacoes] = await Promise.all([
    buscarPresencasRelatorio(de, ate),
    buscarReceitasPlay(de, ate),
    supabase
      .from('operacao_play_dia')
      .select('data, aberto, clima, temperatura_media, criado_por')
      .gte('data', de)
      .lte('data', ate),
  ])
  const erro = presencas.erro ?? receitas.erro ?? operacoes.error?.message
  if (erro) return { ok: false, mensagem: `Não foi possível conferir os dias do Play: ${erro}` }

  const existentes = new Map((operacoes.data ?? []).map((item) => [item.data, item]))
  const datasFuncionamento = new Set([
    ...presencas.data.filter((item) => item.origem === 'espaco_kids').map((item) => item.data),
    ...receitas.data.filter((item) => item.gerado > 0).map((item) => item.data),
    ...(operacoes.data ?? []).filter((item) => item.aberto).map((item) => item.data),
  ])
  const pendentes = [...datasFuncionamento].filter((data) => {
    const existente = existentes.get(data)
    if (existente && !existente.aberto) return false
    return !existente || existente.clima == null || existente.temperatura_media == null
  })
  if (!pendentes.length) {
    return { ok: true, mensagem: 'O clima e a temperatura já estão preenchidos em todos os dias que funcionaram.' }
  }

  let historico
  try {
    historico = await buscarClimaHistoricoInmet(de, ate)
  } catch (erroInmet) {
    const detalhe = erroInmet instanceof Error ? erroInmet.message : 'falha desconhecida'
    return { ok: false, mensagem: `Não foi possível consultar o INMET: ${detalhe}. Tente novamente mais tarde.` }
  }

  const porData = new Map(historico.map((item) => [item.data, item]))
  let climasPreenchidos = 0
  let temperaturasPreenchidas = 0
  const atualizacoes = pendentes.flatMap((data) => {
    const existente = existentes.get(data)
    const meteo = porData.get(data)
    const clima = existente?.clima as ClimaPlay | null | undefined
    const temperatura = existente?.temperatura_media == null ? null : Number(existente.temperatura_media)
    const preencheClima = clima == null && meteo?.clima != null
    const preencheTemperatura = temperatura == null && meteo?.temperaturaMedia != null
    if (!preencheClima && !preencheTemperatura) return []
    const climaNovo = clima ?? meteo?.clima ?? null
    const temperaturaNova = temperatura ?? meteo?.temperaturaMedia ?? null
    if (preencheClima) climasPreenchidos += 1
    if (preencheTemperatura) temperaturasPreenchidas += 1
    return [{
      data,
      aberto: existente?.aberto ?? true,
      clima: climaNovo,
      temperatura_media: temperaturaNova,
      criado_por: existente?.criado_por ?? colaborador.id,
      atualizado_por: colaborador.id,
    }]
  })

  if (!atualizacoes.length) {
    return { ok: false, mensagem: 'O INMET não possui observações para os dias pendentes deste período.' }
  }
  const { error } = await supabase
    .from('operacao_play_dia')
    .upsert(atualizacoes, { onConflict: 'data' })
  if (error) return { ok: false, mensagem: `Não foi possível salvar os dados meteorológicos: ${error.message}` }

  revalidatePath('/gerencial/viabilidade')
  const semObservacao = pendentes.length - atualizacoes.length
  return {
    ok: true,
    mensagem: `INMET aplicado a ${atualizacoes.length} dia(s): ${climasPreenchidos} clima(s) e ${temperaturasPreenchidas} temperatura(s) preenchidos.${semObservacao ? ` ${semObservacao} dia(s) ficaram sem observação disponível.` : ''} Dados manuais foram preservados.`,
  }
}
