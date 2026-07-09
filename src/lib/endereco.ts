export type EnderecoCampos = {
  endereco?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}

type ViaCepResposta = {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

export type BuscaCepResultado =
  | { ok: true; endereco: EnderecoCampos }
  | { ok: false; erro: string }

export function apenasDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '')
}

export function formatarCEP(valor: string | null | undefined): string {
  const digitos = apenasDigitos(valor).slice(0, 8)
  if (digitos.length <= 5) return digitos
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}

export function normalizarUF(valor: string | null | undefined): string {
  return (valor ?? '').replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase()
}

function texto(valor: string | null | undefined): string {
  return valor?.trim() ?? ''
}

export function comporEndereco(campos: EnderecoCampos): string | null {
  const logradouro = texto(campos.logradouro)
  const numero = texto(campos.numero)
  const complemento = texto(campos.complemento)
  const bairro = texto(campos.bairro)
  const cidade = texto(campos.cidade)
  const uf = normalizarUF(campos.uf)
  const cep = formatarCEP(campos.cep)

  const linha1 = [logradouro, numero].filter(Boolean).join(', ')
  const cidadeUf = cidade && uf ? `${cidade}/${uf}` : cidade || uf
  const partes = [linha1, complemento, bairro, cidadeUf, cep ? `CEP ${cep}` : '']
    .filter(Boolean)

  return partes.length > 0 ? partes.join(' - ') : null
}

export async function buscarEnderecoPorCEP(cep: string): Promise<BuscaCepResultado> {
  const digitos = apenasDigitos(cep)
  if (digitos.length !== 8) {
    return { ok: false, erro: 'Informe um CEP com 8 dígitos.' }
  }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
    if (!resposta.ok) {
      return { ok: false, erro: 'Não foi possível consultar esse CEP.' }
    }

    const dados = (await resposta.json()) as ViaCepResposta
    if (dados.erro) {
      return { ok: false, erro: 'CEP não encontrado.' }
    }

    return {
      ok: true,
      endereco: {
        cep: formatarCEP(dados.cep ?? digitos),
        logradouro: dados.logradouro ?? '',
        complemento: dados.complemento ?? '',
        bairro: dados.bairro ?? '',
        cidade: dados.localidade ?? '',
        uf: normalizarUF(dados.uf),
      },
    }
  } catch {
    return { ok: false, erro: 'Consulta de CEP indisponível agora.' }
  }
}
