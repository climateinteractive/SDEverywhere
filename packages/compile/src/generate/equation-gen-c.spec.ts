import { describe, expect, it } from 'vitest'

import { resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from '../model/model'
// import { default as VariableImpl } from '../model/variable'
import EquationGen from './equation-gen'

import { parseInlineVensimModel, type Variable } from '../_tests/test-support'

type ExtData = Map<string, Map<number, number>>

function readInlineModel(mdlContent: string, extData?: ExtData): Map<string, Variable> {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  const parsedModel = parseInlineVensimModel(mdlContent)
  Model.read(parsedModel, /*spec=*/ {}, extData, /*directData=*/ undefined, /*modelDir=*/ undefined, {
    stopAfterAnalyze: true
  })

  // Exclude the `Time` variable so that we have one less thing to check
  const map = new Map<string, Variable>()
  Model.variables.forEach(v => {
    if (v.varName !== '_time') {
      map.set(v.refId, v)
    }
  })
  return map
}

function genC(
  variable: Variable,
  mode: 'decl' | 'init-constants' | 'init-lookups' | 'init-levels' | 'eval' = 'eval',
  extData?: ExtData
): string[] {
  if (variable === undefined) {
    throw new Error(`variable is undefined`)
  }

  const lines = new EquationGen(variable, extData, /*directData=*/ undefined, mode, /*modelDir=*/ undefined).generate()

  // Strip the first comment line (containing the Vensim equation)
  if (lines.length > 0 && lines[0].trim().startsWith('//')) {
    lines.shift()
  }

  // Trim the remaining lines to remove extra whitespace
  return lines.map(line => line.trim())
}

describe('EquationGen (Vensim -> C)', () => {
  it('should work for simple equation with unary + op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = +x ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x;'])
  })

  it('should work for simple equation with unary - op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = -x ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = -_x;'])
  })

  it('should work for simple equation with binary + op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = x + 2 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x + 2.0;'])
  })

  it('should work for simple equation with binary - op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = x - 2 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x - 2.0;'])
  })

  it('should work for simple equation with binary * op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = x * 2 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x * 2.0;'])
  })

  it('should work for simple equation with binary / op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = x / 2 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x / 2.0;'])
  })

  it('should work for simple equation with binary ^ op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = x ^ 2 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = pow(_x, 2.0);'])
  })

  it('should work for simple equation with explicit parentheses', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = (x + 2) * 3 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = (_x + 2.0) * 3.0;'])
  })

  it('should work for conditional expression with = op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x = time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x == _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with <> op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x <> time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x != _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with < op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x < time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x < _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with <= op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x <= time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x <= _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with > op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x > time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x > _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with >= op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x >= time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x >= _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with :AND: op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x :AND: time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x && _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with :OR: op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(z :OR: time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_z || _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with :NOT: op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(:NOT: z, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(!_z, 1.0, 0.0);'])
  })

  it('should work for data variable definition', () => {
    const extData: ExtData = new Map([
      [
        '_x',
        new Map([
          [0, 0],
          [1, 2],
          [2, 5]
        ])
      ]
    ])
    const vars = readInlineModel(
      `
      x ~~|
    `,
      extData
    )
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'decl', extData)).toEqual(['double _x_data_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };'])
    expect(genC(vars.get('_x'), 'init-lookups', extData)).toEqual(['_x = __new_lookup(3, /*copy=*/false, _x_data_);'])
  })

  it('should work for lookup definition', () => {
    const vars = readInlineModel(`
      x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'decl')).toEqual([
      'double _x_data_[12] = { 0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3 };'
    ])
    expect(genC(vars.get('_x'), 'init-lookups')).toEqual(['_x = __new_lookup(6, /*copy=*/false, _x_data_);'])
  })

  it('should work for lookup call', () => {
    const vars = readInlineModel(`
      x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|
      y = x(2) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'decl')).toEqual([
      'double _x_data_[12] = { 0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3 };'
    ])
    expect(genC(vars.get('_x'), 'init-lookups')).toEqual(['_x = __new_lookup(6, /*copy=*/false, _x_data_);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _LOOKUP(_x, 2.0);'])
  })

  it('should work for constant definition (with dimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = 1 ~~|
      y = x[A2] ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'init-constants')).toEqual(['for (size_t i = 0; i < 3; i++) {', '_x[i] = 1.0;', '}'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[1];'])
  })

  it('should work for constant definition (with separate subscripts)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[A1] = 1 ~~|
      x[A2] = 2 ~~|
      x[A3] = 3 ~~|
      y = x[A2] ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[1];'])
  })

  it('should work for const list definition (1D)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      y = x[A2] ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[1];'])
  })

  it('should work for const list definition (2D)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2, B3 ~~|
      x[DimA, DimB] = 1, 2, 3; 4, 5, 6; ~~|
      y = x[A2, B3] ~~|
    `)
    expect(vars.size).toBe(7)
    expect(genC(vars.get('_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genC(vars.get('_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genC(vars.get('_x[_a1,_b3]'), 'init-constants')).toEqual(['_x[0][2] = 3.0;'])
    expect(genC(vars.get('_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 4.0;'])
    expect(genC(vars.get('_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 5.0;'])
    expect(genC(vars.get('_x[_a2,_b3]'), 'init-constants')).toEqual(['_x[1][2] = 6.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[1][2];'])
  })

  it('should work for ABS function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = ABS(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _ABS(_x);'])
  })

  it('should work for ACTIVE INITIAL function', () => {
    const vars = readInlineModel(`
      Initial Target Capacity = 1 ~~|
      Capacity = 2 ~~|
      Target Capacity = ACTIVE INITIAL(Capacity, Initial Target Capacity) ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_initial_target_capacity'))).toEqual(['_initial_target_capacity = 1.0;'])
    expect(genC(vars.get('_capacity'))).toEqual(['_capacity = 2.0;'])

    expect(genC(vars.get('_target_capacity'), 'init-levels')).toEqual(['_target_capacity = _initial_target_capacity;'])
    expect(genC(vars.get('_target_capacity'), 'eval')).toEqual(['_target_capacity = _capacity;'])
  })

  // TODO
  it.skip('should work for ALLOCATE AVAILABLE function')

  it('should work for COS function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = COS(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _COS(_x);'])
  })

  it('should work for DELAY1 function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = DELAY1(x, 5) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _x * 5.0;'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual(['__level1 = _INTEG(__level1, _x - _y);'])
    expect(genC(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = 5.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = (__level1 / __aux1);'])
  })

  it('should work for DELAY1I function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      init = 2 ~~|
      y = DELAY1I(x, 5, init) ~~|
    `)
    expect(vars.size).toBe(5)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_init'))).toEqual(['_init = 2.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _init * 5.0;'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual(['__level1 = _INTEG(__level1, _x - _y);'])
    expect(genC(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = 5.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = (__level1 / __aux1);'])
  })

  it('should work for DELAY3 function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = DELAY3(x, 5) ~~|
    `)
    expect(vars.size).toBe(9)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _x * ((5.0) / 3.0);'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual(['__level1 = _INTEG(__level1, _x - __aux1);'])
    expect(genC(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _x * ((5.0) / 3.0);'])
    expect(genC(vars.get('__level2'), 'eval')).toEqual(['__level2 = _INTEG(__level2, __aux1 - __aux2);'])
    expect(genC(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = _x * ((5.0) / 3.0);'])
    expect(genC(vars.get('__level3'), 'eval')).toEqual(['__level3 = _INTEG(__level3, __aux2 - __aux3);'])
    expect(genC(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = __level1 / ((5.0) / 3.0);'])
    expect(genC(vars.get('__aux2'), 'eval')).toEqual(['__aux2 = __level2 / ((5.0) / 3.0);'])
    expect(genC(vars.get('__aux3'), 'eval')).toEqual(['__aux3 = __level3 / ((5.0) / 3.0);'])
    expect(genC(vars.get('__aux4'), 'eval')).toEqual(['__aux4 = ((5.0) / 3.0);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = (__level3 / __aux4);'])
  })

  it('should work for DELAY3I function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      init = 2 ~~|
      y = DELAY3I(x, 5, init) ~~|
    `)
    expect(vars.size).toBe(10)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_init'))).toEqual(['_init = 2.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _init * ((5.0) / 3.0);'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual(['__level1 = _INTEG(__level1, _x - __aux1);'])
    expect(genC(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _init * ((5.0) / 3.0);'])
    expect(genC(vars.get('__level2'), 'eval')).toEqual(['__level2 = _INTEG(__level2, __aux1 - __aux2);'])
    expect(genC(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = _init * ((5.0) / 3.0);'])
    expect(genC(vars.get('__level3'), 'eval')).toEqual(['__level3 = _INTEG(__level3, __aux2 - __aux3);'])
    expect(genC(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = __level1 / ((5.0) / 3.0);'])
    expect(genC(vars.get('__aux2'), 'eval')).toEqual(['__aux2 = __level2 / ((5.0) / 3.0);'])
    expect(genC(vars.get('__aux3'), 'eval')).toEqual(['__aux3 = __level3 / ((5.0) / 3.0);'])
    expect(genC(vars.get('__aux4'), 'eval')).toEqual(['__aux4 = ((5.0) / 3.0);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = (__level3 / __aux4);'])
  })

  it('should work for DELAY FIXED function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      init = 2 ~~|
      y = DELAY FIXED(x, 5, init) ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_init'))).toEqual(['_init = 2.0;'])
    expect(genC(vars.get('_y'), 'init-levels')).toEqual([
      '_y = _init;\n  __fixed_delay1 = __new_fixed_delay(__fixed_delay1, 5.0, _init);'
    ])
    expect(genC(vars.get('_y'), 'eval')).toEqual(['_y = _DELAY_FIXED(_x, __fixed_delay1);'])
  })

  it('should work for DEPRECIATE STRAIGHTLINE function', () => {
    const vars = readInlineModel(`
      dtime = 20 ~~|
      Capacity Cost = 1000 ~~|
      New Capacity = 2000 ~~|
      stream = Capacity Cost * New Capacity ~~|
      Depreciated Amount = DEPRECIATE STRAIGHTLINE(stream, dtime, 1, 0) ~~|
    `)
    expect(vars.size).toBe(5)
    expect(genC(vars.get('_dtime'))).toEqual(['_dtime = 20.0;'])
    expect(genC(vars.get('_capacity_cost'))).toEqual(['_capacity_cost = 1000.0;'])
    expect(genC(vars.get('_new_capacity'))).toEqual(['_new_capacity = 2000.0;'])
    expect(genC(vars.get('_stream'))).toEqual(['_stream = _capacity_cost * _new_capacity;'])
    expect(genC(vars.get('_depreciated_amount'), 'init-levels')).toEqual([
      '_depreciated_amount = 0.0;\n  __depreciation1 = __new_depreciation(__depreciation1, _dtime, 0.0);'
    ])
    expect(genC(vars.get('_depreciated_amount'), 'eval')).toEqual([
      '_depreciated_amount = _DEPRECIATE_STRAIGHTLINE(_stream, __depreciation1);'
    ])
  })

  it('should work for ELMCOUNT function', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x = ELMCOUNT(DimA) ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'))).toEqual(['_x = 3;'])
  })

  it('should work for EXP function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = EXP(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _EXP(_x);'])
  })

  it('should work for GAME function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = GAME(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _GAME(_x);'])
  })

  it('should work for GET DATA BETWEEN TIMES function (mode=Interpolate)', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = GET DATA BETWEEN TIMES(x, Time, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _GET_DATA_BETWEEN_TIMES(_x, _time, 0.0);'])
  })

  it('should work for GET DATA BETWEEN TIMES function (mode=Forward)', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = GET DATA BETWEEN TIMES(x, Time, 1) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _GET_DATA_BETWEEN_TIMES(_x, _time, 1.0);'])
  })

  it('should work for GET DATA BETWEEN TIMES function (mode=Backward)', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = GET DATA BETWEEN TIMES(x, Time, -1) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _GET_DATA_BETWEEN_TIMES(_x, _time, -1.0);'])
  })

  // TODO: Ideally we would validate the mode argument during the analyze phase
  // it('should work for GET DATA BETWEEN TIMES function (with invalid mode)', () => {
  //   const vars = readInlineModel(`
  //     x = 1 ~~|
  //     y = GET DATA BETWEEN TIMES(x, Time, 42) ~~|
  //   `)
  //   expect(vars.size).toBe(2)
  //   expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
  //   expect(genC(vars.get('_y'))).toEqual(['_y = _GET_DATA_BETWEEN_TIMES(_x, _time, 42);'])
  // })

  // TODO
  it.skip('should work for GET DIRECT CONSTANTS function')

  // TODO
  it.skip('should work for GET DIRECT DATA function')

  // TODO
  it.skip('should work for GET DIRECT LOOKUPS function')

  // TODO
  it.skip('should work for GET DIRECT SUBSCRIPT function')

  it('should work for IF THEN ELSE function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(z > 0, 1, x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_z > 0.0, 1.0, _x);'])
  })

  it('should work for INITIAL function', () => {
    const vars = readInlineModel(`
      x = Time * 2 ~~|
      y = INITIAL(x) ~~|
    `)
    expect(vars.size).toBe(2)
    // TODO: When `x` is only referenced in an `INITIAL`, we currently evaluate it in `evalAux`
    // on every iteration even though it is unused.  Maybe we can detect that case and avoid
    // the redundant work.
    expect(genC(vars.get('_x'), 'init-levels')).toEqual(['_x = _time * 2.0;'])
    expect(genC(vars.get('_x'), 'eval')).toEqual(['_x = _time * 2.0;'])
    expect(genC(vars.get('_y'), 'init-levels')).toEqual(['_y = _x;'])
  })

  it('should work for INTEG function', () => {
    const vars = readInlineModel(`
      x = Time * 2 ~~|
      y = INTEG(x, 10) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'eval')).toEqual(['_x = _time * 2.0;'])
    expect(genC(vars.get('_y'), 'init-levels')).toEqual(['_y = 10.0;'])
    expect(genC(vars.get('_y'), 'eval')).toEqual(['_y = _INTEG(_y, _x);'])
  })

  it('should work for INTEGER function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = INTEGER(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _INTEGER(_x);'])
  })

  it('should work for LN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = LN(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _LN(_x);'])
  })

  it('should work for LOOKUP BACKWARD function', () => {
    const vars = readInlineModel(`
      x((0,0),(1,1),(2,2)) ~~|
      y = LOOKUP BACKWARD(x, 1.5) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'decl')).toEqual(['double _x_data_[6] = { 0.0, 0.0, 1.0, 1.0, 2.0, 2.0 };'])
    expect(genC(vars.get('_x'), 'init-lookups')).toEqual(['_x = __new_lookup(3, /*copy=*/false, _x_data_);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _LOOKUP_BACKWARD(_x, 1.5);'])
  })

  it('should work for LOOKUP FORWARD function', () => {
    const vars = readInlineModel(`
      x((0,0),(1,1),(2,2)) ~~|
      y = LOOKUP FORWARD(x, 1.5) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'decl')).toEqual(['double _x_data_[6] = { 0.0, 0.0, 1.0, 1.0, 2.0, 2.0 };'])
    expect(genC(vars.get('_x'), 'init-lookups')).toEqual(['_x = __new_lookup(3, /*copy=*/false, _x_data_);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _LOOKUP_FORWARD(_x, 1.5);'])
  })

  it('should work for MAX function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = MAX(x, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _MAX(_x, 0.0);'])
  })

  it('should work for MIN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = MIN(x, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _MIN(_x, 0.0);'])
  })

  it('should work for MODULO function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = MODULO(x, 2) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _MODULO(_x, 2.0);'])
  })

  it('should work for NPV function', () => {
    const vars = readInlineModel(`
      stream = 100 ~~|
      discount rate = 10 ~~|
      init = 0 ~~|
      factor = 2 ~~|
      y = NPV(stream, discount rate, init, factor) ~~|
    `)
    expect(vars.size).toBe(8)
    expect(genC(vars.get('_stream'))).toEqual(['_stream = 100.0;'])
    expect(genC(vars.get('_discount_rate'))).toEqual(['_discount_rate = 10.0;'])
    expect(genC(vars.get('_init'))).toEqual(['_init = 0.0;'])
    expect(genC(vars.get('_factor'))).toEqual(['_factor = 2.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = 1.0;'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = _INTEG(__level1, (-__level1 * _discount_rate) / (1.0 + _discount_rate * _time_step));'
    ])
    expect(genC(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _init;'])
    expect(genC(vars.get('__level2'), 'eval')).toEqual(['__level2 = _INTEG(__level2, _stream * __level1);'])
    expect(genC(vars.get('__aux1'), 'eval')).toEqual([
      '__aux1 = (__level2 + _stream * _time_step * __level1) * _factor;'
    ])
    expect(genC(vars.get('_y'))).toEqual(['_y = __aux1;'])
  })

  it('should work for POWER function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = POWER(x, 2) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _POWER(_x, 2.0);'])
  })

  it('should work for PULSE function', () => {
    const vars = readInlineModel(`
      x = 10 ~~|
      y = PULSE(x, 20) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 10.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _PULSE(_x, 20.0);'])
  })

  it('should work for PULSE TRAIN function', () => {
    const vars = readInlineModel(`
      first = 10 ~~|
      duration = 1 ~~|
      repeat = 5 ~~|
      last = 30 ~~|
      y = PULSE TRAIN(first, duration, repeat, last) ~~|
    `)
    expect(vars.size).toBe(5)
    expect(genC(vars.get('_first'))).toEqual(['_first = 10.0;'])
    expect(genC(vars.get('_duration'))).toEqual(['_duration = 1.0;'])
    expect(genC(vars.get('_repeat'))).toEqual(['_repeat = 5.0;'])
    expect(genC(vars.get('_last'))).toEqual(['_last = 30.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _PULSE_TRAIN(_first, _duration, _repeat, _last);'])
  })

  it('should work for QUANTUM function', () => {
    const vars = readInlineModel(`
      x = 1.9 ~~|
      y = QUANTUM(x, 10) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.9;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _QUANTUM(_x, 10.0);'])
  })

  it('should work for RAMP function', () => {
    const vars = readInlineModel(`
      slope = 100 ~~|
      start = 1 ~~|
      end = 10 ~~|
      y = RAMP(slope, start, end) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_slope'))).toEqual(['_slope = 100.0;'])
    expect(genC(vars.get('_start'))).toEqual(['_start = 1.0;'])
    expect(genC(vars.get('_end'))).toEqual(['_end = 10.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _RAMP(_slope, _start, _end);'])
  })

  it('should work for SAMPLE IF TRUE function', () => {
    const vars = readInlineModel(`
      initial = 10 ~~|
      input = 5 ~~|
      x = 1 ~~|
      y = SAMPLE IF TRUE(Time > x, input, initial) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_initial'))).toEqual(['_initial = 10.0;'])
    expect(genC(vars.get('_input'))).toEqual(['_input = 5.0;'])
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'), 'init-levels')).toEqual(['_y = _initial;'])
    expect(genC(vars.get('_y'), 'eval')).toEqual(['_y = _SAMPLE_IF_TRUE(_y, _time > _x, _input);'])
  })

  it('should work for SIN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = SIN(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _SIN(_x);'])
  })

  it('should work for SMOOTH function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = SMOOTH(input, delay) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_input'))).toEqual(['_input = 3.0 + _PULSE(10.0, 10.0);'])
    expect(genC(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _input;'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual(['__level1 = _INTEG(__level1, (_input - __level1) / _delay);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = __level1;'])
  })

  it('should work for SMOOTHI function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = SMOOTHI(input, delay, 5) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_input'))).toEqual(['_input = 3.0 + _PULSE(10.0, 10.0);'])
    expect(genC(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = 5.0;'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual(['__level1 = _INTEG(__level1, (_input - __level1) / _delay);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = __level1;'])
  })

  it('should work for SMOOTH3 function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = SMOOTH3(input, delay) ~~|
    `)
    expect(vars.size).toBe(6)
    expect(genC(vars.get('_input'))).toEqual(['_input = 3.0 + _PULSE(10.0, 10.0);'])
    expect(genC(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _input;'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = _INTEG(__level1, (_input - __level1) / (_delay / 3.0));'
    ])
    expect(genC(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _input;'])
    expect(genC(vars.get('__level2'), 'eval')).toEqual([
      '__level2 = _INTEG(__level2, (__level1 - __level2) / (_delay / 3.0));'
    ])
    expect(genC(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = _input;'])
    expect(genC(vars.get('__level3'), 'eval')).toEqual([
      '__level3 = _INTEG(__level3, (__level2 - __level3) / (_delay / 3.0));'
    ])
    expect(genC(vars.get('_y'))).toEqual(['_y = __level3;'])
  })

  it('should work for SMOOTH3I function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = SMOOTH3I(input, delay, 5) ~~|
    `)
    expect(vars.size).toBe(6)
    expect(genC(vars.get('_input'))).toEqual(['_input = 3.0 + _PULSE(10.0, 10.0);'])
    expect(genC(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = 5.0;'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = _INTEG(__level1, (_input - __level1) / (_delay / 3.0));'
    ])
    expect(genC(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = 5.0;'])
    expect(genC(vars.get('__level2'), 'eval')).toEqual([
      '__level2 = _INTEG(__level2, (__level1 - __level2) / (_delay / 3.0));'
    ])
    expect(genC(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = 5.0;'])
    expect(genC(vars.get('__level3'), 'eval')).toEqual([
      '__level3 = _INTEG(__level3, (__level2 - __level3) / (_delay / 3.0));'
    ])
    expect(genC(vars.get('_y'))).toEqual(['_y = __level3;'])
  })

  it('should work for SQRT function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = SQRT(x, 2) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _SQRT(_x, 2.0);'])
  })

  it('should work for STEP function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = STEP(x, 10) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _STEP(_x, 10.0);'])
  })

  it('should work for TREND function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = TREND(x, 10, 2) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _x / (1.0 + 2.0 * 10.0);'])
    expect(genC(vars.get('__level1'), 'eval')).toEqual(['__level1 = _INTEG(__level1, (_x - __level1) / 10.0);'])
    expect(genC(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = _ZIDZ(_x - __level1, 10.0 * _ABS(__level1));'])
    expect(genC(vars.get('_y'))).toEqual(['_y = __aux1;'])
  })

  // TODO
  it.skip('should work for VECTOR ELM MAP function')

  // TODO
  it.skip('should work for VECTOR SELECT function')

  // TODO
  it.skip('should work for VECTOR SORT ORDER function')

  it('should work for VMAX function (with full range)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      y = VMAX(x[DimA!]) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genC(vars.get('_y'))).toEqual([
      'double __t1 = -DBL_MAX;',
      'for (size_t u = 0; u < 3; u++) {',
      '__t1 = fmax(__t1, _x[u]);',
      '}',
      '_y = __t1;'
    ])
  })

  it('should work for VMAX function (with partial range)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A1, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      y = VMAX(x[SubA!]) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genC(vars.get('_y'))).toEqual([
      'double __t1 = -DBL_MAX;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t1 = fmax(__t1, _x[_suba[u]]);',
      '}',
      '_y = __t1;'
    ])
  })

  it('should work for VMIN function (with full range)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      y = VMIN(x[DimA!]) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genC(vars.get('_y'))).toEqual([
      'double __t1 = DBL_MAX;',
      'for (size_t u = 0; u < 3; u++) {',
      '__t1 = fmin(__t1, _x[u]);',
      '}',
      '_y = __t1;'
    ])
  })

  it('should work for VMIN function (with partial range)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A1, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      y = VMIN(x[SubA!]) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genC(vars.get('_y'))).toEqual([
      'double __t1 = DBL_MAX;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t1 = fmin(__t1, _x[_suba[u]]);',
      '}',
      '_y = __t1;'
    ])
  })

  it('should work for WITH LOOKUP function', () => {
    const vars = readInlineModel(`
      y = WITH LOOKUP(Time, ( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) )) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('__lookup1'), 'decl')).toEqual([
      'double __lookup1_data_[12] = { 0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3 };'
    ])
    expect(genC(vars.get('__lookup1'), 'init-lookups')).toEqual([
      '__lookup1 = __new_lookup(6, /*copy=*/false, __lookup1_data_);'
    ])
    expect(genC(vars.get('_y'))).toEqual(['_y = _WITH_LOOKUP(_time, __lookup1);'])
  })

  it('should work for XIDZ function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = XIDZ(x, 2, 3) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _XIDZ(_x, 2.0, 3.0);'])
  })

  it('should work for ZIDZ function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = ZIDZ(x, 2) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _ZIDZ(_x, 2.0);'])
  })
})
