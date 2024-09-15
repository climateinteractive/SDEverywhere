import { describe, expect, it } from 'vitest'

import { resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'

import { parseInlineVensimModel } from '../_tests/test-support'

import { expandVar } from './expand-var-instances'

function readInlineModel(mdlContent: string) {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  const parsedModel = parseInlineVensimModel(mdlContent)
  Model.read(parsedModel, /*spec=*/ {}, /*extData=*/ undefined, /*directData=*/ undefined, /*modelDir=*/ undefined, {
    reduceVariables: false
  })

  return Model.variables
}

const instance = (varName: string, subIndices?: number[]) => {
  return {
    varName,
    subIndices
  }
}

describe('expandVar', () => {
  it('should return a single instance for a non-subscripted variable', () => {
    const vars = readInlineModel(`
      "X Y Z" = 10 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([instance('"X Y Z"')])
  })

  it('should return instances for a simple subscripted non-apply-to-all 1D variable', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      X[DimA] = 1, 2 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([instance('X[A1]', [0])])
    expect(expandVar(vars[1])).toEqual([instance('X[A2]', [1])])
  })

  it('should return instances for a simple subscripted apply-to-all 1D variable', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      X[DimA] = 1 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([instance('X[A1]', [0]), instance('X[A2]', [1])])
  })

  it('should return instances for a subscripted 1D variable that uses an EXCEPT clause', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      X[DimA] :EXCEPT: [A1] = 1 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([instance('X[A2]', [1])])
    expect(expandVar(vars[1])).toEqual([instance('X[A3]', [2])])
  })

  it('should return instances for a subscripted 1D variable that uses a disjoint EXCEPT clause', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      X[SubA] :EXCEPT: [A1] = 1 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([instance('X[A2]', [1])])
    expect(expandVar(vars[1])).toEqual([instance('X[A3]', [2])])
  })

  it('should return instances for a subscripted 1D variable that refers to subdimensions', () => {
    const vars = readInlineModel(`
      DimA: A1, SubA, A6 ~~|
      SubA: SubA1, SubA2 ~~|
      SubA1: A2, A3 ~~|
      SubA2: A4, A5 ~~|
      X[DimA] = 1 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([
      instance('X[A1]', [0]),
      instance('X[A2]', [1]),
      instance('X[A3]', [2]),
      instance('X[A4]', [3]),
      instance('X[A5]', [4]),
      instance('X[A6]', [5])
    ])
  })

  it('should return instances for a subscripted 2D non-apply-to-all variable (const list)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      X[DimA, DimB] = 1, 2; 3, 4; ~~|
    `)
    expect(expandVar(vars[0])).toEqual([instance('X[A1,B1]', [0, 0])])
    expect(expandVar(vars[1])).toEqual([instance('X[A1,B2]', [0, 1])])
    expect(expandVar(vars[2])).toEqual([instance('X[A2,B1]', [1, 0])])
    expect(expandVar(vars[3])).toEqual([instance('X[A2,B2]', [1, 1])])
  })

  it('should return instances for a subscripted 2D non-apply-to-all variable (separate constant definitions)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      X[A1, DimB] = 1, 2 ~~|
      X[A2, B1] = 3 ~~|
      X[A2, B2] = 4 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([instance('X[A1,B1]', [0, 0])])
    expect(expandVar(vars[1])).toEqual([instance('X[A1,B2]', [0, 1])])
    expect(expandVar(vars[2])).toEqual([instance('X[A2,B1]', [1, 0])])
    expect(expandVar(vars[3])).toEqual([instance('X[A2,B2]', [1, 1])])
  })

  it('should return instances for a subscripted 2D apply-to-all variable', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      From DimA: DimA ~~|
      To DimA: DimA ~~|
      X[From DimA, To DimA] = 0 ~~|
    `)
    expect(expandVar(vars[0])).toEqual([
      instance('X[A1,A1]', [0, 0]),
      instance('X[A1,A2]', [0, 1]),
      instance('X[A2,A1]', [1, 0]),
      instance('X[A2,A2]', [1, 1])
    ])
  })
})
