export type XlsxCell = {
  value: string | number | boolean | null
  formula?: string
  style?: 'title' | 'subtitle' | 'header' | 'currency' | 'date' | 'datetime' | 'integer' | 'decimal' | 'time' | 'duration' | 'percent'
}

export type XlsxChartSeries = {
  name: string
  categoryRange: string
  valueRange: string
  categories: string[]
  values: number[]
  color?: string
}

export type XlsxChart = {
  type: 'column' | 'line'
  title: string
  series: XlsxChartSeries[]
  from: { col: number; row: number }
  to: { col: number; row: number }
  showLegend?: boolean
}

export type XlsxSheet = {
  name: string
  rows: XlsxCell[][]
  widths?: number[]
  freezeRows?: number
  autoFilterRow?: number
  mergeTitleAcross?: number
  charts?: XlsxChart[]
}

const encoder = new TextEncoder()

function xml(valor: unknown): string {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function coluna(indice: number): string {
  let n = indice + 1
  let resultado = ''
  while (n > 0) {
    n--
    resultado = String.fromCharCode(65 + (n % 26)) + resultado
    n = Math.floor(n / 26)
  }
  return resultado
}

const STYLE_ID: Record<NonNullable<XlsxCell['style']>, number> = {
  title: 1,
  subtitle: 2,
  header: 3,
  currency: 4,
  date: 5,
  datetime: 6,
  integer: 7,
  decimal: 8,
  time: 9,
  duration: 10,
  percent: 11,
}

function celulaXml(celula: XlsxCell, linha: number, col: number): string {
  const ref = `${coluna(col)}${linha}`
  const estilo = celula.style ? ` s="${STYLE_ID[celula.style]}"` : ''
  if (celula.formula) {
    const tipo = typeof celula.value === 'string' ? ' t="str"' : ''
    const cache = typeof celula.value === 'number' || typeof celula.value === 'string'
      ? `<v>${xml(celula.value)}</v>`
      : ''
    return `<c r="${ref}"${tipo}${estilo}><f>${xml(celula.formula)}</f>${cache}</c>`
  }
  if (celula.value == null) return `<c r="${ref}"${estilo}/>`
  if (typeof celula.value === 'number') return `<c r="${ref}"${estilo}><v>${celula.value}</v></c>`
  if (typeof celula.value === 'boolean') return `<c r="${ref}" t="b"${estilo}><v>${celula.value ? 1 : 0}</v></c>`
  return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${xml(celula.value)}</t></is></c>`
}

function planilhaXml(planilha: XlsxSheet): string {
  const maxColunas = Math.max(1, ...planilha.rows.map((r) => r.length))
  const ultimaCelula = `${coluna(maxColunas - 1)}${Math.max(1, planilha.rows.length)}`
  const cols = (planilha.widths ?? [])
    .map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`)
    .join('')
  const linhas = planilha.rows
    .map((row, i) => `<row r="${i + 1}">${row.map((c, j) => celulaXml(c, i + 1, j)).join('')}</row>`)
    .join('')
  const congelar = planilha.freezeRows
    ? `<pane ySplit="${planilha.freezeRows}" topLeftCell="A${planilha.freezeRows + 1}" activePane="bottomLeft" state="frozen"/>`
    : ''
  const filtro = planilha.autoFilterRow
    ? `<autoFilter ref="A${planilha.autoFilterRow}:${coluna(maxColunas - 1)}${Math.max(planilha.autoFilterRow, planilha.rows.length)}"/>`
    : ''
  const mesclagem = planilha.mergeTitleAcross && planilha.mergeTitleAcross > 1
    ? `<mergeCells count="1"><mergeCell ref="A1:${coluna(planilha.mergeTitleAcross - 1)}1"/></mergeCells>`
    : ''
  const desenho = planilha.charts?.length ? '<drawing r:id="rId1"/>' : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${ultimaCelula}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0">${congelar}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${linhas}</sheetData>${filtro}${mesclagem}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>${desenho}</worksheet>`
}

function cacheTexto(valores: string[]): string {
  return `<c:strCache><c:ptCount val="${valores.length}"/>${valores.map((v, i) => `<c:pt idx="${i}"><c:v>${xml(v)}</c:v></c:pt>`).join('')}</c:strCache>`
}

function cacheNumero(valores: number[]): string {
  return `<c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${valores.length}"/>${valores.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache>`
}

function serieGraficoXml(serie: XlsxChartSeries, indice: number, linha: boolean): string {
  const cor = (serie.color ?? '4F46E5').replace('#', '').toUpperCase()
  const marcador = linha ? '<c:marker><c:symbol val="none"/></c:marker>' : ''
  const suavizar = linha ? '<c:smooth val="0"/>' : ''
  return `<c:ser><c:idx val="${indice}"/><c:order val="${indice}"/><c:tx><c:v>${xml(serie.name)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${cor}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${cor}"/></a:solidFill></a:ln></c:spPr>${marcador}<c:cat><c:strRef><c:f>${xml(serie.categoryRange)}</c:f>${cacheTexto(serie.categories)}</c:strRef></c:cat><c:val><c:numRef><c:f>${xml(serie.valueRange)}</c:f>${cacheNumero(serie.values)}</c:numRef></c:val>${suavizar}</c:ser>`
}

function tituloGraficoXml(titulo: string): string {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1400" b="1"/><a:t>${xml(titulo)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title>`
}

function graficoXml(grafico: XlsxChart, indice: number): string {
  const eixoCategoria = 100000 + indice * 2
  const eixoValor = eixoCategoria + 1
  const series = grafico.series.map((s, i) => serieGraficoXml(s, i, grafico.type === 'line')).join('')
  const plot = grafico.type === 'line'
    ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/></c:dLbls><c:axId val="${eixoCategoria}"/><c:axId val="${eixoValor}"/></c:lineChart>`
    : `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:dLbls><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/></c:dLbls><c:gapWidth val="70"/><c:axId val="${eixoCategoria}"/><c:axId val="${eixoValor}"/></c:barChart>`
  const legenda = grafico.showLegend
    ? '<c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend>'
    : ''
  const eixos = `<c:catAx><c:axId val="${eixoCategoria}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr></a:p></c:txPr><c:crossAx val="${eixoValor}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="${eixoValor}"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="12700"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr></a:p></c:txPr><c:crossAx val="${eixoCategoria}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="pt-BR"/><c:roundedCorners val="0"/><c:chart>${tituloGraficoXml(grafico.title)}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}${eixos}</c:plotArea>${legenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></c:spPr></c:chartSpace>`
}

function ancoraXml(grafico: XlsxChart, indice: number): string {
  const ponto = (tag: 'from' | 'to', p: { col: number; row: number }) => `<xdr:${tag}><xdr:col>${p.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${p.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:${tag}>`
  return `<xdr:twoCellAnchor editAs="twoCell">${ponto('from', grafico.from)}${ponto('to', grafico.to)}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${indice + 2}" name="Gráfico ${indice + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${indice + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`
}

function desenhoXml(graficos: XlsxChart[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${graficos.map(ancoraXml).join('')}</xdr:wsDr>`
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u16(valor: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, valor, true)
  return b
}

function u32(valor: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, valor >>> 0, true)
  return b
}

function juntar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((s, p) => s + p.length, 0)
  const resultado = new Uint8Array(total)
  let offset = 0
  for (const parte of partes) {
    resultado.set(parte, offset)
    offset += parte.length
  }
  return resultado
}

function zip(arquivos: { nome: string; conteudo: string }[]): Uint8Array {
  const locais: Uint8Array[] = []
  const centrais: Uint8Array[] = []
  let offset = 0
  for (const arquivo of arquivos) {
    const nome = encoder.encode(arquivo.nome)
    const dados = encoder.encode(arquivo.conteudo)
    const crc = crc32(dados)
    const local = juntar([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc),
      u32(dados.length), u32(dados.length), u16(nome.length), u16(0), nome, dados,
    ])
    locais.push(local)
    centrais.push(juntar([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nome,
    ]))
    offset += local.length
  }
  const diretorio = juntar(centrais)
  return juntar([
    ...locais,
    diretorio,
    u32(0x06054b50), u16(0), u16(0), u16(arquivos.length), u16(arquivos.length),
    u32(diretorio.length), u32(offset), u16(0),
  ])
}

export function criarXlsx(planilhas: XlsxSheet[]): Uint8Array {
  if (planilhas.length === 0) throw new Error('A pasta de trabalho precisa de ao menos uma planilha.')
  const nomes = new Set<string>()
  for (const p of planilhas) {
    if (!p.name || p.name.length > 31 || /[\\/?*:[\]]/.test(p.name) || nomes.has(p.name)) {
      throw new Error(`Nome de planilha inválido ou duplicado: ${p.name}`)
    }
    nomes.add(p.name)
    for (const grafico of p.charts ?? []) {
      if (grafico.series.length === 0 || grafico.to.col <= grafico.from.col || grafico.to.row <= grafico.from.row) {
        throw new Error(`Gráfico inválido na planilha: ${p.name}`)
      }
      for (const serie of grafico.series) {
        if (!serie.categoryRange || !serie.valueRange || serie.categories.length !== serie.values.length) {
          throw new Error(`Série de gráfico inválida: ${serie.name}`)
        }
      }
    }
  }
  const folhas = planilhas.map((p, i) => `<sheet name="${xml(p.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
  const rels = planilhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
  const tiposFolha = planilhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
  const recursosGraficos: { nome: string; conteudo: string }[] = []
  const tiposGraficos: string[] = []
  let numeroGrafico = 1
  planilhas.forEach((planilha, indicePlanilha) => {
    if (!planilha.charts?.length) return
    const desenho = indicePlanilha + 1
    const numeros = planilha.charts.map(() => numeroGrafico++)
    tiposGraficos.push(`<Override PartName="/xl/drawings/drawing${desenho}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`)
    recursosGraficos.push(
      { nome: `xl/worksheets/_rels/sheet${indicePlanilha + 1}.xml.rels`, conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${desenho}.xml"/></Relationships>` },
      { nome: `xl/drawings/drawing${desenho}.xml`, conteudo: desenhoXml(planilha.charts) },
      { nome: `xl/drawings/_rels/drawing${desenho}.xml.rels`, conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${numeros.map((n, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${n}.xml"/>`).join('')}</Relationships>` },
    )
    planilha.charts.forEach((grafico, i) => {
      const numero = numeros[i]
      tiposGraficos.push(`<Override PartName="/xl/charts/chart${numero}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`)
      recursosGraficos.push({ nome: `xl/charts/chart${numero}.xml`, conteudo: graficoXml(grafico, numero) })
    })
  })
  const arquivos = [
    { nome: '[Content_Types].xml', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${tiposFolha}${tiposGraficos.join('')}</Types>` },
    { nome: '_rels/.rels', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nome: 'xl/workbook.xml', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${folhas}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${planilhas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nome: 'xl/styles.xml', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="7"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00;[Red]-&quot;R$&quot; #,##0.00;-"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/><numFmt numFmtId="166" formatCode="yyyy-mm-dd hh:mm"/><numFmt numFmtId="167" formatCode="0.0"/><numFmt numFmtId="168" formatCode="hh:mm"/><numFmt numFmtId="169" formatCode="[h]&quot;h&quot;mm"/><numFmt numFmtId="170" formatCode="0.0%"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><i/><sz val="10"/><color rgb="FF475569"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF047857"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF334155"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="thin"><color rgb="FFCBD5E1"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="168" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="169" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="170" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    ...planilhas.map((p, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, conteudo: planilhaXml(p) })),
    ...recursosGraficos,
  ]
  return zip(arquivos)
}
