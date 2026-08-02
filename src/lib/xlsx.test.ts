import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarXlsx } from './xlsx'

test('criarXlsx gera um pacote OOXML com planilhas e estilos', () => {
  const arquivo = criarXlsx([
    { name: 'Resumo', rows: [[{ value: 'Relatório', style: 'title' }]], mergeTitleAcross: 2 },
    { name: 'Lançamentos', rows: [[{ value: 'Valor', style: 'header' }], [{ value: 10, style: 'currency' }]] },
  ])
  assert.deepEqual([...arquivo.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04])
  const texto = new TextDecoder().decode(arquivo)
  assert.match(texto, /xl\/worksheets\/sheet2\.xml/)
  assert.match(texto, /name="Lançamentos"/)
  assert.match(texto, /formatCode="&quot;R\$&quot;/)
})

test('criarXlsx rejeita nome de planilha inválido', () => {
  assert.throws(() => criarXlsx([{ name: 'Inválida/aba', rows: [] }]), /Nome de planilha inválido/)
})
