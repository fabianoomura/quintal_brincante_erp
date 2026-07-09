'use client'

import { useState } from 'react'
import {
  buscarEnderecoPorCEP,
  formatarCEP,
  normalizarUF,
  type EnderecoCampos,
} from '@/lib/endereco'
import { input, label, labelText } from '@/lib/ui'

type Props = {
  value: EnderecoCampos
  onChange: (value: EnderecoCampos) => void
  titulo?: string
}

export default function EnderecoFields({ value, onChange, titulo = 'Endereço' }: Props) {
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  function patch(p: Partial<EnderecoCampos>) {
    onChange({ ...value, ...p })
  }

  async function buscarCEP() {
    setAviso(null)
    const cep = value.cep ?? ''
    if (cep.trim() === '') return

    setBuscando(true)
    const res = await buscarEnderecoPorCEP(cep)
    setBuscando(false)

    if (!res.ok) {
      setAviso(res.erro)
      return
    }

    onChange({
      ...value,
      ...res.endereco,
      numero: value.numero ?? '',
      complemento: value.complemento || res.endereco.complemento || '',
    })
    setAviso('Endereço preenchido pelo CEP.')
  }

  return (
    <fieldset className="space-y-2">
      <legend className={labelText}>{titulo}</legend>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className={label}>
          <span className="sr-only">CEP</span>
          <input
            inputMode="numeric"
            maxLength={9}
            placeholder="CEP"
            value={value.cep ?? ''}
            onChange={(e) => patch({ cep: formatarCEP(e.target.value) })}
            onBlur={() => {
              if ((value.cep ?? '').replace(/\D/g, '').length === 8) void buscarCEP()
            }}
            className={input}
          />
        </label>
        <button
          type="button"
          onClick={buscarCEP}
          disabled={buscando || (value.cep ?? '').replace(/\D/g, '').length !== 8}
          className="pop w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 sm:w-auto"
        >
          {buscando ? 'Buscando...' : 'Buscar CEP'}
        </button>
      </div>

      {aviso && (
        <p
          className={`text-xs font-semibold ${
            aviso.includes('preenchido') ? 'text-emerald-600' : 'text-rose-500'
          }`}
        >
          {aviso}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(7rem,0.7fr)]">
        <label className={label}>
          <span className={labelText}>Rua / avenida</span>
          <input
            value={value.logradouro ?? ''}
            onChange={(e) => patch({ logradouro: e.target.value })}
            className={input}
          />
        </label>
        <label className={label}>
          <span className={labelText}>Número</span>
          <input
            value={value.numero ?? ''}
            onChange={(e) => patch({ numero: e.target.value })}
            className={input}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className={label}>
          <span className={labelText}>Complemento</span>
          <input
            value={value.complemento ?? ''}
            onChange={(e) => patch({ complemento: e.target.value })}
            className={input}
          />
        </label>
        <label className={label}>
          <span className={labelText}>Bairro</span>
          <input
            value={value.bairro ?? ''}
            onChange={(e) => patch({ bairro: e.target.value })}
            className={input}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem]">
        <label className={label}>
          <span className={labelText}>Cidade</span>
          <input
            value={value.cidade ?? ''}
            onChange={(e) => patch({ cidade: e.target.value })}
            className={input}
          />
        </label>
        <label className={label}>
          <span className={labelText}>UF</span>
          <input
            maxLength={2}
            value={value.uf ?? ''}
            onChange={(e) => patch({ uf: normalizarUF(e.target.value) })}
            className={input}
          />
        </label>
      </div>
    </fieldset>
  )
}
