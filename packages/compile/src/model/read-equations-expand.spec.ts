import { describe, expect, it } from 'vitest'

import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'
import { matchingRhsRefIds } from './read-equations-expand'

import { parseInlineVensimModel } from '../_tests/test-support'

/**
 * Set up subscript/dimension state from an inline Vensim model text containing
 * only subscript range definitions.  This is the minimal setup needed for
 * `indexNamesForSubscript` to work in the tests below.
 */
function setupSubscripts(modelText: string): void {
  // XXX: This is needed because subscripts are held in module-level storage
  resetSubscriptsAndDimensions()
  const parsedModel = parseInlineVensimModel(modelText)
  Model.read(parsedModel, /*spec=*/ {}, /*extData=*/ undefined, /*directData=*/ undefined, /*modelDir=*/ undefined, {
    stopAfterResolveSubscripts: true
  })
}

/**
 * Build a minimal mock RHS variable instance with the given variable ID and subscripts.
 * The refId is synthesized from the two, e.g., `('_x', ['_a1', '_b1'])` produces
 * `'_x[_a1,_b1]'`.
 */
function rhsInstance(varId: string, subscripts: string[]): { subscripts: string[]; refId: string } {
  const refId = `${varId}[${subscripts.join(',')}]`
  return { subscripts, refId }
}

describe('matchingRhsRefIds', () => {
  it('should return all instances when LHS and RHS are both apply-to-all on a single dimension', () => {
    setupSubscripts(`DimA: A1, A2, A3 ~~|`)

    // The LHS references `_dima` at a single position; the RHS has two instances that
    // together cover all of `_dima`, so both should be returned.
    const result = matchingRhsRefIds(
      ['_dima'],
      [rhsInstance('_x', ['_a1']), rhsInstance('_x', ['_a2']), rhsInstance('_x', ['_a3'])]
    )
    expect(result).toEqual(['_x[_a1]', '_x[_a2]', '_x[_a3]'])
  })

  it('should return only the matching instance when the LHS references a specific index', () => {
    setupSubscripts(`DimA: A1, A2, A3 ~~|`)

    // The LHS accesses only `_a2`, so only that RHS instance should be returned.
    const result = matchingRhsRefIds(
      ['_a2'],
      [rhsInstance('_x', ['_a1']), rhsInstance('_x', ['_a2']), rhsInstance('_x', ['_a3'])]
    )
    expect(result).toEqual(['_x[_a2]'])
  })

  it('should return an empty array when no RHS instance overlaps with the LHS', () => {
    setupSubscripts(`DimA: A1, A2, A3 ~~|`)

    const result = matchingRhsRefIds(['_a1'], [rhsInstance('_x', ['_a2']), rhsInstance('_x', ['_a3'])])
    expect(result).toEqual([])
  })

  it('should return an empty array when there are no RHS instances', () => {
    setupSubscripts(`DimA: A1, A2 ~~|`)

    const result = matchingRhsRefIds(['_dima'], [])
    expect(result).toEqual([])
  })

  it('should match at every subscript position (multi-dimensional)', () => {
    setupSubscripts(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      DimC: C1, C2 ~~|
    `)

    // The LHS is `_dima,_c2,_dimb` (mimicking a `y[DimA,DimB,DimC] :EXCEPT: [DimA,DimB,C1]`
    // situation where the LHS is separated and the separated instance covers only `_c2`).
    // Only the RHS instance at `_c2` should match.
    const result = matchingRhsRefIds(
      ['_dima', '_c2', '_dimb'],
      [rhsInstance('_x', ['_dima', '_c1', '_dimb']), rhsInstance('_x', ['_dima', '_c2', '_dimb'])]
    )
    expect(result).toEqual(['_x[_dima,_c2,_dimb]'])
  })

  it('should require overlap at every position (no single mismatch)', () => {
    setupSubscripts(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
    `)

    // The LHS accesses `_a1,_b1`; the RHS instances have mismatches in at least one
    // position, so none should be returned.
    const result = matchingRhsRefIds(
      ['_a1', '_b1'],
      [rhsInstance('_x', ['_a2', '_b1']), rhsInstance('_x', ['_a1', '_b2']), rhsInstance('_x', ['_a2', '_b2'])]
    )
    expect(result).toEqual([])
  })

  it('should return multiple instances when a dimension position overlaps with each', () => {
    setupSubscripts(`
      DimA: A1, A2 ~~|
      DimB: B1, B2, B3 ~~|
    `)

    // LHS is fully apply-to-all; RHS is separated on DimB, so all three instances match.
    const result = matchingRhsRefIds(
      ['_dima', '_dimb'],
      [rhsInstance('_x', ['_dima', '_b1']), rhsInstance('_x', ['_dima', '_b2']), rhsInstance('_x', ['_dima', '_b3'])]
    )
    expect(result).toEqual(['_x[_dima,_b1]', '_x[_dima,_b2]', '_x[_dima,_b3]'])
  })

  it('should handle subdimensions on the LHS', () => {
    setupSubscripts(`
      DimA: A1, A2, A3, A4 ~~|
      SubA: A2, A3 ~~|
    `)

    // The LHS accesses the subdimension `_suba` (which covers only `_a2` and `_a3`),
    // so only the RHS instances at those indices should be returned.
    const result = matchingRhsRefIds(
      ['_suba'],
      [rhsInstance('_x', ['_a1']), rhsInstance('_x', ['_a2']), rhsInstance('_x', ['_a3']), rhsInstance('_x', ['_a4'])]
    )
    expect(result).toEqual(['_x[_a2]', '_x[_a3]'])
  })

  it('should handle subdimensions on the RHS', () => {
    setupSubscripts(`
      DimA: A1, A2, A3, A4 ~~|
      SubA: A2, A3 ~~|
    `)

    // The LHS accesses `_a3` (a specific index); only the RHS instance whose subdimension
    // contains `_a3` should be returned.
    const result = matchingRhsRefIds(
      ['_a3'],
      [rhsInstance('_x', ['_a1']), rhsInstance('_x', ['_suba']), rhsInstance('_x', ['_a4'])]
    )
    expect(result).toEqual(['_x[_suba]'])
  })

  it('should return refIds in sorted order', () => {
    setupSubscripts(`DimA: A1, A2, A3 ~~|`)

    // Provide RHS instances in an unsorted order; the result should be sorted.
    const result = matchingRhsRefIds(
      ['_dima'],
      [rhsInstance('_x', ['_a3']), rhsInstance('_x', ['_a1']), rhsInstance('_x', ['_a2'])]
    )
    expect(result).toEqual(['_x[_a1]', '_x[_a2]', '_x[_a3]'])
  })

  it('should efficiently handle large dimension sizes', () => {
    // Generate a model with three large dimensions, similar in spirit to the original
    // performance bug (36 × 56 × 22).  The old implementation was O(product of sizes)
    // which would make this test slow; the new implementation is O(sum of sizes).
    const dimASize = 40
    const dimBSize = 60
    const dimCSize = 25
    const dimASubs = Array.from({ length: dimASize }, (_, i) => `A${i + 1}`)
    const dimBSubs = Array.from({ length: dimBSize }, (_, i) => `B${i + 1}`)
    const dimCSubs = Array.from({ length: dimCSize }, (_, i) => `C${i + 1}`)
    setupSubscripts(`
      DimA: ${dimASubs.join(', ')} ~~|
      DimB: ${dimBSubs.join(', ')} ~~|
      DimC: ${dimCSubs.join(', ')} ~~|
    `)

    // One RHS instance covering the entire cartesian product, plus a decoy instance
    // that has a mismatch at a single position.
    const rhsVarInstances = [
      rhsInstance('_x', ['_dima', '_dimb', '_dimc']),
      rhsInstance('_x', ['_dima', '_dimb', '_c1'])
    ]

    // LHS accesses `_c2`, so only the first instance should match (the decoy has
    // only `_c1` at position 2).
    const result = matchingRhsRefIds(['_dima', '_dimb', '_c2'], rhsVarInstances)
    expect(result).toEqual(['_x[_dima,_dimb,_dimc]'])
  })
})
