// Copyright (c) 2026 Climate Interactive / New Venture Fund

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { strToU8, zipSync } from 'fflate'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { decodeCell, decodeCol, decodeRow, encodeCell, readXlsx } from './xlsx.js'

describe('decodeCell', () => {
  it('should decode a single-letter column ref', () => {
    expect(decodeCell('A1')).toEqual({ c: 0, r: 0 })
    expect(decodeCell('B2')).toEqual({ c: 1, r: 1 })
    expect(decodeCell('Z1')).toEqual({ c: 25, r: 0 })
  })

  it('should decode a two-letter column ref', () => {
    expect(decodeCell('AA1')).toEqual({ c: 26, r: 0 })
    expect(decodeCell('AB1')).toEqual({ c: 27, r: 0 })
    expect(decodeCell('AZ100')).toEqual({ c: 51, r: 99 })
    expect(decodeCell('ZZ999')).toEqual({ c: 701, r: 998 })
  })

  it('should decode a three-letter column ref', () => {
    expect(decodeCell('AAA1')).toEqual({ c: 702, r: 0 })
  })

  it('should accept lowercase column letters', () => {
    expect(decodeCell('a1')).toEqual({ c: 0, r: 0 })
    expect(decodeCell('ab1')).toEqual({ c: 27, r: 0 })
  })

  it('should return {-1, -1} for invalid input', () => {
    expect(decodeCell('')).toEqual({ c: -1, r: -1 })
    expect(decodeCell('1')).toEqual({ c: -1, r: -1 })
    expect(decodeCell('A')).toEqual({ c: -1, r: -1 })
    expect(decodeCell('A0')).toEqual({ c: -1, r: -1 })
  })
})

describe('encodeCell', () => {
  it('should round-trip with decodeCell', () => {
    const cases = ['A1', 'B2', 'Z1', 'AA1', 'AZ100', 'ZZ999', 'AAA1']
    for (const ref of cases) {
      expect(encodeCell(decodeCell(ref))).toBe(ref)
    }
  })

  it('should encode {0, 0} as A1', () => {
    expect(encodeCell({ c: 0, r: 0 })).toBe('A1')
  })

  it('should encode {25, 0} as Z1', () => {
    expect(encodeCell({ c: 25, r: 0 })).toBe('Z1')
  })

  it('should encode {26, 0} as AA1', () => {
    expect(encodeCell({ c: 26, r: 0 })).toBe('AA1')
  })
})

describe('decodeCol', () => {
  it('should decode a single-letter column', () => {
    expect(decodeCol('A')).toBe(0)
    expect(decodeCol('Z')).toBe(25)
  })

  it('should decode a multi-letter column', () => {
    expect(decodeCol('AA')).toBe(26)
    expect(decodeCol('AB')).toBe(27)
    expect(decodeCol('ZZ')).toBe(701)
  })

  it('should accept lowercase input', () => {
    expect(decodeCol('ab')).toBe(27)
  })

  it('should return -1 for invalid input', () => {
    expect(decodeCol('')).toBe(-1)
    expect(decodeCol('A1')).toBe(-1)
  })
})

describe('decodeRow', () => {
  it('should decode a row to zero-indexed', () => {
    expect(decodeRow('1')).toBe(0)
    expect(decodeRow('13')).toBe(12)
    expect(decodeRow('100')).toBe(99)
  })

  it('should return -1 for invalid input', () => {
    expect(decodeRow('')).toBe(-1)
    expect(decodeRow('0')).toBe(-1)
    expect(decodeRow('abc')).toBe(-1)
  })
})

// Build a minimal xlsx zip from a parts map and write it to a temp file.
// Sheets is a record mapping sheet name -> inner XML (the contents of <sheetData>).
// sharedStrings, if provided, is an array of strings to include in the
// xl/sharedStrings.xml file.
interface XlsxParts {
  sheets: { name: string; sheetData: string }[]
  sharedStrings?: string[]
  // Raw override for xl/sharedStrings.xml — used when we need <r>/<t> rich text
  // or other shapes that the `sharedStrings` shorthand can't express
  sharedStringsXml?: string
}

function buildXlsx(parts: XlsxParts): string {
  const sheets = parts.sheets
  const files: Record<string, Uint8Array> = {}

  // Minimal required files for SheetJS-compatible workbook structure
  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )
  .join('\n')}
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`
  )

  files['_rels/.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  )

  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheets.map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('\n')}
</sheets>
</workbook>`
  )

  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  )
  .join('\n')}
</Relationships>`
  )

  for (let i = 0; i < sheets.length; i++) {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheets[i].sheetData}</sheetData>
</worksheet>`
    )
  }

  if (parts.sharedStringsXml) {
    files['xl/sharedStrings.xml'] = strToU8(parts.sharedStringsXml)
  } else if (parts.sharedStrings) {
    files['xl/sharedStrings.xml'] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${parts.sharedStrings.length}" uniqueCount="${parts.sharedStrings.length}">
${parts.sharedStrings.map(s => `<si><t>${s}</t></si>`).join('\n')}
</sst>`
    )
  }

  const buf = zipSync(files)
  const out = path.join(tmpDir, `test-${nextId++}.xlsx`)
  fs.writeFileSync(out, buf)
  return out
}

let tmpDir: string
let nextId = 0

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-spec-'))
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('readXlsx', () => {
  it('should expose sheet names in workbook order', () => {
    const file = buildXlsx({
      sheets: [
        { name: 'Alpha', sheetData: '' },
        { name: 'Beta', sheetData: '' }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.SheetNames).toEqual(['Alpha', 'Beta'])
  })

  it('should read numeric cells with and without explicit t attribute', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1"><v>42</v></c><c r="B1" t="n"><v>3.14</v></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    const sheet = wb.Sheets['s']
    expect(sheet['A1']).toEqual({ v: 42 })
    expect(sheet['B1']).toEqual({ v: 3.14 })
  })

  it('should read the cached value of a formula cell', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1"><f>+B1*2</f><v>0.0015189876</v></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toEqual({ v: 0.0015189876 })
  })

  it('should read cells whose <v> tag has attributes (e.g. xml:space)', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData:
            '<row r="1">' +
            '<c r="A1" t="str"><f>IF(B1,"x ","")</f><v xml:space="preserve">x </v></c>' +
            '<c r="B1"><v xml:space="preserve">42</v></c>' +
            '<c r="C1" t="s"><v xml:space="preserve">0</v></c>' +
            '<c r="D1" t="b"><v xml:space="preserve">1</v></c>' +
            '</row>'
        }
      ],
      sharedStrings: ['hello']
    })
    const wb = readXlsx(file)
    const sheet = wb.Sheets['s']
    expect(sheet['A1']).toEqual({ v: 'x ' })
    expect(sheet['B1']).toEqual({ v: 42 })
    expect(sheet['C1']).toEqual({ v: 'hello' })
    expect(sheet['D1']).toEqual({ v: true })
  })

  it('should normalize line endings in cell text like an XML parser (CRLF -> LF)', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData:
            '<row r="1">' +
            '<c r="A1" t="str"><v>line1&#13;\nline2&#13;</v></c>' +
            '<c r="B1" t="s"><v>0</v></c>' +
            '<c r="C1" t="inlineStr"><is><t>a\rb</t></is></c>' +
            '</row>'
        }
      ],
      sharedStringsXml:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">' +
        '<si><t>x&#13;&#10;y</t></si>' +
        '</sst>'
    })
    const wb = readXlsx(file)
    const sheet = wb.Sheets['s']
    expect(sheet['A1']).toEqual({ v: 'line1\nline2\n' })
    expect(sheet['B1']).toEqual({ v: 'x\ny' })
    expect(sheet['C1']).toEqual({ v: 'a\nb' })
  })

  it('should skip formula cells with no cached value (uncalculated)', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1"><f>+B1*2</f></c><c r="B1"><v>7</v></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toBeUndefined()
    expect(wb.Sheets['s']['B1']).toEqual({ v: 7 })
  })

  it('should resolve shared strings', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
        }
      ],
      sharedStrings: ['hello', 'world']
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toEqual({ v: 'hello' })
    expect(wb.Sheets['s']['B1']).toEqual({ v: 'world' })
  })

  it('should read inline strings', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1" t="inlineStr"><is><t>foo</t></is></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toEqual({ v: 'foo' })
  })

  it('should concatenate rich-text runs within a shared string', () => {
    // sharedStrings can contain <si><r><t>part</t></r><r><t>part</t></r></si>
    // when the string has mixed formatting. We should concatenate the runs.
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1" t="s"><v>0</v></c></row>'
        }
      ],
      // We can't express rich-text runs through the buildXlsx convenience, so
      // construct the sharedStrings part as a raw override
      sharedStringsXml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">
<si><r><t>foo</t></r><r><t> </t></r><r><t>bar</t></r></si>
</sst>`
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toEqual({ v: 'foo bar' })
  })

  it('should skip error cells', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1" t="e"><f>+#REF!</f><v>#REF!</v></c><c r="B1"><v>5</v></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toBeUndefined()
    expect(wb.Sheets['s']['B1']).toEqual({ v: 5 })
  })

  it('should read boolean cells', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1" t="b"><v>1</v></c><c r="B1" t="b"><v>0</v></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toEqual({ v: true })
    expect(wb.Sheets['s']['B1']).toEqual({ v: false })
  })

  it('should tolerate a missing sharedStrings.xml', () => {
    const file = buildXlsx({
      sheets: [{ name: 's', sheetData: '<row r="1"><c r="A1"><v>5</v></c></row>' }]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['A1']).toEqual({ v: 5 })
  })

  it('should not let self-closing empty cells shift subsequent cells', () => {
    // Regression for a bug found in the prototype: a greedy regex matched
    // across <c r="I4" s="1"/><c r="J4" s="1"/><c r="BC4"><v>1840</v></c>
    // and recorded BC4's value at I4
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="4"><c r="I4" s="1"/><c r="J4" s="1"/><c r="K4" s="1"/><c r="BC4"><v>1840</v></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['BC4']).toEqual({ v: 1840 })
    expect(wb.Sheets['s']['I4']).toBeUndefined()
    expect(wb.Sheets['s']['J4']).toBeUndefined()
    expect(wb.Sheets['s']['K4']).toBeUndefined()
  })

  it('should return undefined for an unknown sheet', () => {
    const file = buildXlsx({
      sheets: [{ name: 's', sheetData: '' }]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['not-a-sheet']).toBeUndefined()
  })

  it('should expose !ref reflecting the sheet bounds', () => {
    const file = buildXlsx({
      sheets: [
        {
          name: 's',
          sheetData: '<row r="1"><c r="A1"><v>1</v></c></row><row r="5"><c r="C5"><v>2</v></c></row>'
        }
      ]
    })
    const wb = readXlsx(file)
    expect(wb.Sheets['s']['!ref']).toBe('A1:C5')
  })

  it('should cache repeated reads of the same file path', () => {
    const file = buildXlsx({
      sheets: [{ name: 's', sheetData: '<row r="1"><c r="A1"><v>1</v></c></row>' }]
    })
    const wb1 = readXlsx(file)
    const wb2 = readXlsx(file)
    // Same instance — workbook-level cache mirrors the previous SheetJS path
    expect(wb1).toBe(wb2)
  })
})
