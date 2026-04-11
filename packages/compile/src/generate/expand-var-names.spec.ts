import { describe, expect, it } from 'vitest'

import { resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from '../model/model'

import { parseInlineVensimModel } from '../_tests/test-support'

import { expandVarNames } from './expand-var-names'

function readInlineModel(mdlContent: string) {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  const parsedModel = parseInlineVensimModel(mdlContent)
  Model.read(parsedModel, /*spec=*/ {}, /*extData=*/ undefined, /*directData=*/ undefined, /*modelDir=*/ undefined, {
    reduceVariables: false
  })
}

describe('expandVarNames', () => {
  it('should return a single name for a non-subscripted variable', () => {
    readInlineModel(`
      "X Y Z" = 10 ~~|
    `)
    expect(expandVarNames(false)).toEqual(['"X Y Z"', 'Time'])
    expect(expandVarNames(true)).toEqual(['__x_y_z_', '_time'])
  })

  it('should return names for a subscripted 1D variable that uses an EXCEPT clause', () => {
    readInlineModel(`
      DimA: A1, A2, A3 ~~|
      X[DimA] :EXCEPT: [A1] = 1 ~~|
    `)
    expect(expandVarNames(false)).toEqual(['Time', 'X[A2]', 'X[A3]'])
    expect(expandVarNames(true)).toEqual(['_time', '_x[1]', '_x[2]'])
  })

  it('should return names for a subscripted 1D variable that uses a disjoint EXCEPT clause', () => {
    readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      X[SubA] :EXCEPT: [A1] = 1 ~~|
    `)
    expect(expandVarNames(false)).toEqual(['Time', 'X[A2]', 'X[A3]'])
    expect(expandVarNames(true)).toEqual(['_time', '_x[1]', '_x[2]'])
  })

  it('should return names for a subscripted 1D variable that refers to subdimensions', () => {
    readInlineModel(`
      DimA: A1, SubA, A6 ~~|
      SubA: SubA1, SubA2 ~~|
      SubA1: A2, A3 ~~|
      SubA2: A4, A5 ~~|
      X[DimA] = 1 ~~|
    `)
    expect(expandVarNames(false)).toEqual(['Time', 'X[A1]', 'X[A2]', 'X[A3]', 'X[A4]', 'X[A5]', 'X[A6]'])
    expect(expandVarNames(true)).toEqual(['_time', '_x[0]', '_x[1]', '_x[2]', '_x[3]', '_x[4]', '_x[5]'])
  })

  it('should return names for a subscripted 2D non-apply-to-all variable', () => {
    readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      X[DimA, DimB] = 1, 2; 3, 4; ~~|
    `)
    expect(expandVarNames(false)).toEqual(['Time', 'X[A1,B1]', 'X[A1,B2]', 'X[A2,B1]', 'X[A2,B2]'])
    expect(expandVarNames(true)).toEqual(['_time', '_x[0][0]', '_x[0][1]', '_x[1][0]', '_x[1][1]'])
  })

  it('should return names for a subscripted 2D apply-to-all variable', () => {
    readInlineModel(`
      DimA: A1, A2 ~~|
      From DimA: DimA ~~|
      To DimA: DimA ~~|
      X[From DimA, To DimA] = 0 ~~|
    `)
    expect(expandVarNames(false)).toEqual(['Time', 'X[A1,A1]', 'X[A1,A2]', 'X[A2,A1]', 'X[A2,A2]'])
    expect(expandVarNames(true)).toEqual(['_time', '_x[0][0]', '_x[0][1]', '_x[1][0]', '_x[1][1]'])
  })
})
