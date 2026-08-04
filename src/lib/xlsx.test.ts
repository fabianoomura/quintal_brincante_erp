import { test } from 'node:test'
import assert from 'node:assert/strict'
import { criarXlsx } from './xlsx'

function entradasZip(arquivo: Uint8Array): Map<string, string> {
  const resultado = new Map<string, string>()
  const view = new DataView(arquivo.buffer, arquivo.byteOffset, arquivo.byteLength)
  const decoder = new TextDecoder()
  let offset = 0
  while (offset + 30 <= arquivo.length && view.getUint32(offset, true) === 0x04034b50) {
    const tamanho = view.getUint32(offset + 18, true)
    const tamanhoNome = view.getUint16(offset + 26, true)
    const tamanhoExtra = view.getUint16(offset + 28, true)
    const inicioNome = offset + 30
    const inicioDados = inicioNome + tamanhoNome + tamanhoExtra
    const nome = decoder.decode(arquivo.slice(inicioNome, inicioNome + tamanhoNome))
    resultado.set(nome, decoder.decode(arquivo.slice(inicioDados, inicioDados + tamanho)))
    offset = inicioDados + tamanho
  }
  return resultado
}

test('criarXlsx gera um pacote OOXML com planilhas e estilos', () => {
  const arquivo = criarXlsx([
    { name: 'Resumo', rows: [[{ value: 'Relatório', style: 'title' }]], mergeTitleAcross: 2 },
    { name: 'Lançamentos', rows: [
      [{ value: 'Valor', style: 'header' }, { value: 'Duração', style: 'header' }],
      [{ value: 10, style: 'currency' }, { value: 90 / 1440, style: 'duration' }],
    ] },
  ])
  assert.deepEqual([...arquivo.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04])
  const texto = new TextDecoder().decode(arquivo)
  const entradas = entradasZip(arquivo)
  assert.match(texto, /xl\/worksheets\/sheet2\.xml/)
  assert.match(texto, /name="Lançamentos"/)
  assert.match(texto, /formatCode="&quot;R\$&quot;/)
  assert.match(texto, /formatCode="\[h\]&quot;h&quot;mm"/)
  assert.ok(entradas.has('xl/worksheets/sheet1.xml'))
})

test('criarXlsx rejeita nome de planilha inválido', () => {
  assert.throws(() => criarXlsx([{ name: 'Inválida/aba', rows: [] }]), /Nome de planilha inválido/)
})

test('criarXlsx gera gráficos nativos ligados a intervalos das planilhas', () => {
  const arquivo = criarXlsx([{
    name: 'Análise',
    rows: [
      [{ value: 'Dia', style: 'header' }, { value: 'Média', style: 'header' }, { value: 'Participação', style: 'header' }],
      [{ value: 'sexta' }, { value: 12.5, style: 'decimal' }, { value: 0.4, style: 'percent' }],
      [{ value: 'sábado' }, { value: 15, style: 'decimal' }, { value: 0.6, style: 'percent' }],
    ],
    charts: [{
      type: 'column', title: 'Média por dia', from: { col: 4, row: 1 }, to: { col: 10, row: 15 },
      series: [{
        name: 'Média', categoryRange: "'Análise'!$A$2:$A$3", valueRange: "'Análise'!$B$2:$B$3",
        categories: ['sexta', 'sábado'], values: [12.5, 15], color: '059669',
      }],
    }],
  }])
  const texto = new TextDecoder().decode(arquivo)
  const entradas = entradasZip(arquivo)
  assert.match(texto, /xl\/drawings\/drawing1\.xml/)
  assert.match(texto, /xl\/charts\/chart1\.xml/)
  assert.match(texto, /drawingml\/2006\/chart/)
  assert.match(texto, /&apos;Análise&apos;!\$A\$2:\$A\$3/)
  assert.match(texto, /<c:barDir val="col"/)
  assert.match(texto, /formatCode="0\.0%"/)
  assert.match(entradas.get('xl/worksheets/sheet1.xml') ?? '', /<drawing r:id="rId1"/)
  assert.match(entradas.get('xl/worksheets/_rels/sheet1.xml.rels') ?? '', /Target="\.\.\/drawings\/drawing1\.xml"/)
  assert.match(entradas.get('xl/drawings/_rels/drawing1.xml.rels') ?? '', /Target="\.\.\/charts\/chart1\.xml"/)
  assert.match(entradas.get('[Content_Types].xml') ?? '', /drawingml\.chart\+xml/)
})

test('criarXlsx rejeita série de gráfico com categorias e valores desalinhados', () => {
  assert.throws(() => criarXlsx([{
    name: 'Análise', rows: [], charts: [{
      type: 'line', title: 'Inválido', from: { col: 1, row: 1 }, to: { col: 5, row: 10 },
      series: [{ name: 'Série', categoryRange: 'A1:A2', valueRange: 'B1:B2', categories: ['A'], values: [1, 2] }],
    }],
  }]), /Série de gráfico inválida/)
})
