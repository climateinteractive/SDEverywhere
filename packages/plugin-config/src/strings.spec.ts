// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { htmlToUtf8 } from './strings'

describe('htmlToUtf8', () => {
  it('should convert numeric subscript tags to Unicode characters', () => {
    expect(htmlToUtf8('CO<sub>2</sub> Concentration')).toBe('CO₂ Concentration')
    expect(htmlToUtf8('x<sub>0</sub> and x<sub>9</sub>')).toBe('x₀ and x₉')
  })

  it('should convert the supported superscript tags to Unicode characters', () => {
    expect(htmlToUtf8('10<sup>6</sup> tons')).toBe('10⁶ tons')
    expect(htmlToUtf8('10<sup>9</sup> people')).toBe('10⁹ people')
  })

  it('should leave other superscript tags as HTML', () => {
    // Note that only the `6` and `9` superscripts are converted; the others don't
    // render well as Unicode characters, so they are left as `sup` tags
    expect(htmlToUtf8('Area (m<sup>2</sup>)')).toBe('Area (m<sup>2</sup>)')
  })

  it('should preserve allowed formatting tags', () => {
    expect(htmlToUtf8('<b>Bold</b> and <i>italic</i>')).toBe('<b>Bold</b> and <i>italic</i>')
    expect(htmlToUtf8('<em>em</em> and <strong>strong</strong>')).toBe('<em>em</em> and <strong>strong</strong>')
    expect(htmlToUtf8('Line one<br>Line two')).toBe('Line one<br />Line two')
  })

  it('should preserve allowed paragraph and list tags', () => {
    expect(htmlToUtf8('<p>Para</p><ul><li>a</li><li>b</li></ul>')).toBe('<p>Para</p><ul><li>a</li><li>b</li></ul>')
  })

  it('should preserve allowed attributes on anchor tags', () => {
    const link = '<a href="https://example.com" target="_blank" rel="noopener">More info</a>'
    expect(htmlToUtf8(link)).toBe(link)
  })

  it('should remove disallowed attributes from anchor tags', () => {
    expect(htmlToUtf8('<a href="https://example.com" title="t" onclick="x()">link</a>')).toBe(
      '<a href="https://example.com">link</a>'
    )
  })

  it('should remove `javascript:` URIs from anchor hrefs', () => {
    expect(htmlToUtf8('<a href="javascript:alert(1)">bad</a>')).toBe('<a>bad</a>')
  })

  it('should remove disallowed tags but keep their text content', () => {
    expect(htmlToUtf8('<div>div</div>')).toBe('div')
  })

  it('should remove script tags along with their content', () => {
    expect(htmlToUtf8('<script>alert(1)</script>')).toBe('')
    expect(htmlToUtf8('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('should remove tags that can carry executable URI attributes', () => {
    // These tags are not in the allowed list, so the attributes that were the subject
    // of CVE-2026-53606 (`action`, `formaction`, `data`, `poster`, `background`) can
    // never reach the output
    expect(htmlToUtf8('<form action="javascript:alert(1)"></form>')).toBe('')
    expect(htmlToUtf8('<button formaction="javascript:alert(1)">x</button>')).toBe('x')
    expect(htmlToUtf8('<object data="javascript:alert(1)"></object>')).toBe('')
    expect(htmlToUtf8('<video poster="javascript:alert(1)"></video>')).toBe('')
    expect(htmlToUtf8('<body background="javascript:alert(1)">')).toBe('')
  })

  it('should convert non-breaking spaces back to entities', () => {
    // The `sanitize-html` package converts `&nbsp;` to the Unicode equivalent, and
    // `htmlToUtf8` converts it back so that it is easier to see in a translation tool
    expect(htmlToUtf8('Nbsp&nbsp;here')).toBe('Nbsp&nbsp;here')
    expect(htmlToUtf8(`Nbsp\u00a0here`)).toBe('Nbsp&nbsp;here')
  })

  it('should leave escaped entities alone', () => {
    expect(htmlToUtf8('Energy &amp; Industry')).toBe('Energy &amp; Industry')
    expect(htmlToUtf8('a &lt; b')).toBe('a &lt; b')
  })

  it('should handle plain and empty strings', () => {
    expect(htmlToUtf8('plain text')).toBe('plain text')
    expect(htmlToUtf8('')).toBe('')
  })
})
