// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { subMapping, subRange } from '../ast/ast-types'

import { parseVensimSubscriptRange } from './parse-vensim-subscript-range'
import type { VensimParseContext } from './vensim-parse-context'

describe('parseVensimSubscriptRange', () => {
  it('should parse a subscript range with explicit subscripts', () => {
    const range = `DimA: A1, A2, A3 ~~|`
    expect(parseVensimSubscriptRange(range)).toEqual(subRange('DimA', 'DimA', ['A1', 'A2', 'A3']))
  })

  it('should parse a subscript range with a single numeric range', () => {
    const range = `DimA: (A1-A3) ~~|`
    expect(parseVensimSubscriptRange(range)).toEqual(subRange('DimA', 'DimA', ['A1', 'A2', 'A3']))
  })

  // TODO: The antlr grammar doesn't yet support multiple ranges, but it is supported in Vensim:
  //   https://www.vensim.com/documentation/22090.html
  // it('should parse a subscript range with a multiple numeric range', () => {
  //   const range = `DimA: (A1-A3),A5,(A7-A10) ~~|`
  //   expect(parseVensimSubscriptRange(range)).toEqual(subRange('DimA', 'DimA', ['A1', 'A2', 'A3']))
  // })

  it('should parse a subscript range with one mapping (to dimension with explicit individual subscripts)', () => {
    // DimA: A1, A2, A3 -> DimB ~~|
    // DimB: B1, B2, B3 ~~|
    const range = `DimA: A1, A2, A3 -> DimB ~~|`
    expect(parseVensimSubscriptRange(range)).toEqual(subRange('DimA', 'DimA', ['A1', 'A2', 'A3'], [subMapping('DimB')]))
  })

  it('should parse a subscript range with one mapping (to dimension with explicit mix of dimensions and subscripts)', () => {
    // DimA: A1, A2, A3 ~~|
    // SubA: A1, A2 ~~|
    // DimB: B1, B2 -> (DimA: SubA, A3) ~~|
    const range = `DimB: B1, B2 -> (DimA: SubA, A3) ~~|`
    expect(parseVensimSubscriptRange(range)).toEqual(
      subRange('DimB', 'DimB', ['B1', 'B2'], [subMapping('DimA', ['SubA', 'A3'])])
    )
  })

  it('should parse a subscript range with one mapping (to dimension without explicit subscripts)', () => {
    // DimA: SubA, A3 -> DimB ~~|
    // SubA: A1, A2 ~~|
    // DimB: B1, B2, B3 ~~|
    const range = `DimA: SubA, A3 -> DimB ~~|`
    expect(parseVensimSubscriptRange(range)).toEqual(subRange('DimA', 'DimA', ['SubA', 'A3'], [subMapping('DimB')]))
  })

  it('should parse a subscript range with two mappings', () => {
    // DimA: A1, A2, A3 -> (DimB: B3, B2, B1), DimC ~~|
    // DimB: B1, B2, B3 ~~|
    // DimC: C1, C2, C3 ~~|
    const range = `DimA: A1, A2, A3 -> (DimB: B3, B2, B1), DimC ~~|`
    expect(parseVensimSubscriptRange(range)).toEqual(
      subRange('DimA', 'DimA', ['A1', 'A2', 'A3'], [subMapping('DimB', ['B3', 'B2', 'B1']), subMapping('DimC')])
    )
  })

  it('should parse a subscript range alias (<-> operator)', () => {
    // DimA <-> DimB ~~|
    // DimB: B1, B2, B3 ~~|
    const range = `DimA <-> DimB ~~|`
    expect(parseVensimSubscriptRange(range)).toEqual(subRange('DimA', 'DimB', []))
  })

  it('should throw an error if an unsupported function is used in subscript range definition', () => {
    const range = `DimA: UNKNOWN FUNC(1, 2, 3) ~~|`
    expect(() => parseVensimSubscriptRange(range)).toThrow(
      `Only 'GET DIRECT SUBSCRIPT' calls are supported in subscript range definitions, but saw 'UNKNOWN FUNC'`
    )
  })

  it('should parse a subscript range defined with GET DIRECT SUBSCRIPTS', () => {
    const context: VensimParseContext = {
      getDirectSubscripts: (/*fileName, tab, firstCell, lastCell, prefix*/) => {
        // TODO: Verify args
        return ['A1', 'A2', 'A3']
      }
    }
    const range = `DimA: GET DIRECT SUBSCRIPT('a_subs.csv', ',', 'A2', 'A', '') ~~|`
    expect(parseVensimSubscriptRange(range, context)).toEqual(subRange('DimA', 'DimA', ['A1', 'A2', 'A3']))
  })
})
