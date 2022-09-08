// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import sanitizeHtml from 'sanitize-html'

import type { StringKey } from './spec-types/types'

interface StringRecord {
  key: StringKey
  str: string
  layout: string
  context: string
  grouping: string
  appendedStringKeys?: string[]
}

// type LangCode = string
// type StringMap = Map<StringKey, string>
// type XlatMap = Map<LangCode, StringMap>

export class Strings {
  private readonly records: Map<StringKey, StringRecord> = new Map()

  add(
    key: StringKey,
    str: string,
    layout: string,
    context: string,
    grouping?: string,
    appendedStringKeys?: string[]
  ): StringKey {
    checkInvisibleCharacters(str || '')

    if (!key) {
      throw new Error(`Must provide a key for the string: ${str}`)
    }

    const validKey = /^[0-9a-z_]+$/.test(key)
    if (!validKey) {
      throw new Error(`String key contains undesirable characters: ${key}`)
    }

    if (!layout) {
      throw new Error(`Must provide a layout (e.g., 'layout1' or 'not-translated')`)
    }

    if (!context) {
      throw new Error(`Must provide a context string: key=${key}, string=${str}`)
    }

    if (context === 'Core') {
      // For core strings from the `strings.csv` file, leave the context empty for now
      // (indicating this is a "general" string with no particular context)
      context = undefined
    }

    if (!grouping) {
      // Use 'primary' if grouping is not specified
      grouping = 'primary'
    }

    // Convert some HTML tags and entities to UTF-8
    if (str) {
      str = str.trim()
      str = htmlToUtf8(str)
    }

    // If the trimmed string is empty, do not create a new key, and return an empty string
    if (!str) {
      return ''
    }

    if (this.records.has(key)) {
      // TODO: For now, allow certain keys to appear more than once; we only add the string once
      const prefix = key.substring(0, key.indexOf('__'))
      switch (prefix) {
        case 'input_range':
        case 'input_units':
        case 'graph_dataset_label':
        case 'graph_xaxis_label':
        case 'graph_yaxis_label':
          break
        default:
          throw new Error(`More than one string with key=${key}`)
      }
    }

    // Add the string record
    this.records.set(key, {
      key,
      str,
      layout,
      context,
      grouping,
      appendedStringKeys
    })

    return key
  }

  // /**
  //  * Write a `<lang>.js` file containing translated strings for each supported language.
  //  *
  //  * @param context The build context.
  //  * @param dstDir The `strings` directory in the core package.
  //  * @param xlatLangs The set of languages that are configured for translation.
  //  */
  // writeJsFiles(context: BuildContext, dstDir: string, xlatLangs: Map<LangCode, LangSpec>): void {
  //   writeLangJsFiles(context, dstDir, this.records, xlatLangs)
  // }
}

function checkInvisibleCharacters(s: string): void {
  if (s.includes('\u00a0')) {
    const e = s.replace(/\u00a0/g, 'HERE')
    throw new Error(
      `String contains one or more non-breaking space characters (to fix, replace "HERE" with a normal space):\n  ${e}`
    )
  }
}

function htmlSubscriptAndSuperscriptToUtf8(s: string): string {
  // Subscripts have a straight mapping in Unicode (U+208x)
  s = s.replace(/<sub>(\d)<\/sub>/gi, (_match, p1) => String.fromCharCode(0x2080 + Number(p1)))

  // Superscripts don't have a straight mapping, so it's easier to just
  // replace the ones we care about.  There are some others (12, 18, -5)
  // that don't render well when replaced with their Unicode superscript
  // equivalents, so we will leave those with HTML `sup` tags.
  s = s.replace(/<sup>6<\/sup>/gi, '\u2076')
  s = s.replace(/<sup>9<\/sup>/gi, '\u2079')

  return s
}

export function htmlToUtf8(orig: string): string {
  // Replace common HTML tags and entities with UTF-8 characters
  let s = orig

  // Convert `sub` and `sup` tags
  s = htmlSubscriptAndSuperscriptToUtf8(s)

  let clean = sanitizeHtml(s, {
    allowedTags: ['a', 'b', 'br', 'i', 'em', 'li', 'p', 'strong', 'sub', 'sup', 'ul'],
    allowedAttributes: {
      a: ['href', 'target', 'rel']
    }
  })

  // XXX: The `sanitize-html` package converts `&nbsp;` to the Unicode
  // equivalent (`U+00A0`); we will convert it back to `&nbsp;` to make
  // it more obvious and easier to view in a translation tool
  clean = clean.replace(/\u00a0/gi, '&nbsp;')

  // if (clean !== s) {
  //   console.log(`IN: ${orig}`)
  //   console.log(`O1: ${s}`)
  //   console.log(`O2: ${clean}\n`)
  // }

  return clean
}

/**
 * Generate a string key for the given string by replacing special characters with
 * underscores and converting other characters to lowercase.
 */
export function genStringKey(prefix: string, s: string): string {
  checkInvisibleCharacters(s)

  let key = s.toLowerCase()
  key = key.replace(/ – /g, '_') // e.g. 'Data – Satellite' (with emdash) -> 'data_satellite'
  key = key.replace(/ \/ /g, '_per_') // e.g. 'CO2 / TJ' -> 'co2_per_tj'
  key = key.replace(/ /g, '_')
  key = key.replace('₂', '2') // e.g. 'CO₂' -> 'co2'
  key = key.replace('<sub>2</sub>', '2') // e.g. 'CO<sub>2</sub>' -> 'co2'
  key = key.replace(/\$\//g, 'dollars_per_') // e.g. '$/year' -> 'dollars_per_year'
  key = key.replace(/%\//g, 'pct_per_') // e.g. '%/year' -> 'pct_per_year'
  key = key.replace(/\//g, '_per_') // e.g. 'CO2/TJ' -> 'co2_per_tj'
  key = key.replace(/º/g, 'degrees_') // e.g. 'ºC' -> 'degrees_c'
  key = key.replace(/\*/g, '_') // e.g. 'CO2*year' -> 'co2_year'
  key = key.replace(/%/g, 'pct') // e.g. '%' -> 'pct'
  key = key.replace(/\$/g, 'dollars') // e.g. '$' -> 'dollars'
  key = key.replace(/&/g, 'and') // e.g. 'Actions & Outcomes' -> 'actions_and_outcomes'
  key = key.replace(/\//g, 'per') // e.g. 'Gigatons CO2/year' -> 'gigatons_co2_per_year'
  key = key.replace(/:/g, '') // e.g. 'Net:' -> 'net'
  key = key.replace(/\./g, '') // e.g. 'U.S. Units' -> 'us_units'
  key = key.replace(/-/g, '_') // e.g. 'some-thing' -> 'some_thing'
  key = key.replace(/—/g, '_') // endash to underscore
  key = key.replace(/–/g, '_') // emdash to underscore
  key = key.replace(/,/g, '')
  key = key.replace(/\(/g, '')
  key = key.replace(/\)/g, '')
  key = key.replace(/\\n/g, '')
  key = key.replace(/<br>/g, '_')
  return `${prefix}__${key}`
}
