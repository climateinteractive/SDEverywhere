import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { readXlsx, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from '../model/model'
// import { default as VariableImpl } from '../model/variable'
import EquationGen from './equation-gen'

import { parseInlineVensimModel, sampleModelDir, type Variable } from '../_tests/test-support'
import { generateEquation } from './gen-equation'

type ExtData = Map<string, Map<number, number>>
type DirectDataSpec = Map<string, string>

function readInlineModel(mdlContent: string, opts?: { modelDir?: string; extData?: ExtData }): Map<string, Variable> {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  const parsedModel = parseInlineVensimModel(mdlContent, opts?.modelDir)
  Model.read(parsedModel, /*spec=*/ {}, opts?.extData, /*directData=*/ undefined, opts?.modelDir, {
    reduceVariables: false
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
  opts?: {
    modelDir?: string
    extData?: ExtData
    directDataSpec?: DirectDataSpec
  }
): string[] {
  if (variable === undefined) {
    throw new Error(`variable is undefined`)
  }

  const directData = new Map()
  if (opts?.modelDir && opts?.directDataSpec) {
    for (const [file, xlsxFilename] of opts.directDataSpec.entries()) {
      const xlsxPath = path.join(opts.modelDir, xlsxFilename)
      directData.set(file, readXlsx(xlsxPath))
    }
  }

  let lines: string[]
  if (process.env.SDE_PRIV_USE_NEW_PARSE === '1') {
    lines = generateEquation(variable, mode, opts?.extData, directData, opts?.modelDir)
  } else {
    // TODO: The `flat` call is only needed because the legacy EquationGen adds a nested array unnecessarily
    // in `generateDirectDataInit`
    lines = new EquationGen(variable, opts?.extData, directData, mode, opts?.modelDir).generate().flat()
    // XXX: The legacy EquationGen sometimes appends code with a line break instead of returning a separate
    // string for each line, so for now, split on newlines and treat them as separate lines for better
    // compatibility with the new `generateEquation`
    lines = lines.map(line => line.split('\n')).flat()
  }

  // Strip the first comment line (containing the Vensim equation)
  if (lines.length > 0 && lines[0].trim().startsWith('//')) {
    lines.shift()
  }

  // Trim the remaining lines to remove extra whitespace
  return lines.map(line => line.trim())
}

describe('generateEquation (Vensim -> C)', () => {
  it('should work for simple equation with unary :NOT: op', () => {
    const vars = readInlineModel(`
    x = 1 ~~|
    y = :NOT: x ~~|
  `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = !_x;'])
  })

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
    // Note that we use `ABS(1)` here to circumvent the constant conditional optimization
    // code (the legacy `ExprReader` doesn't currently optimize function calls).  This
    // allows us to verify the generated code without the risk of it being optimized away.
    const vars = readInlineModel(`
      x = ABS(1) ~~|
      y = IF THEN ELSE(x :OR: time, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = _ABS(1.0);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x || _time, 1.0, 0.0);'])
  })

  it('should work for conditional expression with :NOT: op', () => {
    // Note that we use `ABS(1)` here to circumvent the constant conditional optimization
    // code (the legacy `ExprReader` doesn't currently optimize function calls).  This
    // allows us to verify the generated code without the risk of it being optimized away.
    const vars = readInlineModel(`
      x = ABS(1) ~~|
      y = IF THEN ELSE(:NOT: x, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = _ABS(1.0);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(!_x, 1.0, 0.0);'])
  })

  it('should work for expression using :NA: keyword', () => {
    const vars = readInlineModel(`
      x = Time ~~|
      y = IF THEN ELSE(x <> :NA:, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = _time;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x != _NA_, 1.0, 0.0);'])
  })

  it('should work for conditional expression with reference to dimension', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x = 1 ~~|
      y[DimA] = IF THEN ELSE(DimA = x, 1, 0) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_y[i] = _IF_THEN_ELSE((i + 1) == _x, 1.0, 0.0);',
      '}'
    ])
  })

  it('should work for conditional expression with reference to dimension and subscript/index', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      y[DimA] = IF THEN ELSE(DimA = A2, 1, 0) ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_y'))).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_y[i] = _IF_THEN_ELSE((i + 1) == 2, 1.0, 0.0);',
      '}'
    ])
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
      y = x * 10 ~~|
      `,
      { extData }
    )
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'decl', { extData })).toEqual([
      'double _x_data_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };'
    ])
    expect(genC(vars.get('_x'), 'init-lookups', { extData })).toEqual([
      '_x = __new_lookup(3, /*copy=*/false, _x_data_);'
    ])
    expect(genC(vars.get('_y'), 'eval', { extData })).toEqual(['_y = _LOOKUP(_x, _time) * 10.0;'])
  })

  it('should work for data variable definition (1D)', () => {
    const extData: ExtData = new Map([
      [
        '_x[_a1]',
        new Map([
          [0, 0],
          [1, 2],
          [2, 5]
        ])
      ],
      [
        '_x[_a2]',
        new Map([
          [0, 10],
          [1, 12],
          [2, 15]
        ])
      ]
    ])
    const vars = readInlineModel(
      `
      DimA: A1, A2 ~~|
      x[DimA] ~~|
      y[DimA] = x[DimA] * 10 ~~|
      z = y[A2] ~~|
      `,
      {
        extData
      }
    )
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_x'), 'decl', { extData })).toEqual([
      'double _x_data__0_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };',
      'double _x_data__1_[6] = { 0.0, 10.0, 1.0, 12.0, 2.0, 15.0 };'
    ])
    expect(genC(vars.get('_x'), 'init-lookups', { extData })).toEqual([
      '_x[0] = __new_lookup(3, /*copy=*/false, _x_data__0_);',
      '_x[1] = __new_lookup(3, /*copy=*/false, _x_data__1_);'
    ])
    expect(genC(vars.get('_y'), 'eval', { extData })).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_y[i] = _LOOKUP(_x[i], _time) * 10.0;',
      '}'
    ])
    expect(genC(vars.get('_z'), 'eval', { extData })).toEqual(['_z = _y[1];'])
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

  it('should work for lookup definition (one dimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[A1]( (0,10), (1,20) ) ~~|
      x[A2]( (0,30), (1,40) ) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x[_a1]'), 'decl')).toEqual(['double _x_data__0_[4] = { 0.0, 10.0, 1.0, 20.0 };'])
    expect(genC(vars.get('_x[_a2]'), 'decl')).toEqual(['double _x_data__1_[4] = { 0.0, 30.0, 1.0, 40.0 };'])
    expect(genC(vars.get('_x[_a1]'), 'init-lookups')).toEqual(['_x[0] = __new_lookup(2, /*copy=*/false, _x_data__0_);'])
    expect(genC(vars.get('_x[_a2]'), 'init-lookups')).toEqual(['_x[1] = __new_lookup(2, /*copy=*/false, _x_data__1_);'])
  })

  it('should work for lookup definition (two dimensions)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      x[A1,B1]( (0,10), (1,20) ) ~~|
      x[A1,B2]( (0,30), (1,40) ) ~~|
      x[A2,B1]( (0,50), (1,60) ) ~~|
      x[A2,B2]( (0,70), (1,80) ) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1,_b1]'), 'decl')).toEqual(['double _x_data__0__0_[4] = { 0.0, 10.0, 1.0, 20.0 };'])
    expect(genC(vars.get('_x[_a1,_b2]'), 'decl')).toEqual(['double _x_data__0__1_[4] = { 0.0, 30.0, 1.0, 40.0 };'])
    expect(genC(vars.get('_x[_a2,_b1]'), 'decl')).toEqual(['double _x_data__1__0_[4] = { 0.0, 50.0, 1.0, 60.0 };'])
    expect(genC(vars.get('_x[_a2,_b2]'), 'decl')).toEqual(['double _x_data__1__1_[4] = { 0.0, 70.0, 1.0, 80.0 };'])
    expect(genC(vars.get('_x[_a1,_b1]'), 'init-lookups')).toEqual([
      '_x[0][0] = __new_lookup(2, /*copy=*/false, _x_data__0__0_);'
    ])
    expect(genC(vars.get('_x[_a1,_b2]'), 'init-lookups')).toEqual([
      '_x[0][1] = __new_lookup(2, /*copy=*/false, _x_data__0__1_);'
    ])
    expect(genC(vars.get('_x[_a2,_b1]'), 'init-lookups')).toEqual([
      '_x[1][0] = __new_lookup(2, /*copy=*/false, _x_data__1__0_);'
    ])
    expect(genC(vars.get('_x[_a2,_b2]'), 'init-lookups')).toEqual([
      '_x[1][1] = __new_lookup(2, /*copy=*/false, _x_data__1__1_);'
    ])
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

  it('should work for lookup call (with one dimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[A1]( [(0,0)-(2,2)], (0,0),(2,1.3) ) ~~|
      x[A2]( [(0,0)-(2,2)], (0,0.5),(2,1.5) ) ~~|
      y = x[A1](2) ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_x[_a1]'), 'decl')).toEqual(['double _x_data__0_[4] = { 0.0, 0.0, 2.0, 1.3 };'])
    expect(genC(vars.get('_x[_a2]'), 'decl')).toEqual(['double _x_data__1_[4] = { 0.0, 0.5, 2.0, 1.5 };'])
    expect(genC(vars.get('_x[_a1]'), 'init-lookups')).toEqual(['_x[0] = __new_lookup(2, /*copy=*/false, _x_data__0_);'])
    expect(genC(vars.get('_x[_a2]'), 'init-lookups')).toEqual(['_x[1] = __new_lookup(2, /*copy=*/false, _x_data__1_);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _LOOKUP(_x[0], 2.0);'])
  })

  it('should work for constant definition (with one dimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = 1 ~~|
      y = x[A2] ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'init-constants')).toEqual(['for (size_t i = 0; i < 3; i++) {', '_x[i] = 1.0;', '}'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[1];'])
  })

  it('should work for constant definition (with two dimensions)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      DimC: C1, C2 ~~|
      x[DimC, SubA] = 1 ~~|
      x[DimC, DimA] :EXCEPT: [DimC, SubA] = 2 ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_x[_a1,_dimc]'), 'init-constants')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_x[0][i] = 2.0;',
      '}'
    ])
    expect(genC(vars.get('_x[_a2,_dimc]'), 'init-constants')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_x[1][i] = 1.0;',
      '}'
    ])
    expect(genC(vars.get('_x[_a3,_dimc]'), 'init-constants')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_x[2][i] = 1.0;',
      '}'
    ])
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

  it('should work for const list definition (2D, dimensions in normal/alphabetized order)', () => {
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

  it('should work for const list definition (2D, dimensions not in normal/alphabetized order)', () => {
    const vars = readInlineModel(`
      DimB: B1, B2, B3 ~~|
      DimA: A1, A2 ~~|
      x[DimB, DimA] = 1, 2; 3, 4; 5, 6; ~~|
      y = x[B3, A2] ~~|
      z = x[B2, A1] ~~|
    `)
    expect(vars.size).toBe(8)
    // Note that the compiler currently normalizes the subscripts (orders them alphabetically
    // by dimension name), so the order of subscripts may be surprising here
    expect(genC(vars.get(/*B1,A1*/ '_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genC(vars.get(/*B1,A2*/ '_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 2.0;'])
    expect(genC(vars.get(/*B2,A1*/ '_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 3.0;'])
    expect(genC(vars.get(/*B2,A2*/ '_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 4.0;'])
    expect(genC(vars.get(/*B3,A1*/ '_x[_a1,_b3]'), 'init-constants')).toEqual(['_x[0][2] = 5.0;'])
    expect(genC(vars.get(/*B2,A2*/ '_x[_a2,_b3]'), 'init-constants')).toEqual(['_x[1][2] = 6.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[1][2];'])
    expect(genC(vars.get('_z'))).toEqual(['_z = _x[0][1];'])
  })

  it('should work for const list definition (2D separated, dimensions in normal/alphabetized order)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      DimB: B1, B2 ~~|
      x[A1, DimB] = 1,2 ~~|
      x[A2, DimB] = 3,4 ~~|
      x[A3, DimB] = 5,6 ~~|
      y = x[A3, B2] ~~|
    `)
    expect(vars.size).toBe(7)
    expect(genC(vars.get('_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genC(vars.get('_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genC(vars.get('_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 3.0;'])
    expect(genC(vars.get('_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 4.0;'])
    expect(genC(vars.get('_x[_a3,_b1]'), 'init-constants')).toEqual(['_x[2][0] = 5.0;'])
    expect(genC(vars.get('_x[_a3,_b2]'), 'init-constants')).toEqual(['_x[2][1] = 6.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[2][1];'])
  })

  it('should work for const list definition (2D separated, dimensions not in normal/alphabetized order)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      DimB: B1, B2 ~~|
      x[B1, DimA] = 1,2,3 ~~|
      x[B2, DimA] = 4,5,6 ~~|
      y = x[B2, A3] ~~|
    `)
    expect(vars.size).toBe(7)
    // Note that the compiler currently normalizes the subscripts (orders them alphabetically
    // by dimension name), so the order of subscripts may be surprising here
    expect(genC(vars.get(/*B1,A1*/ '_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genC(vars.get(/*B1,A2*/ '_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 2.0;'])
    expect(genC(vars.get(/*B1,A3*/ '_x[_a3,_b1]'), 'init-constants')).toEqual(['_x[2][0] = 3.0;'])
    expect(genC(vars.get(/*B2,A1*/ '_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 4.0;'])
    expect(genC(vars.get(/*B2,A2*/ '_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 5.0;'])
    expect(genC(vars.get(/*B2,A3*/ '_x[_a3,_b2]'), 'init-constants')).toEqual(['_x[2][1] = 6.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[2][1];'])
  })

  it('should work for equation with one dimension', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[DimA] = 1, 2 ~~|
      y[DimA] = (x[DimA] + 2) * MIN(0, x[DimA]) ~~|
      z = y[A2] ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_y'))).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_y[i] = (_x[i] + 2.0) * _MIN(0.0, _x[i]);',
      '}'
    ])
    expect(genC(vars.get('_z'))).toEqual(['_z = _y[1];'])
  })

  it('should work for equation with two dimensions', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      x[DimA, DimB] = 1, 2; 3, 4; ~~|
      y[DimA, DimB] = (x[DimA, DimB] + 2) * MIN(0, x[DimA, DimB]) ~~|
      z = y[A2, B1] ~~|
    `)
    expect(vars.size).toBe(6)
    expect(genC(vars.get('_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genC(vars.get('_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genC(vars.get('_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 3.0;'])
    expect(genC(vars.get('_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 4.0;'])
    expect(genC(vars.get('_y'))).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      'for (size_t j = 0; j < 2; j++) {',
      '_y[i][j] = (_x[i][j] + 2.0) * _MIN(0.0, _x[i][j]);',
      '}',
      '}'
    ])
    expect(genC(vars.get('_z'))).toEqual(['_z = _y[1][0];'])
  })

  it('should work for equation that uses a regular dimension name (trivial case) in an expression', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      Selected A Index = 1 ~~|
      x[DimA] = IF THEN ELSE ( DimA = Selected A Index, 1, 0 ) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_selected_a_index'), 'init-constants')).toEqual(['_selected_a_index = 1.0;'])
    expect(genC(vars.get('_x'))).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_x[i] = _IF_THEN_ELSE((i + 1) == _selected_a_index, 1.0, 0.0);',
      '}'
    ])
  })

  it('should work for equation that uses a regular dimension name (non-trivial case) in an expression', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A1, A3 ~~|
      Selected A Index = 1 ~~|
      x[SubA] = IF THEN ELSE ( SubA = Selected A Index, 1, 0 ) ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_selected_a_index'), 'init-constants')).toEqual(['_selected_a_index = 1.0;'])
    expect(genC(vars.get('_x[_a1]'))).toEqual(['_x[0] = _IF_THEN_ELSE((0 + 1) == _selected_a_index, 1.0, 0.0);'])
    expect(genC(vars.get('_x[_a3]'))).toEqual(['_x[2] = _IF_THEN_ELSE((2 + 1) == _selected_a_index, 1.0, 0.0);'])
  })

  it('should work for equation that uses a mapped dimension name in an expression', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 -> DimA ~~|
      x[DimA] = DimB ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'))).toEqual(['for (size_t i = 0; i < 2; i++) {', '_x[i] = (__map_dimb_dima[i] + 1);', '}'])
  })

  it('should work for variables that rely on subscript mappings', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 -> DimB, DimC ~~|
      DimB: B1, B2 ~~|
      DimC: C1, C2 ~~|
      a[DimA] = 10, 20 ~~|
      b[DimB] = 1, 2 ~~|
      c[DimC] = a[DimA] + 1 ~~|
      d = b[B2] ~~|
      e = c[C1] ~~|
    `)
    expect(vars.size).toBe(7)
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 10.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 20.0;'])
    expect(genC(vars.get('_b[_b1]'), 'init-constants')).toEqual(['_b[0] = 1.0;'])
    expect(genC(vars.get('_b[_b2]'), 'init-constants')).toEqual(['_b[1] = 2.0;'])
    expect(genC(vars.get('_b[_b1]'), 'eval')).toEqual(['_b[0] = 1.0;'])
    expect(genC(vars.get('_b[_b2]'), 'eval')).toEqual(['_b[1] = 2.0;'])
    expect(genC(vars.get('_c'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_c[i] = _a[__map_dima_dimc[i]] + 1.0;',
      '}'
    ])
    expect(genC(vars.get('_d'), 'eval')).toEqual(['_d = _b[1];'])
    expect(genC(vars.get('_e'), 'eval')).toEqual(['_e = _c[0];'])
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

  it('should work for ALLOCATE AVAILABLE function', () => {
    const vars = readInlineModel(`
      branch: Boston, Dayton, Fresno ~~|
      pprofile: ptype, ppriority ~~|
      supply available = 200 ~~|
      demand[branch] = 500,300,750 ~~|
      priority[Boston,pprofile] = 1,5 ~~|
      priority[Dayton,pprofile] = 1,7 ~~|
      priority[Fresno,pprofile] = 1,3 ~~|
      shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[branch,ptype], supply available) ~~|
    `)
    expect(vars.size).toBe(11)
    expect(genC(vars.get('_supply_available'))).toEqual(['_supply_available = 200.0;'])
    expect(genC(vars.get('_demand[_boston]'))).toEqual(['_demand[0] = 500.0;'])
    expect(genC(vars.get('_demand[_dayton]'))).toEqual(['_demand[1] = 300.0;'])
    expect(genC(vars.get('_demand[_fresno]'))).toEqual(['_demand[2] = 750.0;'])
    expect(genC(vars.get('_priority[_boston,_ptype]'))).toEqual(['_priority[0][0] = 1.0;'])
    expect(genC(vars.get('_priority[_boston,_ppriority]'))).toEqual(['_priority[0][1] = 5.0;'])
    expect(genC(vars.get('_priority[_dayton,_ptype]'))).toEqual(['_priority[1][0] = 1.0;'])
    expect(genC(vars.get('_priority[_dayton,_ppriority]'))).toEqual(['_priority[1][1] = 7.0;'])
    expect(genC(vars.get('_priority[_fresno,_ptype]'))).toEqual(['_priority[2][0] = 1.0;'])
    expect(genC(vars.get('_priority[_fresno,_ppriority]'))).toEqual(['_priority[2][1] = 3.0;'])
    expect(genC(vars.get('_shipments'))).toEqual([
      'double* __t1 = _ALLOCATE_AVAILABLE(_demand, (double*)_priority, _supply_available, 3);',
      'for (size_t i = 0; i < 3; i++) {',
      '_shipments[i] = __t1[_branch[i]];',
      '}'
    ])
  })

  it('should work for ARCCOS function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = ARCCOS(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _ARCCOS(_x);'])
  })

  it('should work for ARCSIN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = ARCSIN(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _ARCSIN(_x);'])
  })

  it('should work for ARCTAN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = ARCTAN(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _ARCTAN(_x);'])
  })

  it('should work for COS function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = COS(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _COS(_x);'])
  })

  // TODO: Subscripted variants
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

  it('should work for DELAY3I function (one dimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[DimA] = 1, 2 ~~|
      init[DimA] = 2, 3 ~~|
      y[DimA] = DELAY3I(x[DimA], 5, init[DimA]) ~~|
    `)
    expect(vars.size).toBe(12)
    expect(genC(vars.get('_x[_a1]'))).toEqual(['_x[0] = 1.0;'])
    expect(genC(vars.get('_x[_a2]'))).toEqual(['_x[1] = 2.0;'])
    expect(genC(vars.get('_init[_a1]'))).toEqual(['_init[0] = 2.0;'])
    expect(genC(vars.get('_init[_a2]'))).toEqual(['_init[1] = 3.0;'])
    expect(genC(vars.get('__level1'), 'init-levels')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__level1[i] = _init[i] * ((5.0) / 3.0);',
      '}'
    ])
    expect(genC(vars.get('__level1'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__level1[i] = _INTEG(__level1[i], _x[i] - __aux1[i]);',
      '}'
    ])
    expect(genC(vars.get('__level2'), 'init-levels')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__level2[i] = _init[i] * ((5.0) / 3.0);',
      '}'
    ])
    expect(genC(vars.get('__level2'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__level2[i] = _INTEG(__level2[i], __aux1[i] - __aux2[i]);',
      '}'
    ])
    expect(genC(vars.get('__level3'), 'init-levels')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__level3[i] = _init[i] * ((5.0) / 3.0);',
      '}'
    ])
    expect(genC(vars.get('__level3'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__level3[i] = _INTEG(__level3[i], __aux2[i] - __aux3[i]);',
      '}'
    ])
    expect(genC(vars.get('__aux1'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__aux1[i] = __level1[i] / ((5.0) / 3.0);',
      '}'
    ])
    expect(genC(vars.get('__aux2'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__aux2[i] = __level2[i] / ((5.0) / 3.0);',
      '}'
    ])
    expect(genC(vars.get('__aux3'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__aux3[i] = __level3[i] / ((5.0) / 3.0);',
      '}'
    ])
    expect(genC(vars.get('__aux4'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '__aux4[i] = ((5.0) / 3.0);',
      '}'
    ])
    expect(genC(vars.get('_y'))).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_y[i] = (__level3[i] / __aux4[i]);',
      '}'
    ])
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
      '_y = _init;',
      '__fixed_delay1 = __new_fixed_delay(__fixed_delay1, 5.0, _init);'
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
      '_depreciated_amount = 0.0;',
      '__depreciation1 = __new_depreciation(__depreciation1, _dtime, 0.0);'
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

  // TODO: We do not currently have full support for the GAME function, so skip this test for now
  it.skip('should work for GAME function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = GAME(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _GAME(_x);'])
  })

  it('should work for GAMMA LN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = GAMMA LN(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _GAMMA_LN(_x);'])
  })

  describe('should work for GET DATA BETWEEN TIMES function', () => {
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

    function verify(mode: number): void {
      const vars = readInlineModel(
        `
        x ~~|
        y = GET DATA BETWEEN TIMES(x, Time, ${mode}) ~~|
      `,
        { extData }
      )
      expect(vars.size).toBe(2)
      expect(genC(vars.get('_x'), 'decl', { extData })).toEqual([
        'double _x_data_[6] = { 0.0, 0.0, 1.0, 2.0, 2.0, 5.0 };'
      ])
      expect(genC(vars.get('_x'), 'init-lookups', { extData })).toEqual([
        '_x = __new_lookup(3, /*copy=*/false, _x_data_);'
      ])
      expect(genC(vars.get('_y'))).toEqual([`_y = _GET_DATA_BETWEEN_TIMES(_x, _time, ${mode}.0);`])
    }

    it('with mode == Interpolate', () => {
      verify(0)
    })

    it('with mode == Forward', () => {
      verify(1)
    })

    it('with mode == Backward', () => {
      verify(-1)
    })

    // TODO: Ideally we would validate the mode argument during the analyze phase
    // it('with invalid mode', () => {
    //   verify(42) // should throw error
    // })
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

  it('should work for GET DIRECT CONSTANTS function (single value from named csv file)', () => {
    // TODO: Add new csv files for this test so that we don't have to rely on
    // other test models
    const modelDir = sampleModelDir('directconst')
    const vars = readInlineModel(`
      x = GET DIRECT CONSTANTS('data/a.csv', ',', 'B2') ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'init-constants', { modelDir })).toEqual(['_x = 2050.0;'])
  })

  it('should work for GET DIRECT CONSTANTS function (single value from named xlsx file)', () => {
    const modelDir = sampleModelDir('directconst')
    const vars = readInlineModel(`
      x = GET DIRECT CONSTANTS('data/a.xlsx', 'a', 'B2') ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'init-constants', { modelDir })).toEqual(['_x = 2050.0;'])
  })

  it('should work for GET DIRECT CONSTANTS function (single value from tagged xlsx file)', () => {
    const modelDir = sampleModelDir('directconst')
    const opts = {
      modelDir,
      directDataSpec: new Map([['?a', 'data/a.xlsx']])
    }
    const vars = readInlineModel(`
      x = GET DIRECT CONSTANTS('?a', 'a', 'B2') ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'init-constants', opts)).toEqual(['_x = 2050.0;'])
  })

  it('should work for GET DIRECT CONSTANTS function (single value with lowercase cell reference)', () => {
    const modelDir = sampleModelDir('directconst')
    const vars = readInlineModel(`
      x = GET DIRECT CONSTANTS('data/a.csv', ',', 'b2') ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'init-constants', { modelDir })).toEqual(['_x = 2050.0;'])
  })

  it('should throw error for GET DIRECT CONSTANTS function (with invalid cell reference)', () => {
    const modelDir = sampleModelDir('directconst')
    const vars = readInlineModel(`
      x = GET DIRECT CONSTANTS('data/a.csv', ',', '++') ~~|
    `)
    expect(vars.size).toBe(1)
    expect(() => genC(vars.get('_x'), 'init-constants', { modelDir })).toThrow(
      `Failed to parse 'cell' argument for GET DIRECT CONSTANTS call for _x: ++`
    )
  })

  it('should work for GET DIRECT CONSTANTS function (1D)', () => {
    const modelDir = sampleModelDir('directconst')
    const vars = readInlineModel(`
      DimB: B1, B2, B3 ~~|
      x[DimB] = GET DIRECT CONSTANTS('data/b.csv', ',', 'B2*') ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'init-constants', { modelDir })).toEqual([
      '_x[0] = 1.0;',
      '_x[1] = 2.0;',
      '_x[2] = 3.0;'
    ])
  })

  it('should work for GET DIRECT CONSTANTS function (2D)', () => {
    const modelDir = sampleModelDir('directconst')
    const vars = readInlineModel(`
      DimB: B1, B2, B3 ~~|
      DimC: C1, C2 ~~|
      x[DimB, DimC] = GET DIRECT CONSTANTS('data/c.csv', ',', 'B2') ~~|
    `)
    expect(vars.size).toBe(1)
    expect(genC(vars.get('_x'), 'init-constants', { modelDir })).toEqual([
      '_x[0][0] = 1.0;',
      '_x[0][1] = 2.0;',
      '_x[1][0] = 3.0;',
      '_x[1][1] = 4.0;',
      '_x[2][0] = 5.0;',
      '_x[2][1] = 6.0;'
    ])
  })

  it('should work for GET DIRECT CONSTANTS function (separate definitions)', () => {
    const modelDir = sampleModelDir('directconst')
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      DimC: C1, C2 ~~|
      x[DimC, SubA] = GET DIRECT CONSTANTS('data/f.csv',',','B2') ~~|
      x[DimC, DimA] :EXCEPT: [DimC, SubA] = 0 ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_x[_a1,_dimc]'), 'init-constants', { modelDir })).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_x[0][i] = 0.0;',
      '}'
    ])
    expect(genC(vars.get('_x[_a2,_dimc]'), 'init-constants', { modelDir })).toEqual([
      '_x[1][0] = 12.0;',
      '_x[1][1] = 22.0;'
    ])
    expect(genC(vars.get('_x[_a3,_dimc]'), 'init-constants', { modelDir })).toEqual([
      '_x[2][0] = 13.0;',
      '_x[2][1] = 23.0;'
    ])
  })

  it('should work for GET DIRECT DATA function (single value from named csv file)', () => {
    const modelDir = sampleModelDir('directdata')
    const opts = {
      modelDir
    }
    const vars = readInlineModel(`
      x = GET DIRECT DATA('g_data.csv', ',', 'A', 'B13') ~~|
      y = x * 10 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'init-lookups', opts)).toEqual([
      '_x = __new_lookup(2, /*copy=*/true, (double[]){ 2045.0, 35.0, 2050.0, 47.0 });'
    ])
    expect(genC(vars.get('_y'), 'eval', opts)).toEqual(['_y = _LOOKUP(_x, _time) * 10.0;'])
  })

  it('should work for GET DIRECT DATA function (single value from tagged xlsx file)', () => {
    const modelDir = sampleModelDir('directdata')
    const opts = {
      modelDir
    }
    const vars = readInlineModel(`
      x = GET DIRECT DATA('data.xlsx', 'C Data', 'A', 'B13') ~~|
      y = x * 10 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'init-lookups', opts)).toEqual([
      '_x = __new_lookup(2, /*copy=*/true, (double[]){ 2045.0, 35.0, 2050.0, 47.0 });'
    ])
    expect(genC(vars.get('_y'), 'eval', opts)).toEqual(['_y = _LOOKUP(_x, _time) * 10.0;'])
  })

  it('should work for GET DIRECT DATA function (single value from tagged xlsx file)', () => {
    const modelDir = sampleModelDir('directdata')
    const opts = {
      modelDir,
      directDataSpec: new Map([['?data', 'data.xlsx']])
    }
    const vars = readInlineModel(`
      x = GET DIRECT DATA('?data', 'C Data', 'A', 'B13') ~~|
      y = x * 10 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'init-lookups', opts)).toEqual([
      '_x = __new_lookup(2, /*copy=*/true, (double[]){ 2045.0, 35.0, 2050.0, 47.0 });'
    ])
    expect(genC(vars.get('_y'), 'eval', opts)).toEqual(['_y = _LOOKUP(_x, _time) * 10.0;'])
  })

  it('should work for GET DIRECT DATA function (single value with lowercase cell reference)', () => {
    const modelDir = sampleModelDir('directdata')
    const vars = readInlineModel(`
      x = GET DIRECT DATA('g_data.csv', ',', 'a', 'b13') ~~|
      y = x * 10 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'init-lookups', { modelDir })).toEqual([
      '_x = __new_lookup(2, /*copy=*/true, (double[]){ 2045.0, 35.0, 2050.0, 47.0 });'
    ])
    expect(genC(vars.get('_y'), 'eval', { modelDir })).toEqual(['_y = _LOOKUP(_x, _time) * 10.0;'])
  })

  it('should throw error for GET DIRECT DATA function (with invalid cell reference)', () => {
    const modelDir = sampleModelDir('directdata')
    const vars = readInlineModel(`
      x = GET DIRECT DATA('g_data.csv', ',', 'a', '++') ~~|
      y = x * 10 ~~|
    `)
    expect(vars.size).toBe(2)
    expect(() => genC(vars.get('_x'), 'init-lookups', { modelDir })).toThrow(
      `Failed to parse 'cell' argument for GET DIRECT {DATA,LOOKUPS} call for _x: ++`
    )
    expect(genC(vars.get('_y'), 'eval', { modelDir })).toEqual(['_y = _LOOKUP(_x, _time) * 10.0;'])
  })

  it('should work for GET DIRECT DATA function (1D)', () => {
    const modelDir = sampleModelDir('directdata')
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[DimA] = GET DIRECT DATA('e_data.csv', ',', 'A', 'B5') ~~|
      y = x[A2] * 10 ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_x[_a1]'), 'init-lookups', { modelDir })).toEqual([
      '_x[0] = __new_lookup(2, /*copy=*/true, (double[]){ 2030.0, 593.0, 2050.0, 583.0 });'
    ])
    expect(genC(vars.get('_x[_a2]'), 'init-lookups', { modelDir })).toEqual([
      '_x[1] = __new_lookup(2, /*copy=*/true, (double[]){ 2030.0, 185.0, 2050.0, 180.0 });'
    ])
    expect(genC(vars.get('_y'), 'eval', { modelDir })).toEqual(['_y = _LOOKUP(_x[1], _time) * 10.0;'])
  })

  it('should work for GET DIRECT DATA function (2D with separate definitions)', () => {
    const modelDir = sampleModelDir('directdata')
    const opts = {
      modelDir,
      directDataSpec: new Map([['?data', 'data.xlsx']])
    }
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      x[A1, DimB] = GET DIRECT DATA('e_data.csv', ',', 'A', 'B5') ~~|
      x[A2, DimB] = 0 ~~|
      y = x[A2, B1] * 10 ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1,_b1]'), 'init-lookups', opts)).toEqual([
      '_x[0][0] = __new_lookup(2, /*copy=*/true, (double[]){ 2030.0, 593.0, 2050.0, 583.0 });'
    ])
    expect(genC(vars.get('_x[_a1,_b2]'), 'init-lookups', opts)).toEqual([
      '_x[0][1] = __new_lookup(2, /*copy=*/true, (double[]){ 2030.0, 185.0, 2050.0, 180.0 });'
    ])
    expect(genC(vars.get('_x[_a2,_dimb]'), 'init-lookups', opts)).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_x[1][i] = __new_lookup(2, /*copy=*/true, (double[]){ -1e+308, 0.0, 1e+308, 0.0 });',
      '}'
    ])
    expect(genC(vars.get('_y'), 'eval', opts)).toEqual(['_y = _LOOKUP(_x[1][0], _time) * 10.0;'])
  })

  it('should work for GET DIRECT LOOKUPS function', () => {
    const modelDir = sampleModelDir('directlookups')
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookups.CSV', ',', '1', 'AH2') ~~|
      y[DimA] = x[DimA](Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars.size).toBe(5)
    expect(genC(vars.get('_x[_a1]'), 'init-lookups', { modelDir })).toEqual([
      '_x[0] = __new_lookup(2, /*copy=*/true, (double[]){ 2049.0, 0.966667, 2050.0, 1.0 });'
    ])
    expect(genC(vars.get('_x[_a2]'), 'init-lookups', { modelDir })).toEqual([
      '_x[1] = __new_lookup(2, /*copy=*/true, (double[]){ 2049.0, 0.965517, 2050.0, 1.0 });'
    ])
    expect(genC(vars.get('_x[_a3]'), 'init-lookups', { modelDir })).toEqual([
      '_x[2] = __new_lookup(2, /*copy=*/true, (double[]){ 2049.0, 0.98975, 2050.0, 0.998394 });'
    ])
    expect(genC(vars.get('_y'), 'eval', { modelDir })).toEqual([
      'for (size_t i = 0; i < 3; i++) {',
      '_y[i] = _LOOKUP(_x[i], _time);',
      '}'
    ])
    expect(genC(vars.get('_z'), 'eval', { modelDir })).toEqual(['_z = _y[1];'])
  })

  it('should work for GET DIRECT SUBSCRIPT function', () => {
    const modelDir = sampleModelDir('directsubs')
    // Note that we test both uppercase (typical) and lowercase (atypical) cell references below
    const vars = readInlineModel(
      `
      DimA: A1, A2, A3 -> DimB, DimC ~~|
      DimB: GET DIRECT SUBSCRIPT('b_subs.csv', ',', 'a2', 'a', '') ~~|
      DimC: GET DIRECT SUBSCRIPT('c_subs.csv', ',', 'A2', '2', '') ~~|
      a[DimA] = 10, 20, 30 ~~|
      b[DimB] = 1, 2, 3 ~~|
      c[DimC] = a[DimA] + 1 ~~|
      d = b[B2] ~~|
      e = c[C3] ~~|
    `,
      { modelDir }
    )
    expect(vars.size).toBe(9)
    expect(genC(vars.get('_a[_a1]'), 'init-constants', { modelDir })).toEqual(['_a[0] = 10.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants', { modelDir })).toEqual(['_a[1] = 20.0;'])
    expect(genC(vars.get('_a[_a3]'), 'init-constants', { modelDir })).toEqual(['_a[2] = 30.0;'])
    expect(genC(vars.get('_b[_b1]'), 'init-constants', { modelDir })).toEqual(['_b[0] = 1.0;'])
    expect(genC(vars.get('_b[_b2]'), 'init-constants', { modelDir })).toEqual(['_b[1] = 2.0;'])
    expect(genC(vars.get('_b[_b3]'), 'init-constants', { modelDir })).toEqual(['_b[2] = 3.0;'])
    expect(genC(vars.get('_b[_b1]'), 'eval', { modelDir })).toEqual(['_b[0] = 1.0;'])
    expect(genC(vars.get('_b[_b2]'), 'eval', { modelDir })).toEqual(['_b[1] = 2.0;'])
    expect(genC(vars.get('_b[_b3]'), 'eval', { modelDir })).toEqual(['_b[2] = 3.0;'])
    expect(genC(vars.get('_c'), 'eval', { modelDir })).toEqual([
      'for (size_t i = 0; i < 3; i++) {',
      '_c[i] = _a[__map_dima_dimc[i]] + 1.0;',
      '}'
    ])
    expect(genC(vars.get('_d'), 'eval', { modelDir })).toEqual(['_d = _b[1];'])
    expect(genC(vars.get('_e'), 'eval', { modelDir })).toEqual(['_e = _c[2];'])
  })

  it('should work for IF THEN ELSE function', () => {
    // Note that we use `ABS(1)` here to circumvent the constant conditional optimization
    // code (the legacy `ExprReader` doesn't currently optimize function calls).  This
    // allows us to verify the generated code without the risk of it being optimized away.
    const vars = readInlineModel(`
      x = ABS(1) ~~|
      y = IF THEN ELSE(x > 0, 1, x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = _ABS(1.0);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _IF_THEN_ELSE(_x > 0.0, 1.0, _x);'])
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

  it('should work for INTEG function (with one dimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      rate[DimA] = 10, 20 ~~|
      init[DimA] = 1, 2 ~~|
      y[DimA] = INTEG(rate[DimA], init[DimA]) ~~|
    `)
    expect(vars.size).toBe(5)
    expect(genC(vars.get('_rate[_a1]'), 'init-constants')).toEqual(['_rate[0] = 10.0;'])
    expect(genC(vars.get('_rate[_a2]'), 'init-constants')).toEqual(['_rate[1] = 20.0;'])
    expect(genC(vars.get('_init[_a1]'), 'init-constants')).toEqual(['_init[0] = 1.0;'])
    expect(genC(vars.get('_init[_a2]'), 'init-constants')).toEqual(['_init[1] = 2.0;'])
    expect(genC(vars.get('_y'), 'init-levels')).toEqual(['for (size_t i = 0; i < 2; i++) {', '_y[i] = _init[i];', '}'])
    expect(genC(vars.get('_y'), 'eval')).toEqual([
      'for (size_t i = 0; i < 2; i++) {',
      '_y[i] = _INTEG(_y[i], _rate[i]);',
      '}'
    ])
  })

  it('should work for INTEG function (with SUM used in arguments)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      rate[DimA] = 10, 20 ~~|
      init[DimA] = 1, 2 ~~|
      y = INTEG(SUM(rate[DimA!]), SUM(init[DimA!])) ~~|
    `)
    expect(vars.size).toBe(5)
    expect(genC(vars.get('_rate[_a1]'), 'init-constants')).toEqual(['_rate[0] = 10.0;'])
    expect(genC(vars.get('_rate[_a2]'), 'init-constants')).toEqual(['_rate[1] = 20.0;'])
    expect(genC(vars.get('_init[_a1]'), 'init-constants')).toEqual(['_init[0] = 1.0;'])
    expect(genC(vars.get('_init[_a2]'), 'init-constants')).toEqual(['_init[1] = 2.0;'])
    expect(genC(vars.get('_y'), 'init-levels')).toEqual([
      'double __t1 = 0.0;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t1 += _init[u];',
      '}',
      '_y = __t1;'
    ])
    expect(genC(vars.get('_y'), 'eval')).toEqual([
      'double __t2 = 0.0;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t2 += _rate[u];',
      '}',
      '_y = _INTEG(_y, __t2);'
    ])
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

  it('should work for LOOKUP BACKWARD function (with lookup defined explicitly)', () => {
    const vars = readInlineModel(`
      x((0,0),(1,1),(2,2)) ~~|
      y = LOOKUP BACKWARD(x, 1.5) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'decl')).toEqual(['double _x_data_[6] = { 0.0, 0.0, 1.0, 1.0, 2.0, 2.0 };'])
    expect(genC(vars.get('_x'), 'init-lookups')).toEqual(['_x = __new_lookup(3, /*copy=*/false, _x_data_);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _LOOKUP_BACKWARD(_x, 1.5);'])
  })

  it('should work for LOOKUP BACKWARD function (with lookup defined using GET DIRECT LOOKUPS)', () => {
    const modelDir = sampleModelDir('directlookups')
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookups.CSV', ',', '1', 'AH2') ~~|
      y[DimA] = LOOKUP BACKWARD(x[DimA], Time) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genC(vars.get('_x[_a1]'), 'init-lookups', { modelDir })).toEqual([
      '_x[0] = __new_lookup(2, /*copy=*/true, (double[]){ 2049.0, 0.966667, 2050.0, 1.0 });'
    ])
    expect(genC(vars.get('_x[_a2]'), 'init-lookups', { modelDir })).toEqual([
      '_x[1] = __new_lookup(2, /*copy=*/true, (double[]){ 2049.0, 0.965517, 2050.0, 1.0 });'
    ])
    expect(genC(vars.get('_x[_a3]'), 'init-lookups', { modelDir })).toEqual([
      '_x[2] = __new_lookup(2, /*copy=*/true, (double[]){ 2049.0, 0.98975, 2050.0, 0.998394 });'
    ])
    expect(genC(vars.get('_y'), 'eval', { modelDir })).toEqual([
      'for (size_t i = 0; i < 3; i++) {',
      '_y[i] = _LOOKUP_BACKWARD(_x[i], _time);',
      '}'
    ])
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

  it('should work for LOOKUP INVERT function', () => {
    const vars = readInlineModel(`
      x((0,0),(1,1),(2,2)) ~~|
      y = LOOKUP INVERT(x, 1.5) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'), 'decl')).toEqual(['double _x_data_[6] = { 0.0, 0.0, 1.0, 1.0, 2.0, 2.0 };'])
    expect(genC(vars.get('_x'), 'init-lookups')).toEqual(['_x = __new_lookup(3, /*copy=*/false, _x_data_);'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _LOOKUP_INVERT(_x, 1.5);'])
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
      time step = 1 ~~|
      stream = 100 ~~|
      discount rate = 10 ~~|
      init = 0 ~~|
      factor = 2 ~~|
      y = NPV(stream, discount rate, init, factor) ~~|
    `)
    expect(vars.size).toBe(9)
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

  // TODO: Subscripted variants
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
      y = SQRT(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _SQRT(_x);'])
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

  it('should work for SUM function (single call)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      a[DimA] = 10, 20 ~~|
      x = SUM(a[DimA!]) + 1 ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 10.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 20.0;'])
    expect(genC(vars.get('_x'))).toEqual([
      'double __t1 = 0.0;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t1 += _a[u];',
      '}',
      '_x = __t1 + 1.0;'
    ])
  })

  it('should work for SUM function (multiple calls)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      a[DimA] = 10, 20 ~~|
      b[DimB] = 50, 60 ~~|
      c[DimA] = 1, 2 ~~|
      x = SUM(a[DimA!]) + SUM(b[DimB!]) + SUM(c[DimA!]) ~~|
    `)
    expect(vars.size).toBe(7)
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 10.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 20.0;'])
    expect(genC(vars.get('_b[_b1]'), 'init-constants')).toEqual(['_b[0] = 50.0;'])
    expect(genC(vars.get('_b[_b2]'), 'init-constants')).toEqual(['_b[1] = 60.0;'])
    expect(genC(vars.get('_c[_a1]'), 'init-constants')).toEqual(['_c[0] = 1.0;'])
    expect(genC(vars.get('_c[_a2]'), 'init-constants')).toEqual(['_c[1] = 2.0;'])
    expect(genC(vars.get('_x'))).toEqual([
      'double __t1 = 0.0;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t1 += _a[u];',
      '}',
      'double __t2 = 0.0;',
      'for (size_t v = 0; v < 2; v++) {',
      '__t2 += _b[v];',
      '}',
      'double __t3 = 0.0;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t3 += _c[u];',
      '}',
      '_x = __t1 + __t2 + __t3;'
    ])
  })

  it('should work for SUM function (with nested function call)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      a[DimA] = 10, 20 ~~|
      x = SUM(IF THEN ELSE(a[DimA!] = 10, 0, a[DimA!])) + 1 ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 10.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 20.0;'])
    expect(genC(vars.get('_x'))).toEqual([
      'double __t1 = 0.0;',
      'for (size_t u = 0; u < 2; u++) {',
      '__t1 += _IF_THEN_ELSE(_a[u] == 10.0, 0.0, _a[u]);',
      '}',
      '_x = __t1 + 1.0;'
    ])
  })

  it('should work for TAN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = TAN(x) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genC(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genC(vars.get('_y'))).toEqual(['_y = _TAN(_x);'])
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

  it('should work for VECTOR ELM MAP function', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      DimB: B1, B2 ~~|
      a[DimA] = 0, 1, 1 ~~|
      b[DimB] = 1, 2 ~~|
      c[DimA] = VECTOR ELM MAP(b[B1], a[DimA]) ~~|
      y = c[A1] ~~|
    `)
    expect(vars.size).toBe(7)
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 0.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 1.0;'])
    expect(genC(vars.get('_a[_a3]'), 'init-constants')).toEqual(['_a[2] = 1.0;'])
    expect(genC(vars.get('_b[_b1]'), 'init-constants')).toEqual(['_b[0] = 1.0;'])
    expect(genC(vars.get('_b[_b2]'), 'init-constants')).toEqual(['_b[1] = 2.0;'])
    expect(genC(vars.get('_c'))).toEqual([
      'for (size_t i = 0; i < 3; i++) {',
      '_c[i] = _b[_dimb[(size_t)(0 + _a[i])]];',
      '}'
    ])
    expect(genC(vars.get('_y'))).toEqual(['_y = _c[0];'])
  })

  it('should work for VECTOR SELECT function (with sum action + zero for missing values)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      DimB: B1, B2 ~~|
      VSSUM == 0 ~~|
      VSERRNONE == 0 ~~|
      a[DimA] = 0, 1, 1 ~~|
      b[DimB] = 1, 2 ~~|
      c = VECTOR SELECT(b[DimB!], a[DimA!], 0, VSSUM, VSERRNONE) ~~|
    `)
    expect(vars.size).toBe(8)
    expect(genC(vars.get('_vssum'), 'init-constants')).toEqual(['_vssum = 0.0;'])
    expect(genC(vars.get('_vserrnone'), 'init-constants')).toEqual(['_vserrnone = 0.0;'])
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 0.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 1.0;'])
    expect(genC(vars.get('_a[_a3]'), 'init-constants')).toEqual(['_a[2] = 1.0;'])
    expect(genC(vars.get('_b[_b1]'), 'init-constants')).toEqual(['_b[0] = 1.0;'])
    expect(genC(vars.get('_b[_b2]'), 'init-constants')).toEqual(['_b[1] = 2.0;'])
    expect(genC(vars.get('_c'))).toEqual([
      'bool __t1 = false;',
      'double __t2 = 0.0;',
      'for (size_t u = 0; u < 2; u++) {',
      'for (size_t v = 0; v < 3; v++) {',
      'if (bool_cond(_b[u])) {',
      '__t2 += _a[v];',
      '__t1 = true;',
      '}',
      '}',
      '}',
      '_c = __t1 ? __t2 : 0.0;'
    ])
  })

  it('should work for VECTOR SELECT function (with max action + :NA: for missing values)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      DimB: B1, B2 ~~|
      VSMAX == 3 ~~|
      VSERRNONE == 0 ~~|
      a[DimA] = 0, 1, 1 ~~|
      b[DimB] = 1, 2 ~~|
      c = VECTOR SELECT(b[DimB!], a[DimA!], :NA:, VSMAX, VSERRNONE) ~~|
    `)
    expect(vars.size).toBe(8)
    expect(genC(vars.get('_vsmax'), 'init-constants')).toEqual(['_vsmax = 3.0;'])
    expect(genC(vars.get('_vserrnone'), 'init-constants')).toEqual(['_vserrnone = 0.0;'])
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 0.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 1.0;'])
    expect(genC(vars.get('_a[_a3]'), 'init-constants')).toEqual(['_a[2] = 1.0;'])
    expect(genC(vars.get('_b[_b1]'), 'init-constants')).toEqual(['_b[0] = 1.0;'])
    expect(genC(vars.get('_b[_b2]'), 'init-constants')).toEqual(['_b[1] = 2.0;'])
    expect(genC(vars.get('_c'))).toEqual([
      'bool __t1 = false;',
      'double __t2 = -DBL_MAX;',
      'for (size_t u = 0; u < 2; u++) {',
      'for (size_t v = 0; v < 3; v++) {',
      'if (bool_cond(_b[u])) {',
      '__t2 = fmax(__t2, _a[v]);',
      '__t1 = true;',
      '}',
      '}',
      '}',
      '_c = __t1 ? __t2 : _NA_;'
    ])
  })

  it('should work for VECTOR SORT ORDER function', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      a[DimA] = 3, 1, 2 ~~|
      x[DimA] = VECTOR SORT ORDER(a[DimA], 1) ~~|
      y = x[A1] ~~|
    `)
    expect(vars.size).toBe(5)
    expect(genC(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 3.0;'])
    expect(genC(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 1.0;'])
    expect(genC(vars.get('_a[_a3]'), 'init-constants')).toEqual(['_a[2] = 2.0;'])
    expect(genC(vars.get('_x'))).toEqual([
      'double* __t1 = _VECTOR_SORT_ORDER(_a, 3, 1.0);',
      'for (size_t i = 0; i < 3; i++) {',
      '_x[i] = __t1[_dima[i]];',
      '}'
    ])
    expect(genC(vars.get('_y'))).toEqual(['_y = _x[0];'])
  })

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
