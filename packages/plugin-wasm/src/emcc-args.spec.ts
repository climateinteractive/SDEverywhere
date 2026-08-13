// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { defaultEmccArgs, normalizeEmccArgs } from './emcc-args'

describe('defaultEmccArgs', () => {
  it('should return the default set of arguments', () => {
    expect(defaultEmccArgs()).toEqual([
      '-Wall',
      '-Os',
      '-sSTRICT=1',
      '-sMALLOC=emmalloc',
      '-sFILESYSTEM=0',
      '-sMODULARIZE=1',
      '-sSINGLE_FILE=1',
      '-sEXPORT_ES6=1',
      '-sUSE_ES6_IMPORT_META=0',
      `-sENVIRONMENT='web,webview,worker'`,
      `-sEXPORTED_FUNCTIONS=['_malloc','_free','_getInitialTime','_getFinalTime','_getSaveper','_setLookup','_runModelWithBuffers']`,
      `-sEXPORTED_RUNTIME_METHODS=['cwrap']`
    ])
  })

  it('should use the no-space notation for each `-s` argument', () => {
    for (const arg of defaultEmccArgs()) {
      expect(arg).not.toMatch(/\s/)
    }
  })

  it('should return a new array each time so that the caller can safely modify it', () => {
    const args = defaultEmccArgs()
    args.push('-sASSERTIONS=1')
    expect(defaultEmccArgs()).not.toContain('-sASSERTIONS=1')
  })
})

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
