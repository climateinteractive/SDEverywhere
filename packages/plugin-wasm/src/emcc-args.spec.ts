// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { normalizeEmccArgs } from './emcc-args'

describe('normalizeEmccArgs', () => {
  it('should leave simple arguments unchanged', () => {
    expect(normalizeEmccArgs(['-Wall', '-Os', '-sSTRICT=1'])).toEqual(['-Wall', '-Os', '-sSTRICT=1'])
  })

  it('should remove the space from a `-s` argument that includes both the flag and the option', () => {
    expect(normalizeEmccArgs(['-s STRICT=1', '-s MALLOC=emmalloc'])).toEqual(['-sSTRICT=1', '-sMALLOC=emmalloc'])
  })

  it('should preserve an option value that contains an equals sign or quotes', () => {
    expect(normalizeEmccArgs([`-s ENVIRONMENT='web,webview,worker'`])).toEqual([`-sENVIRONMENT='web,webview,worker'`])
    expect(normalizeEmccArgs([`-s EXPORTED_RUNTIME_METHODS=['cwrap']`])).toEqual([
      `-sEXPORTED_RUNTIME_METHODS=['cwrap']`
    ])
  })

  it('should preserve a bare `-s` flag that is followed by a separate option argument', () => {
    expect(normalizeEmccArgs(['-s', 'STRICT=1'])).toEqual(['-s', 'STRICT=1'])
  })

  it('should remove leading and trailing whitespace from each argument', () => {
    expect(normalizeEmccArgs(['-Os ', '  -sSTRICT=1', ' -s MALLOC=emmalloc '])).toEqual([
      '-Os',
      '-sSTRICT=1',
      '-sMALLOC=emmalloc'
    ])
  })

  it('should remove empty arguments', () => {
    expect(normalizeEmccArgs(['-Wall', '', '   ', '-Os'])).toEqual(['-Wall', '-Os'])
  })

  it('should not alter a non-`-s` argument that contains a space', () => {
    expect(normalizeEmccArgs(['--pre-js build/extras.js'])).toEqual(['--pre-js build/extras.js'])
  })

  it('should handle an empty array', () => {
    expect(normalizeEmccArgs([])).toEqual([])
  })
})
