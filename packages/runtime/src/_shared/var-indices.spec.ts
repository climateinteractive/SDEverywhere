// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { createLookupDef, type LookupDef } from './lookup-def'
import type { VarSpec } from './types'
import {
  decodeLookups,
  encodeLookups,
  encodeVarIndices,
  getEncodedLookupBufferLengths,
  getEncodedVarIndicesLength
} from './var-indices'

const varSpecs: VarSpec[] = [
  { varIndex: 1 },
  { varIndex: 2 },
  { varIndex: 3, subscriptIndices: [1, 2, 3, 4] },
  { varIndex: 4, subscriptIndices: [1, 2] }
]

describe('getEncodedVarIndicesLength', () => {
  it('should return the correct length', () => {
    expect(getEncodedVarIndicesLength(varSpecs)).toBe(15)
  })
})

describe('encodeVarIndices', () => {
  it('should encode the correct values', () => {
    const array = new Int32Array(20)
    encodeVarIndices(varSpecs, array)
    expect(array).toEqual(
      new Int32Array([
        4, // variable count

        1, // var0 index
        0, // var0 subscript count

        2, // var1 index
        0, // var1 subscript count

        3, // var2 index
        4, // var2 subscript count
        1, // var2 sub0 index
        2, // var2 sub1 index
        3, // var2 sub2 index
        4, // var2 sub3 index

        4, // var3 index
        2, // var2 subscript count
        1, // var3 sub0 index
        2, // var3 sub1 index

        // zero padding
        0,
        0,
        0,
        0,
        0
      ])
    )
  })
})

const p = (x: number, y: number) => ({ x, y })
const lookupDefs: LookupDef[] = [
  createLookupDef({ varSpec: { varIndex: 1 } }, [p(0, 0), p(1, 1)]),
  createLookupDef({ varSpec: { varIndex: 2, subscriptIndices: [1, 2] } }, [p(0, 0), p(1, 1)])
]

describe('getEncodedLookupBufferLengths', () => {
  it('should return the correct length', () => {
    const { lookupIndicesLength, lookupsLength } = getEncodedLookupBufferLengths(lookupDefs)
    expect(lookupIndicesLength).toBe(11)
    expect(lookupsLength).toBe(8)
  })
})

describe('encodeLookups and decodeLookups', () => {
  it('should encode and decode the correct values', () => {
    const lookupIndices = new Int32Array(13)
    const lookupValues = new Float64Array(10)
    encodeLookups(lookupDefs, lookupIndices, lookupValues)

    expect(lookupIndices).toEqual(
      new Int32Array([
        2, // variable count

        1, // var0 index
        0, // var0 subscript count
        0, // var0 data offset
        4, // var0 data length

        2, // var1 index
        2, // var1 subscript count
        1, // var1 sub0 index
        2, // var1 sub1 index
        4, // var1 data offset
        4, // var1 data length

        // zero padding
        0,
        0
      ])
    )

    expect(lookupValues).toEqual(
      new Float64Array([
        // var0 data
        0, 0, 1, 1,

        // var1 data
        0, 0, 1, 1,

        // zero padding
        0, 0
      ])
    )

    const decodedLookupDefs = decodeLookups(lookupIndices, lookupValues)
    expect(decodedLookupDefs).toEqual(lookupDefs)
  })
})
