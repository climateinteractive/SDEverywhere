// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { readFileSync } from 'node:fs'

import { strFromU8, unzipSync } from 'fflate'

//
// Minimal xlsx reader and cell-address utilities used by the `GET DIRECT ...`
// code paths in the compile pipeline. We read numeric cell values only; strings
// are surfaced where present but are not the focus of this module.
//

const A_UPPER = 65 // 'A'
const A_LOWER = 97 // 'a'

// Workbook cache, mirroring the previous SheetJS readXlsx behavior in
// helpers.js. Each xlsx file is parsed at most once per process.
const workbookCache = new Map()

/**
 * Reset the workbook cache. Intended for tests that load the same path with
 * different contents across runs.
 */
export function resetXlsxCache() {
  workbookCache.clear()
}

/**
 * Read the xlsx file at the given path and return a workbook shaped like the
 * SheetJS `WorkBook`:
 *
 * ```
 * { SheetNames: string[],
 *   Sheets: { [name]: { [cellRef]: { v }, '!ref': 'A1:Z99' } } }
 * ```
 *
 * Sheets are materialized lazily — the first time a sheet name is read from
 * `Sheets`, its XML is parsed; subsequent reads of the same sheet return the
 * cached map. Workbooks are also cached by path.
 *
 * @param {string} pathname The absolute path to the xlsx file.
 * @returns The parsed workbook.
 */
export function readXlsx(pathname) {
  // Return the cached workbook if we've already parsed this file
  const cached = workbookCache.get(pathname)
  if (cached) {
    return cached
  }

  // Decompress the file, keeping only the entries we actually read from
  const buf = readFileSync(pathname)
  const unzipped = unzipSync(buf, {
    filter: file => {
      const n = file.name
      return (
        n === 'xl/workbook.xml' ||
        n === 'xl/sharedStrings.xml' ||
        n === 'xl/_rels/workbook.xml.rels' ||
        (n.startsWith('xl/worksheets/sheet') && n.endsWith('.xml'))
      )
    }
  })

  // Pull out the workbook, rels, and (optional) sharedStrings parts as text
  const wbBytes = unzipped['xl/workbook.xml']
  const relsBytes = unzipped['xl/_rels/workbook.xml.rels']
  if (!wbBytes || !relsBytes) {
    throw new Error(`Failed to read xlsx file (missing workbook or rels): ${pathname}`)
  }
  const wbXml = strFromU8(wbBytes)
  const relsXml = strFromU8(relsBytes)
  const ssBytes = unzipped['xl/sharedStrings.xml']

  // Build the sheet definitions
  const sheetDefs = parseWorkbookXml(wbXml)

  // Build the rid-to-target map
  const rels = parseWorkbookRels(relsXml)

  // Build the shared-string table
  const sharedStrings = ssBytes ? parseSharedStrings(strFromU8(ssBytes)) : []

  // Resolve each sheet's rid to its worksheet XML bytes in the zip
  const sheetNames = []
  const sheetXmls = Object.create(null)
  for (const { name, rid } of sheetDefs) {
    let target = rels[rid]
    if (!target) {
      continue
    }
    // Targets are workbook-relative; normalize to the zip entry path
    target = target.startsWith('/') ? target.slice(1) : 'xl/' + target
    const bytes = unzipped[target]
    if (!bytes) {
      continue
    }
    sheetNames.push(name)
    sheetXmls[name] = bytes
  }

  // Lazy materialization: parse a sheet only when first accessed
  const parsedSheets = Object.create(null)
  const sheetsProxy = new Proxy(
    {},
    {
      get(_, name) {
        if (typeof name !== 'string') {
          return undefined
        }
        if (parsedSheets[name]) {
          return parsedSheets[name]
        }
        const bytes = sheetXmls[name]
        if (!bytes) {
          return undefined
        }
        const parsed = parseSheetXml(strFromU8(bytes), sharedStrings)
        parsedSheets[name] = parsed
        return parsed
      },
      has(_, name) {
        return typeof name === 'string' && name in sheetXmls
      },
      ownKeys() {
        return sheetNames.slice()
      },
      getOwnPropertyDescriptor(_, name) {
        if (typeof name !== 'string' || !(name in sheetXmls)) {
          return undefined
        }
        const bytes = sheetXmls[name]
        if (!parsedSheets[name]) {
          parsedSheets[name] = parseSheetXml(strFromU8(bytes), sharedStrings)
        }
        return { enumerable: true, configurable: true, value: parsedSheets[name], writable: false }
      }
    }
  )

  // Cache the workbook by path so subsequent reads are free
  const workbook = { SheetNames: sheetNames, Sheets: sheetsProxy }
  workbookCache.set(pathname, workbook)
  return workbook
}

//
// Cell address utilities
//

/**
 * Decode an A1-style cell ref to a zero-indexed `{c, r}`.
 *
 * Returns `{c: -1, r: -1}` for invalid input, matching the behavior of
 * `XLSX.utils.decode_cell` from SheetJS.
 *
 * @param {string} ref The cell reference (e.g. 'A1', 'AZ100').
 * @returns The zero-indexed column and row.
 */
export function decodeCell(ref) {
  // Walk the leading run of letters, accumulating the 1-based column index
  // in bijective base 26 (A=1, B=2, ..., Z=26, AA=27, AB=28, ...)
  let c = 0
  let i = 0
  const len = ref.length
  while (i < len) {
    const code = ref.charCodeAt(i)
    if (code >= 65 && code <= 90) {
      c = c * 26 + (code - A_UPPER + 1)
    } else if (code >= 97 && code <= 122) {
      c = c * 26 + (code - A_LOWER + 1)
    } else {
      break
    }
    i++
  }

  // Reject input that didn't start with at least one letter
  if (i === 0) {
    return { c: -1, r: -1 }
  }

  // Parse the trailing row digits; rows are 1-based, so reject 0/non-numeric
  const r = parseInt(ref.slice(i), 10)
  if (!Number.isFinite(r) || r < 1) {
    return { c: -1, r: -1 }
  }

  // Convert column and row to the zero-indexed form callers expect
  return { c: c - 1, r: r - 1 }
}

/**
 * Encode a zero-indexed `{c, r}` to an A1-style cell ref.
 *
 * @param {{c: number, r: number}} addr The zero-indexed column and row.
 * @returns The A1-style cell reference (e.g. 'B7').
 */
export function encodeCell({ c, r }) {
  // Convert the 1-based column index to bijective base-26 letters, building
  // the string right-to-left (one letter per iteration, least-significant first)
  let col = ''
  let n = c + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    col = String.fromCharCode(A_UPPER + rem) + col
    n = Math.floor((n - 1) / 26)
  }

  // Rows in A1 notation are 1-based
  return col + (r + 1)
}

/**
 * Decode a column ref (e.g. 'AB') to a zero-indexed column number.
 *
 * @param {string} ref The column reference.
 * @returns The zero-indexed column number, or -1 if the input is invalid.
 */
export function decodeCol(ref) {
  // Empty input has no valid column
  if (ref.length === 0) {
    return -1
  }

  // Same bijective base-26 walk as decodeCell, but every character must be a
  // letter — anything else (including a row digit) is rejected
  let c = 0
  for (let i = 0; i < ref.length; i++) {
    const code = ref.charCodeAt(i)
    if (code >= 65 && code <= 90) {
      c = c * 26 + (code - A_UPPER + 1)
    } else if (code >= 97 && code <= 122) {
      c = c * 26 + (code - A_LOWER + 1)
    } else {
      return -1
    }
  }

  // Convert from 1-based to zero-indexed
  return c - 1
}

/**
 * Decode a row ref (e.g. '13') to a zero-indexed row number.
 *
 * @param {string} ref The row reference.
 * @returns The zero-indexed row number, or -1 if the input is invalid.
 */
export function decodeRow(ref) {
  // Parse the 1-based row number and convert to zero-indexed; -1 on invalid input
  const r = parseInt(ref, 10)
  return Number.isFinite(r) && r >= 1 ? r - 1 : -1
}

//
// XML helpers
//

/**
 * Pull one attribute value out of a tag's attribute list. Cheaper than a full
 * attribute parser when we only need a few specific keys.
 *
 * @param {string} attrs The portion of a start tag containing the attributes.
 * @param {string} name The attribute name to look up.
 * @returns The attribute value, or undefined if the attribute is not present.
 */
function getAttr(attrs, name) {
  // Look for `name="` — every attribute we care about uses double quotes
  const i = attrs.indexOf(name + '="')
  if (i < 0) {
    return undefined
  }

  // Slice out everything between the opening and closing quote
  const start = i + name.length + 2
  const end = attrs.indexOf('"', start)
  return end < 0 ? undefined : attrs.slice(start, end)
}

/**
 * Normalize line endings the way a conformant XML parser (and SheetJS) does:
 * `\r\n` and lone `\r` both become `\n`. Applied after entity decoding so a
 * CR encoded as `&#13;` is normalized too.
 *
 * @param {string} s The text to normalize.
 * @returns The normalized string.
 */
function normalizeEol(s) {
  return s.indexOf('\r') === -1 ? s : s.replace(/\r\n?/g, '\n')
}

/**
 * Decode the standard XML entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`,
 * `&apos;`) along with numeric character references (`&#NN;` and `&#xNN;`)
 * in the given text, and normalize line endings to `\n`.
 *
 * @param {string} s The raw text from an XML element body or attribute.
 * @returns The decoded string.
 */
function decodeXmlText(s) {
  // Fast path: most cell text contains no entities, so skip the regex chain
  if (s.indexOf('&') === -1) {
    return normalizeEol(s)
  }

  // Decode the named entities, then decimal and hex numeric refs, and finally
  // `&amp;` — leaving `&amp;` last avoids accidentally producing `&lt;` etc.
  // from a literal `&amp;lt;` in the source
  return normalizeEol(
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&amp;/g, '&')
  )
}

//
// Parsers
//

/**
 * Parse the contents of `xl/sharedStrings.xml` into a positional array of
 * decoded strings. A shared string may contain rich-text runs
 * (`<si><r><t>foo</t></r><r><t>bar</t></r></si>`); concatenate all `<t>`
 * elements within each `<si>` so the result comes back as a single string.
 *
 * @param {string} xml The contents of the `xl/sharedStrings.xml` file.
 * @returns An array indexed by shared-string position.
 */
function parseSharedStrings(xml) {
  // Outer regex finds each <si> entry; inner regex finds <t> runs within it.
  // The two are stateful (global) regexes, so reset the inner one per <si>.
  const strings = []
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g
  const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g
  let m
  while ((m = siRe.exec(xml)) !== null) {
    // Concatenate every <t> chunk inside this <si> — rich-text runs collapse
    // into a single plain string
    const inner = m[1]
    let s = ''
    let tm
    tRe.lastIndex = 0
    while ((tm = tRe.exec(inner)) !== null) {
      s += decodeXmlText(tm[1])
    }
    strings.push(s)
  }
  return strings
}

/**
 * Parse the contents of `xl/workbook.xml` into the list of sheet definitions,
 * each with the user-visible sheet name and the relationship id that maps to
 * the sheet's XML part. Attribute spans can contain `/` (in URLs), so the
 * regex matches up to the self-closing `/>` non-greedily rather than excluding
 * `/` from the attribute span.
 *
 * @param {string} xml The contents of the `xl/workbook.xml` file.
 * @returns An array of `{ name, rid }` objects in workbook order.
 */
function parseWorkbookXml(xml) {
  // Iterate every <sheet .../> element in workbook order
  const sheets = []
  const re = /<sheet\b([\s\S]*?)\/>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    // Each sheet is identified by its user-visible name and its rid pointer;
    // the rid attribute is conventionally lowercase but accept both forms
    const attrs = m[1]
    const name = getAttr(attrs, 'name')
    const rid = getAttr(attrs, 'r:id') ?? getAttr(attrs, 'r:Id')
    if (name && rid) {
      sheets.push({ name, rid })
    }
  }
  return sheets
}

/**
 * Parse the contents of `xl/_rels/workbook.xml.rels` into a map from
 * relationship id to its target path (the part within the xlsx zip).
 *
 * @param {string} xml The contents of the `xl/_rels/workbook.xml.rels` file.
 * @returns An object mapping relationship id to target path.
 */
function parseWorkbookRels(xml) {
  // Iterate every <Relationship .../> element
  const rels = Object.create(null)
  const re = /<Relationship\b([\s\S]*?)\/>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    // Record the Id -> Target mapping; ignore the Type and other attributes
    const attrs = m[1]
    const id = getAttr(attrs, 'Id')
    const target = getAttr(attrs, 'Target')
    if (id && target) {
      rels[id] = target
    }
  }
  return rels
}

/**
 * Scan a worksheet's XML and build a sparse cell map shaped like the SheetJS
 * worksheet object: `{ [cellRef]: { v }, '!ref': 'A1:Z99' }`. Skips empty
 * cells, error cells (`t='e'`), and numeric cells whose cached `<v>` value
 * is missing.
 *
 * @param {string} xml The contents of a `xl/worksheets/sheet*.xml` file.
 * @param {string[]} sharedStrings The shared-string table for resolving `t='s'` cells.
 * @returns The sparse cell map, including a `!ref` key if any cells were read.
 */
/**
 * Extract the text content of the `<v>` element in a cell body, tolerating
 * attributes on the tag (e.g. `<v xml:space="preserve">`). Returns undefined
 * when there is no `<v>` element (e.g. an uncalculated formula cell).
 *
 * @param {string} body The inner XML of a `<c>` element.
 * @returns The raw text between `<v...>` and `</v>`, or undefined.
 */
function getVText(body) {
  const m = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)
  return m ? m[1] : undefined
}

function parseSheetXml(xml, sharedStrings) {
  const cells = Object.create(null)

  // Match each <c .../> or <c ...>...</c> block. The attribute span is
  // non-greedy so self-closing cells (e.g. <c r="I4" s="1"/>) don't accidentally
  // swallow following cells.
  const cRe = /<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g
  let maxRow = -1
  let maxCol = -1
  let m
  while ((m = cRe.exec(xml)) !== null) {
    const attrs = m[1]
    const ref = getAttr(attrs, 'r')
    if (!ref) {
      continue
    }
    if (m[2] === '/>') {
      // empty cell
      continue
    }
    const body = m[3]
    if (!body) {
      continue
    }
    const t = getAttr(attrs, 't')

    let value
    if (t === 'inlineStr') {
      // Inline string: <is><t>...</t></is>
      const tStart = body.indexOf('<t')
      if (tStart < 0) {
        continue
      }
      const tOpenEnd = body.indexOf('>', tStart)
      const tEnd = body.indexOf('</t>', tOpenEnd)
      value = decodeXmlText(body.slice(tOpenEnd + 1, tEnd))
    } else if (t === 'e') {
      // Error cell, skip
      continue
    } else {
      // The remaining cell types carry their value in a <v> element, which
      // may have attributes (e.g. <v xml:space="preserve">). If <v> is
      // missing (e.g. an uncalculated formula), skip the cell so the
      // caller's missing-cell handling kicks in.
      const vText = getVText(body)
      if (vText === undefined) {
        continue
      }
      if (t === 's') {
        // Shared string: <v>N</v> where N indexes sharedStrings
        value = sharedStrings[parseInt(vText, 10)]
      } else if (t === 'str') {
        // Formula result as string: <v>...</v>
        value = decodeXmlText(vText)
      } else if (t === 'b') {
        // Boolean: <v>0</v> or <v>1</v>
        value = vText.charCodeAt(0) === 49 // '1'
      } else {
        // Numeric (t === 'n' or absent)
        const num = +vText
        if (Number.isNaN(num)) {
          continue
        }
        value = num
      }
    }

    // Store the cell under its A1 ref, matching the SheetJS sheet shape
    cells[ref] = { v: value }

    // Track the bounding row/col so we can synthesize the !ref range below
    const addr = decodeCell(ref)
    if (addr.r > maxRow) {
      maxRow = addr.r
    }
    if (addr.c > maxCol) {
      maxCol = addr.c
    }
  }

  // Expose the sheet's bounding range as !ref when any cells were read
  if (maxRow >= 0) {
    cells['!ref'] = `A1:${encodeCell({ c: maxCol, r: maxRow })}`
  }
  return cells
}
