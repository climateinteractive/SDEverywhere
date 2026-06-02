// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { decodeCell, decodeCol, decodeRow, encodeCell } from './xlsx.js'

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
