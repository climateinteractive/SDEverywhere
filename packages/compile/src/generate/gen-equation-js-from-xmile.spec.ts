import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { readXlsx, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from '../model/model'
// import { default as VariableImpl } from '../model/variable'

import { parseInlineXmileModel, type Variable, xmile } from '../_tests/test-support'
import { generateEquation } from './gen-equation'

type ExtData = Map<string, Map<number, number>>
type DirectDataSpec = Map<string, string>

function readInlineModel(
  mdlContent: string,
  opts?: {
    modelDir?: string
    extData?: ExtData
    inputVarNames?: string[]
    outputVarNames?: string[]
  }
): Map<string, Variable> {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  let spec
  if (opts?.inputVarNames || opts?.outputVarNames) {
    spec = {
      inputVarNames: opts?.inputVarNames || [],
      outputVarNames: opts?.outputVarNames || []
    }
  } else {
    spec = {}
  }

  const parsedModel = parseInlineXmileModel(mdlContent, opts?.modelDir)
  Model.read(parsedModel, spec, opts?.extData, /*directData=*/ undefined, opts?.modelDir, {
    reduceVariables: false
  })

  // Get all variables (note that `allVars` already excludes the `Time` variable, and we want to
  // exclude that so that we have one less thing to check)
  const map = new Map<string, Variable>()
  Model.allVars().forEach((v: Variable) => {
    // Exclude control variables so that we have fewer things to check
    switch (v.varName) {
      case '_initial_time':
      case '_final_time':
      case '_time_step':
      case '_saveper':
      case '_starttime':
      case '_stoptime':
      case '_dt':
        return
      default:
        map.set(v.refId, v)
        break
    }
  })
  return map
}

function genJS(
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

  const lines = generateEquation(variable, mode, opts?.extData, directData, opts?.modelDir, 'js')

  // Strip the first comment line (containing the XMILE equation)
  if (lines.length > 0 && lines[0].trim().startsWith('//')) {
    lines.shift()
  }

  // Trim the remaining lines to remove extra whitespace
  return lines.map(line => line.trim())
}

describe('generateEquation (XMILE -> JS)', () => {
  it('should work for simple equation with unary NOT op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(:NOT: x, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF NOT x THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((!_x) ? (1.0) : (0.0));'])
  })

  it('should work for simple equation with unary + op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = +x ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>+x</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x;'])
  })

  it('should work for simple equation with unary - op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = -x ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>-x</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = -_x;'])
  })

  it('should work for simple equation with binary + op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = x + 2 ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x + 2</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x + 2.0;'])
  })

  it('should work for simple equation with binary - op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = x - 2 ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x - 2</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x - 2.0;'])
  })

  it('should work for simple equation with binary * op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = x * 2 ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x * 2</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x * 2.0;'])
  })

  it('should work for simple equation with binary / op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = x / 2 ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x / 2</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x / 2.0;'])
  })

  it('should work for simple equation with binary ^ op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = x ^ 2 ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x ^ 2</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.POW(_x, 2.0);'])
  })

  it('should work for simple equation with explicit parentheses', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = (x + 2) * 3 ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>(x + 2) * 3</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = (_x + 2.0) * 3.0;'])
  })

  it('should work for conditional expression with = op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x = time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x = time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x === _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with <> op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x <> time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x &lt;&gt; time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x !== _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with < op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x < time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x &lt; time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x < _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with <= op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x <= time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x &lt;= time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x <= _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with > op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x > time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x &gt; time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x > _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with >= op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x >= time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x &gt;= time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x >= _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with AND op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x :AND: time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x AND time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x && _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with OR op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = ABS(1) ~~|
    //   y = IF THEN ELSE(x :OR: time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>ABS(1)</eqn>
</aux>
<aux name="y">
  <eqn>IF x OR time THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = fns.ABS(1.0);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x || _time) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with NOT op', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = ABS(1) ~~|
    //   y = IF THEN ELSE(:NOT: x, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>ABS(1)</eqn>
</aux>
<aux name="y">
  <eqn>IF NOT x THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = fns.ABS(1.0);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((!_x) ? (1.0) : (0.0));'])
  })

  // TODO: This test is skipped because XMILE may not support :NA: keyword for missing values
  it.skip('should work for expression using :NA: keyword', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = Time ~~|
    //   y = IF THEN ELSE(x <> :NA:, 1, 0) ~~|
    // `)

    // TODO: Need to determine how XMILE handles missing values or NA values
    const xmileVars = `\
<aux name="x">
  <eqn>Time</eqn>
</aux>
<aux name="y">
  <eqn>IF x <> NA THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = _time;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x !== _NA_) ? (1.0) : (0.0));'])
  })

  it('should work for conditional expression with reference to dimension', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x = 1 ~~|
    //   y[DimA] = IF THEN ELSE(DimA = x, 1, 0) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>IF DimA = x THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_y[i] = (((i + 1) === _x) ? (1.0) : (0.0));',
      '}'
    ])
  })

  it('should work for conditional expression with reference to dimension and subscript/index', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   y[DimA] = IF THEN ELSE(DimA = A2, 1, 0) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>IF DimA = A2 THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(1)
    expect(genJS(vars.get('_y'))).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_y[i] = (((i + 1) === 2) ? (1.0) : (0.0));',
      '}'
    ])
  })

  // TODO: This test is skipped because XMILE handles external data variables differently
  it.skip('should work for data variable definition', () => {
    // Equivalent Vensim model for reference:
    // const extData: ExtData = new Map([
    //   [
    //     '_x',
    //     new Map([
    //       [0, 0],
    //       [1, 2],
    //       [2, 5]
    //     ])
    //   ]
    // ])
    // const vars = readInlineModel(
    //   `
    //   x ~~|
    //   y = x * 10 ~~|
    //   `,
    //   { extData }
    // )
    // TODO: Need to determine how XMILE handles external data variables
    //     const xmileVars = `\
    // <aux name="x">
    //   <eqn>data</eqn>
    // </aux>
    // <aux name="y">
    //   <eqn>x * 10</eqn>
    // </aux>`
    // const mdl = xmile('', xmileVars)
    // const vars = readInlineModel(mdl, { extData })
    // expect(vars.size).toBe(2)
    // expect(genJS(vars.get('_x'), 'decl', { extData })).toEqual(['const _x_data_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];'])
    // expect(genJS(vars.get('_x'), 'init-lookups', { extData })).toEqual(['_x = fns.createLookup(3, _x_data_);'])
    // expect(genJS(vars.get('_y'), 'eval', { extData })).toEqual(['_y = fns.LOOKUP(_x, _time) * 10.0;'])
  })

  // TODO: This test is skipped because XMILE handles external data variables differently
  it.skip('should work for data variable definition (1D)', () => {
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
    expect(genJS(vars.get('_x'), 'decl', { extData })).toEqual([
      'const _x_data__0_ = [0.0, 0.0, 1.0, 2.0, 2.0, 5.0];',
      'const _x_data__1_ = [0.0, 10.0, 1.0, 12.0, 2.0, 15.0];'
    ])
    expect(genJS(vars.get('_x'), 'init-lookups', { extData })).toEqual([
      '_x[0] = fns.createLookup(3, _x_data__0_);',
      '_x[1] = fns.createLookup(3, _x_data__1_);'
    ])
    expect(genJS(vars.get('_y'), 'eval', { extData })).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_y[i] = fns.LOOKUP(_x[i], _time) * 10.0;',
      '}'
    ])
    expect(genJS(vars.get('_z'), 'eval', { extData })).toEqual(['_z = _y[1];'])
  })

  it('should work for lookup definition', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|
    // `)

    const xmileVars = `\
<gf name="x" type="continuous">
  <xpts>0,0.1,0.5,1,1.5,2</xpts>
  <ypts>0,0.01,0.7,1,1.2,1.3</ypts>
</gf>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(1)
    expect(genJS(vars.get('_x'), 'decl')).toEqual([
      'const _x_data_ = [0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3];'
    ])
    expect(genJS(vars.get('_x'), 'init-lookups')).toEqual(['_x = fns.createLookup(6, _x_data_);'])
  })

  // TODO: This test is skipped until we support XMILE spec 4.5.3:
  //   4.5.3 Apply-to-All Arrays with Non-Apply-to-All Graphical Functions
  it.skip('should work for lookup definition (one dimension)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x[A1]( (0,10), (1,20) ) ~~|
    //   x[A2]( (0,30), (1,40) ) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <gf>
      <xpts>0,1</xpts>
      <ypts>10,20</ypts>
    </gf>
  </element>
  <element subscript="A2">
    <gf>
      <xpts>0,1</xpts>
      <ypts>30,40</ypts>
    </gf>
  </element>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x[_a1]'), 'decl')).toEqual(['const _x_data__0_ = [0.0, 10.0, 1.0, 20.0];'])
    expect(genJS(vars.get('_x[_a2]'), 'decl')).toEqual(['const _x_data__1_ = [0.0, 30.0, 1.0, 40.0];'])
    expect(genJS(vars.get('_x[_a1]'), 'init-lookups')).toEqual(['_x[0] = fns.createLookup(2, _x_data__0_);'])
    expect(genJS(vars.get('_x[_a2]'), 'init-lookups')).toEqual(['_x[1] = fns.createLookup(2, _x_data__1_);'])
  })

  // TODO: This test is skipped until we support XMILE spec 4.5.3:
  //   4.5.3 Apply-to-All Arrays with Non-Apply-to-All Graphical Functions
  it.skip('should work for lookup definition (two dimensions)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      x[A1,B1]( (0,10), (1,20) ) ~~|
      x[A1,B2]( (0,30), (1,40) ) ~~|
      x[A2,B1]( (0,50), (1,60) ) ~~|
      x[A2,B2]( (0,70), (1,80) ) ~~|
    `)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_x[_a1,_b1]'), 'decl')).toEqual(['const _x_data__0__0_ = [0.0, 10.0, 1.0, 20.0];'])
    expect(genJS(vars.get('_x[_a1,_b2]'), 'decl')).toEqual(['const _x_data__0__1_ = [0.0, 30.0, 1.0, 40.0];'])
    expect(genJS(vars.get('_x[_a2,_b1]'), 'decl')).toEqual(['const _x_data__1__0_ = [0.0, 50.0, 1.0, 60.0];'])
    expect(genJS(vars.get('_x[_a2,_b2]'), 'decl')).toEqual(['const _x_data__1__1_ = [0.0, 70.0, 1.0, 80.0];'])
    expect(genJS(vars.get('_x[_a1,_b1]'), 'init-lookups')).toEqual(['_x[0][0] = fns.createLookup(2, _x_data__0__0_);'])
    expect(genJS(vars.get('_x[_a1,_b2]'), 'init-lookups')).toEqual(['_x[0][1] = fns.createLookup(2, _x_data__0__1_);'])
    expect(genJS(vars.get('_x[_a2,_b1]'), 'init-lookups')).toEqual(['_x[1][0] = fns.createLookup(2, _x_data__1__0_);'])
    expect(genJS(vars.get('_x[_a2,_b2]'), 'init-lookups')).toEqual(['_x[1][1] = fns.createLookup(2, _x_data__1__1_);'])
  })

  it('should work for lookup call', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|
    //   y = x(2) ~~|
    // `)

    const xmileVars = `\
<gf name="x" type="continuous">
  <xpts>0,0.1,0.5,1,1.5,2</xpts>
  <ypts>0,0.01,0.7,1,1.2,1.3</ypts>
</gf>
<aux name="y">
  <eqn>x(2)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'), 'decl')).toEqual([
      'const _x_data_ = [0.0, 0.0, 0.1, 0.01, 0.5, 0.7, 1.0, 1.0, 1.5, 1.2, 2.0, 1.3];'
    ])
    expect(genJS(vars.get('_x'), 'init-lookups')).toEqual(['_x = fns.createLookup(6, _x_data_);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.LOOKUP(_x, 2.0);'])
  })

  // TODO: This test is skipped until we support XMILE spec 4.5.3:
  //   4.5.3 Apply-to-All Arrays with Non-Apply-to-All Graphical Functions
  it.skip('should work for lookup call (with one dimension)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x[A1]( [(0,0)-(2,2)], (0,0),(2,1.3) ) ~~|
    //   x[A2]( [(0,0)-(2,2)], (0,0.5),(2,1.5) ) ~~|
    //   y = x[A1](2) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <gf>
      <xpts>0,2</xpts>
      <ypts>0,1.3</ypts>
    </gf>
  </element>
  <element subscript="A2">
    <gf>
      <xpts>0,2</xpts>
      <ypts>0.5,1.5</ypts>
    </gf>
  </element>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(3)
    expect(genJS(vars.get('_x[_a1]'), 'decl')).toEqual(['const _x_data__0_ = [0.0, 0.0, 2.0, 1.3];'])
    expect(genJS(vars.get('_x[_a2]'), 'decl')).toEqual(['const _x_data__1_ = [0.0, 0.5, 2.0, 1.5];'])
    expect(genJS(vars.get('_x[_a1]'), 'init-lookups')).toEqual(['_x[0] = fns.createLookup(2, _x_data__0_);'])
    expect(genJS(vars.get('_x[_a2]'), 'init-lookups')).toEqual(['_x[1] = fns.createLookup(2, _x_data__1_);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.LOOKUP(_x[0], 2.0);'])
  })

  it('should work for constant definition (with one dimension)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   x[DimA] = 1 ~~|
    //   y = x[A2] ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x[A2]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'), 'init-constants')).toEqual(['for (let i = 0; i < 3; i++) {', '_x[i] = 1.0;', '}'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x[1];'])
  })

  // TODO: This test is skipped because XMILE doesn't support :EXCEPT: operator
  it.skip('should work for constant definition (with two dimensions + except + subdimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      DimC: C1, C2 ~~|
      x[DimC, SubA] = 1 ~~|
      x[DimC, DimA] :EXCEPT: [DimC, SubA] = 2 ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genJS(vars.get('_x[_dimc,_a1]'), 'init-constants')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_x[i][0] = 2.0;',
      '}'
    ])
    expect(genJS(vars.get('_x[_dimc,_a2]'), 'init-constants')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_x[i][1] = 1.0;',
      '}'
    ])
    expect(genJS(vars.get('_x[_dimc,_a3]'), 'init-constants')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_x[i][2] = 1.0;',
      '}'
    ])
  })

  it('should work for constant definition (with separate subscripts)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   x[A1] = 1 ~~|
    //   x[A2] = 2 ~~|
    //   x[A3] = 3 ~~|
    //   y = x[A2] ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[A2]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genJS(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genJS(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x[1];'])
  })

  it('should work for const list definition (1D)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   x[DimA] = 1, 2, 3 ~~|
    //   y = x[A2] ~~|
    // `)

    // XMILE doesn't have a const list shorthand like Vensim, so this test is basically the
    // same as the previous one
    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[A2]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genJS(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genJS(vars.get('_x[_a3]'), 'init-constants')).toEqual(['_x[2] = 3.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x[1];'])
  })

  it('should work for const list definition (2D, dimensions in normal/alphabetized order)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   DimB: B1, B2, B3 ~~|
    //   x[DimA, DimB] = 1, 2, 3; 4, 5, 6; ~~|
    //   y = x[A2, B3] ~~|
    // `)

    // XMILE doesn't have a const list shorthand like Vensim, so we use a non-apply-to-all definition
    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
  <elem name="B3"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="A1,B1">
    <eqn>1</eqn>
  </element>
  <element subscript="A1,B2">
    <eqn>2</eqn>
  </element>
  <element subscript="A1,B3">
    <eqn>3</eqn>
  </element>
  <element subscript="A2,B1">
    <eqn>4</eqn>
  </element>
  <element subscript="A2,B2">
    <eqn>5</eqn>
  </element>
  <element subscript="A2,B3">
    <eqn>6</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[A2, B3]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(7)
    expect(genJS(vars.get('_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genJS(vars.get('_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genJS(vars.get('_x[_a1,_b3]'), 'init-constants')).toEqual(['_x[0][2] = 3.0;'])
    expect(genJS(vars.get('_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 4.0;'])
    expect(genJS(vars.get('_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 5.0;'])
    expect(genJS(vars.get('_x[_a2,_b3]'), 'init-constants')).toEqual(['_x[1][2] = 6.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x[1][2];'])
  })

  it('should work for const list definition (2D, dimensions not in normal/alphabetized order)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimB: B1, B2, B3 ~~|
    //   DimA: A1, A2 ~~|
    //   x[DimB, DimA] = 1, 2; 3, 4; 5, 6; ~~|
    //   y = x[B3, A2] ~~|
    //   z = x[B2, A1] ~~|
    // `)

    // XMILE doesn't have a const list shorthand like Vensim, so we use a non-apply-to-all definition
    const xmileDims = `\
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
  <elem name="B3"/>
</dim>
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="B1,A1">
    <eqn>1</eqn>
  </element>
  <element subscript="B1,A2">
    <eqn>2</eqn>
  </element>
  <element subscript="B2,A1">
    <eqn>3</eqn>
  </element>
  <element subscript="B2,A2">
    <eqn>4</eqn>
  </element>
  <element subscript="B3,A1">
    <eqn>5</eqn>
  </element>
  <element subscript="B3,A2">
    <eqn>6</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[B3, A2]</eqn>
</aux>
<aux name="z">
  <eqn>x[B2, A1]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(8)
    expect(genJS(vars.get('_x[_b1,_a1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genJS(vars.get('_x[_b1,_a2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genJS(vars.get('_x[_b2,_a1]'), 'init-constants')).toEqual(['_x[1][0] = 3.0;'])
    expect(genJS(vars.get('_x[_b2,_a2]'), 'init-constants')).toEqual(['_x[1][1] = 4.0;'])
    expect(genJS(vars.get('_x[_b3,_a1]'), 'init-constants')).toEqual(['_x[2][0] = 5.0;'])
    expect(genJS(vars.get('_x[_b3,_a2]'), 'init-constants')).toEqual(['_x[2][1] = 6.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x[2][1];'])
    expect(genJS(vars.get('_z'))).toEqual(['_z = _x[1][0];'])
  })

  it('should work for const list definition (2D separated, dimensions in normal/alphabetized order)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   DimB: B1, B2 ~~|
    //   x[A1, DimB] = 1,2 ~~|
    //   x[A2, DimB] = 3,4 ~~|
    //   x[A3, DimB] = 5,6 ~~|
    //   y = x[A3, B2] ~~|
    // `)

    // XMILE doesn't have a const list shorthand like Vensim, so we use a non-apply-to-all definition
    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="A1,B1">
    <eqn>1</eqn>
  </element>
  <element subscript="A1,B2">
    <eqn>2</eqn>
  </element>
  <element subscript="A2,B1">
    <eqn>3</eqn>
  </element>
  <element subscript="A2,B2">
    <eqn>4</eqn>
  </element>
  <element subscript="A3,B1">
    <eqn>5</eqn>
  </element>
  <element subscript="A3,B2">
    <eqn>6</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[A3, B2]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(7)
    expect(genJS(vars.get('_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genJS(vars.get('_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genJS(vars.get('_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 3.0;'])
    expect(genJS(vars.get('_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 4.0;'])
    expect(genJS(vars.get('_x[_a3,_b1]'), 'init-constants')).toEqual(['_x[2][0] = 5.0;'])
    expect(genJS(vars.get('_x[_a3,_b2]'), 'init-constants')).toEqual(['_x[2][1] = 6.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x[2][1];'])
  })

  it('should work for const list definition (2D separated, dimensions not in normal/alphabetized order)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   DimB: B1, B2 ~~|
    //   x[B1, DimA] = 1,2,3 ~~|
    //   x[B2, DimA] = 4,5,6 ~~|
    //   y = x[B2, A3] ~~|
    // `)

    // XMILE doesn't have a const list shorthand like Vensim, so we use a non-apply-to-all definition
    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="B1,A1">
    <eqn>1</eqn>
  </element>
  <element subscript="B1,A2">
    <eqn>2</eqn>
  </element>
  <element subscript="B1,A3">
    <eqn>3</eqn>
  </element>
  <element subscript="B2,A1">
    <eqn>4</eqn>
  </element>
  <element subscript="B2,A2">
    <eqn>5</eqn>
  </element>
  <element subscript="B2,A3">
    <eqn>6</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[B2, A3]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(7)
    expect(genJS(vars.get('_x[_b1,_a1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genJS(vars.get('_x[_b1,_a2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genJS(vars.get('_x[_b1,_a3]'), 'init-constants')).toEqual(['_x[0][2] = 3.0;'])
    expect(genJS(vars.get('_x[_b2,_a1]'), 'init-constants')).toEqual(['_x[1][0] = 4.0;'])
    expect(genJS(vars.get('_x[_b2,_a2]'), 'init-constants')).toEqual(['_x[1][1] = 5.0;'])
    expect(genJS(vars.get('_x[_b2,_a3]'), 'init-constants')).toEqual(['_x[1][2] = 6.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = _x[1][2];'])
  })

  it('should work for equation with one dimension', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x[DimA] = 1, 2 ~~|
    //   y[DimA] = (x[DimA] + 2) * MIN(0, x[DimA]) ~~|
    //   z = y[A2] ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>(x[DimA] + 2) * MIN(0, x[DimA])</eqn>
</aux>
<aux name="z">
  <eqn>y[A2]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_x[_a1]'), 'init-constants')).toEqual(['_x[0] = 1.0;'])
    expect(genJS(vars.get('_x[_a2]'), 'init-constants')).toEqual(['_x[1] = 2.0;'])
    expect(genJS(vars.get('_y'))).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_y[i] = (_x[i] + 2.0) * fns.MIN(0.0, _x[i]);',
      '}'
    ])
    expect(genJS(vars.get('_z'))).toEqual(['_z = _y[1];'])
  })

  it('should work for equation with two dimensions', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   DimB: B1, B2 ~~|
    //   x[DimA, DimB] = 1, 2; 3, 4; ~~|
    //   y[DimA, DimB] = (x[DimA, DimB] + 2) * MIN(0, x[DimA, DimB]) ~~|
    //   z = y[A2, B1] ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="A1,B1">
    <eqn>1</eqn>
  </element>
  <element subscript="A1,B2">
    <eqn>2</eqn>
  </element>
  <element subscript="A2,B1">
    <eqn>3</eqn>
  </element>
  <element subscript="A2,B2">
    <eqn>4</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>(x[DimA, DimB] + 2) * MIN(0, x[DimA, DimB])</eqn>
</aux>
<aux name="z">
  <eqn>y[A2, B1]</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(6)
    expect(genJS(vars.get('_x[_a1,_b1]'), 'init-constants')).toEqual(['_x[0][0] = 1.0;'])
    expect(genJS(vars.get('_x[_a1,_b2]'), 'init-constants')).toEqual(['_x[0][1] = 2.0;'])
    expect(genJS(vars.get('_x[_a2,_b1]'), 'init-constants')).toEqual(['_x[1][0] = 3.0;'])
    expect(genJS(vars.get('_x[_a2,_b2]'), 'init-constants')).toEqual(['_x[1][1] = 4.0;'])
    expect(genJS(vars.get('_y'))).toEqual([
      'for (let i = 0; i < 2; i++) {',
      'for (let j = 0; j < 2; j++) {',
      '_y[i][j] = (_x[i][j] + 2.0) * fns.MIN(0.0, _x[i][j]);',
      '}',
      '}'
    ])
    expect(genJS(vars.get('_z'))).toEqual(['_z = _y[1][0];'])
  })

  //
  // NOTE: We omit the tests for all the different variations of subscripted variables (like we have in
  // `gen-equation-{c,js}-from-vensim.spec.ts`) because XMILE has a simpler subset of supported cases,
  // and these are already well covered by the other tests.  If there are any XMILE-specific cases, we
  // can add tests for those here.
  //

  it('should work for ABS function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = ABS(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>ABS(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.ABS(_x);'])
  })

  // TODO: This test is skipped for now; in Stella, the function is called `ALLOCATE` and we will need to see
  // if the Vensim `ALLOCATE AVAILABLE` function is compatible enough
  it.skip('should work for ALLOCATE AVAILABLE function', () => {
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
    expect(genJS(vars.get('_supply_available'))).toEqual(['_supply_available = 200.0;'])
    expect(genJS(vars.get('_demand[_boston]'))).toEqual(['_demand[0] = 500.0;'])
    expect(genJS(vars.get('_demand[_dayton]'))).toEqual(['_demand[1] = 300.0;'])
    expect(genJS(vars.get('_demand[_fresno]'))).toEqual(['_demand[2] = 750.0;'])
    expect(genJS(vars.get('_priority[_boston,_ptype]'))).toEqual(['_priority[0][0] = 1.0;'])
    expect(genJS(vars.get('_priority[_boston,_ppriority]'))).toEqual(['_priority[0][1] = 5.0;'])
    expect(genJS(vars.get('_priority[_dayton,_ptype]'))).toEqual(['_priority[1][0] = 1.0;'])
    expect(genJS(vars.get('_priority[_dayton,_ppriority]'))).toEqual(['_priority[1][1] = 7.0;'])
    expect(genJS(vars.get('_priority[_fresno,_ptype]'))).toEqual(['_priority[2][0] = 1.0;'])
    expect(genJS(vars.get('_priority[_fresno,_ppriority]'))).toEqual(['_priority[2][1] = 3.0;'])
    // expect(genJS(vars.get('_shipments'))).toEqual([
    //   'let __t1 = fns.ALLOCATE_AVAILABLE(_demand, _priority, _supply_available, 3);',
    //   'for (let i = 0; i < 3; i++) {',
    //   '_shipments[i] = __t1[_branch[i]];',
    //   '}'
    // ])
    expect(() => genJS(vars.get('_shipments'))).toThrow(
      'ALLOCATE AVAILABLE function not yet implemented for JS code gen'
    )
  })

  // TODO: Copy more tests from gen-equation-c.spec.ts once we implement ALLOCATE AVAILABLE
  // for JS code gen

  it('should work for ARCCOS function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = ARCCOS(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>ARCCOS(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.ARCCOS(_x);'])
  })

  it('should work for ARCSIN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = ARCSIN(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>ARCSIN(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.ARCSIN(_x);'])
  })

  it('should work for ARCTAN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = ARCTAN(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>ARCTAN(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.ARCTAN(_x);'])
  })

  it('should work for COS function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = COS(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>COS(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.COS(_x);'])
  })

  // TODO: Subscripted variants
  it('should work for DELAY1 function (without initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = DELAY1(x, 5) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>DELAY1(x, 5)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _x * 5.0;'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual(['__level1 = fns.INTEG(__level1, _x - _y);'])
    expect(genJS(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = 5.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = (__level1 / __aux1);'])
  })

  it('should work for DELAY1 function (with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   init = 2 ~~|
    //   y = DELAY1I(x, 5, init) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="init">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>DELAY1(x, 5, init)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(5)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_init'))).toEqual(['_init = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _init * 5.0;'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual(['__level1 = fns.INTEG(__level1, _x - _y);'])
    expect(genJS(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = 5.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = (__level1 / __aux1);'])
  })

  it('should work for DELAY3 function (without initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = DELAY3(x, 5) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>DELAY3(x, 5)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(9)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _x * ((5.0) / 3.0);'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual(['__level1 = fns.INTEG(__level1, _x - __aux1);'])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _x * ((5.0) / 3.0);'])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual(['__level2 = fns.INTEG(__level2, __aux1 - __aux2);'])
    expect(genJS(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = _x * ((5.0) / 3.0);'])
    expect(genJS(vars.get('__level3'), 'eval')).toEqual(['__level3 = fns.INTEG(__level3, __aux2 - __aux3);'])
    expect(genJS(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = __level1 / ((5.0) / 3.0);'])
    expect(genJS(vars.get('__aux2'), 'eval')).toEqual(['__aux2 = __level2 / ((5.0) / 3.0);'])
    expect(genJS(vars.get('__aux3'), 'eval')).toEqual(['__aux3 = __level3 / ((5.0) / 3.0);'])
    expect(genJS(vars.get('__aux4'), 'eval')).toEqual(['__aux4 = ((5.0) / 3.0);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = (__level3 / __aux4);'])
  })

  it('should work for DELAY3 function (with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   init = 2 ~~|
    //   y = DELAY3I(x, 5, init) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="init">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>DELAY3(x, 5, init)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(10)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_init'))).toEqual(['_init = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _init * ((5.0) / 3.0);'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual(['__level1 = fns.INTEG(__level1, _x - __aux1);'])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _init * ((5.0) / 3.0);'])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual(['__level2 = fns.INTEG(__level2, __aux1 - __aux2);'])
    expect(genJS(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = _init * ((5.0) / 3.0);'])
    expect(genJS(vars.get('__level3'), 'eval')).toEqual(['__level3 = fns.INTEG(__level3, __aux2 - __aux3);'])
    expect(genJS(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = __level1 / ((5.0) / 3.0);'])
    expect(genJS(vars.get('__aux2'), 'eval')).toEqual(['__aux2 = __level2 / ((5.0) / 3.0);'])
    expect(genJS(vars.get('__aux3'), 'eval')).toEqual(['__aux3 = __level3 / ((5.0) / 3.0);'])
    expect(genJS(vars.get('__aux4'), 'eval')).toEqual(['__aux4 = ((5.0) / 3.0);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = (__level3 / __aux4);'])
  })

  it('should work for DELAY3 function (1D with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x[DimA] = 1, 2 ~~|
    //   init[DimA] = 2, 3 ~~|
    //   y[DimA] = DELAY3I(x[DimA], 5, init[DimA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>2</eqn>
  </element>
  <element subscript="A2">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>DELAY3(x[DimA], 5, init[DimA])</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(12)
    expect(genJS(vars.get('_x[_a1]'))).toEqual(['_x[0] = 1.0;'])
    expect(genJS(vars.get('_x[_a2]'))).toEqual(['_x[1] = 2.0;'])
    expect(genJS(vars.get('_init[_a1]'))).toEqual(['_init[0] = 2.0;'])
    expect(genJS(vars.get('_init[_a2]'))).toEqual(['_init[1] = 3.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level1[i] = _init[i] * ((5.0) / 3.0);',
      '}'
    ])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level1[i] = fns.INTEG(__level1[i], _x[i] - __aux1[i]);',
      '}'
    ])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level2[i] = _init[i] * ((5.0) / 3.0);',
      '}'
    ])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level2[i] = fns.INTEG(__level2[i], __aux1[i] - __aux2[i]);',
      '}'
    ])
    expect(genJS(vars.get('__level3'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level3[i] = _init[i] * ((5.0) / 3.0);',
      '}'
    ])
    expect(genJS(vars.get('__level3'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level3[i] = fns.INTEG(__level3[i], __aux2[i] - __aux3[i]);',
      '}'
    ])
    expect(genJS(vars.get('__aux1'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__aux1[i] = __level1[i] / ((5.0) / 3.0);',
      '}'
    ])
    expect(genJS(vars.get('__aux2'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__aux2[i] = __level2[i] / ((5.0) / 3.0);',
      '}'
    ])
    expect(genJS(vars.get('__aux3'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__aux3[i] = __level3[i] / ((5.0) / 3.0);',
      '}'
    ])
    expect(genJS(vars.get('__aux4'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__aux4[i] = ((5.0) / 3.0);',
      '}'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['for (let i = 0; i < 2; i++) {', '_y[i] = (__level3[i] / __aux4[i]);', '}'])
  })

  // TODO: This test is skipped for now; in Stella, the DELAY function can be called with or
  // without an initial value argument, but the code that handles the Vensim DELAY FIXED function
  // currently assumes the initial value argument
  it.skip('should work for DELAY FIXED function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      init = 2 ~~|
      y = DELAY FIXED(x, 5, init) ~~|
    `)
    expect(vars.size).toBe(3)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_init'))).toEqual(['_init = 2.0;'])
    // expect(genJS(vars.get('_y'), 'init-levels')).toEqual([
    //   '_y = _init;',
    //   '__fixed_delay1 = __new_fixed_delay(__fixed_delay1, 5.0, _init);'
    // ])
    // expect(genJS(vars.get('_y'), 'eval')).toEqual(['_y = fns.DELAY_FIXED(_x, __fixed_delay1);'])
    expect(() => genJS(vars.get('_y'), 'init-levels')).toThrow(
      'DELAY FIXED function not yet implemented for JS code gen'
    )
    expect(() => genJS(vars.get('_y'), 'eval')).toThrow('DELAY FIXED function not yet implemented for JS code gen')
  })

  it('should work for EXP function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = EXP(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>EXP(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.EXP(_x);'])
  })

  // TODO: Implement this test once we support the GAMMALN function for XMILE+JS
  it.skip('should work for GAMMALN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = GAMMA LN(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>GAMMALN(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    // expect(genJS(vars.get('_y'))).toEqual(['_y = fns.GAMMA_LN(_x);'])
    expect(() => genJS(vars.get('_y'))).toThrow('GAMMA_LN function not yet implemented for JS code gen')
  })

  it('should work for IF THEN ELSE function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = ABS(1) ~~|
    //   y = IF THEN ELSE(x > 0, 1, x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>ABS(1)</eqn>
</aux>
<aux name="y">
  <eqn>IF x > 0 THEN 1 ELSE x</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = fns.ABS(1.0);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = ((_x > 0.0) ? (1.0) : (_x));'])
  })

  it('should work for INIT function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = Time * 2 ~~|
    //   y = INITIAL(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>Time * 2</eqn>
</aux>
<aux name="y">
  <eqn>INIT(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'), 'init-levels')).toEqual(['_x = _time * 2.0;'])
    expect(genJS(vars.get('_x'), 'eval')).toEqual(['_x = _time * 2.0;'])
    expect(genJS(vars.get('_y'), 'init-levels')).toEqual(['_y = _x;'])
  })

  it('should work for INTEG function (synthesized from <stock> variable definition)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = Time * 2 ~~|
    //   y = INTEG(x, 10) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>Time * 2</eqn>
</aux>
<stock name="y">
  <eqn>10</eqn>
  <inflow>x</inflow>
</stock>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'), 'eval')).toEqual(['_x = _time * 2.0;'])
    expect(genJS(vars.get('_y'), 'init-levels')).toEqual(['_y = 10.0;'])
    expect(genJS(vars.get('_y'), 'eval')).toEqual(['_y = fns.INTEG(_y, _x);'])
  })

  it('should work for INTEG function (synthesized from <stock> variable definition with one dimension)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   rate[DimA] = 10, 20 ~~|
    //   init[DimA] = 1, 2 ~~|
    //   y[DimA] = INTEG(rate[DimA], init[DimA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="rate">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<stock name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>init[DimA]</eqn>
  <inflow>rate[DimA]</inflow>
</stock>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(5)
    expect(genJS(vars.get('_rate[_a1]'), 'init-constants')).toEqual(['_rate[0] = 10.0;'])
    expect(genJS(vars.get('_rate[_a2]'), 'init-constants')).toEqual(['_rate[1] = 20.0;'])
    expect(genJS(vars.get('_init[_a1]'), 'init-constants')).toEqual(['_init[0] = 1.0;'])
    expect(genJS(vars.get('_init[_a2]'), 'init-constants')).toEqual(['_init[1] = 2.0;'])
    expect(genJS(vars.get('_y'), 'init-levels')).toEqual(['for (let i = 0; i < 2; i++) {', '_y[i] = _init[i];', '}'])
    expect(genJS(vars.get('_y'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '_y[i] = fns.INTEG(_y[i], _rate[i]);',
      '}'
    ])
  })

  it('should work for INTEG function (synthesized from <stock> variable definition with SUM used in arguments)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   rate[DimA] = 10, 20 ~~|
    //   init[DimA] = 1, 2 ~~|
    //   y = INTEG(SUM(rate[DimA!]), SUM(init[DimA!])) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="rate">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<stock name="y">
  <eqn>SUM(init[*])</eqn>
  <inflow>SUM(rate[*])</inflow>
</stock>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(5)
    expect(genJS(vars.get('_rate[_a1]'), 'init-constants')).toEqual(['_rate[0] = 10.0;'])
    expect(genJS(vars.get('_rate[_a2]'), 'init-constants')).toEqual(['_rate[1] = 20.0;'])
    expect(genJS(vars.get('_init[_a1]'), 'init-constants')).toEqual(['_init[0] = 1.0;'])
    expect(genJS(vars.get('_init[_a2]'), 'init-constants')).toEqual(['_init[1] = 2.0;'])
    expect(genJS(vars.get('_y'), 'init-levels')).toEqual([
      'let __t1 = 0.0;',
      'for (let u = 0; u < 2; u++) {',
      '__t1 += _init[u];',
      '}',
      '_y = __t1;'
    ])
    expect(genJS(vars.get('_y'), 'eval')).toEqual([
      'let __t2 = 0.0;',
      'for (let u = 0; u < 2; u++) {',
      '__t2 += _rate[u];',
      '}',
      '_y = fns.INTEG(_y, __t2);'
    ])
  })

  it('should work for INT function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = INTEGER(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>INT(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.INTEGER(_x);'])
  })

  it('should work for LN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = LN(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>LN(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.LN(_x);'])
  })

  it('should work for LOOKUP function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x((0,0),(1,1),(2,2)) ~~|
    //   y = x(1.5) ~~|
    // `)

    const xmileVars = `\
<gf name="x" type="continuous">
  <xpts>0,1,2</xpts>
  <ypts>0,1,2</ypts>
</gf>
<aux name="y">
  <eqn>LOOKUP(x, 1.5)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'), 'decl')).toEqual(['const _x_data_ = [0.0, 0.0, 1.0, 1.0, 2.0, 2.0];'])
    expect(genJS(vars.get('_x'), 'init-lookups')).toEqual(['_x = fns.createLookup(3, _x_data_);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.LOOKUP(_x, 1.5);'])
  })

  it('should work for LOOKUPINV function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x((0,0),(1,1),(2,2)) ~~|
    //   y = LOOKUP INVERT(x, 1.5) ~~|
    // `)

    const xmileVars = `\
<gf name="x" type="continuous">
  <xpts>0,1,2</xpts>
  <ypts>0,1,2</ypts>
</gf>
<aux name="y">
  <eqn>LOOKUPINV(x, 1.5)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'), 'decl')).toEqual(['const _x_data_ = [0.0, 0.0, 1.0, 1.0, 2.0, 2.0];'])
    expect(genJS(vars.get('_x'), 'init-lookups')).toEqual(['_x = fns.createLookup(3, _x_data_);'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.LOOKUP_INVERT(_x, 1.5);'])
  })

  it('should work for MAX function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = MAX(x, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>MAX(x, 0)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.MAX(_x, 0.0);'])
  })

  it('should work for MIN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = MIN(x, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>MIN(x, 0)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.MIN(_x, 0.0);'])
  })

  it('should work for MOD function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = MODULO(x, 2) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>MOD(x, 2)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.MODULO(_x, 2.0);'])
  })

  // TODO: This test is skipped because Stella's NPV function takes 2 or 3 arguments, but Vensim's
  // takes 4 arguments, so it is not implemented yet in SDE
  it.skip('should work for NPV function', () => {
    const vars = readInlineModel(`
      time step = 1 ~~|
      stream = 100 ~~|
      discount rate = 10 ~~|
      init = 0 ~~|
      factor = 2 ~~|
      y = NPV(stream, discount rate, init, factor) ~~|
    `)
    expect(vars.size).toBe(9)
    expect(genJS(vars.get('_stream'))).toEqual(['_stream = 100.0;'])
    expect(genJS(vars.get('_discount_rate'))).toEqual(['_discount_rate = 10.0;'])
    expect(genJS(vars.get('_init'))).toEqual(['_init = 0.0;'])
    expect(genJS(vars.get('_factor'))).toEqual(['_factor = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = 1.0;'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = fns.INTEG(__level1, (-__level1 * _discount_rate) / (1.0 + _discount_rate * _time_step));'
    ])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _init;'])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual(['__level2 = fns.INTEG(__level2, _stream * __level1);'])
    expect(genJS(vars.get('__aux1'), 'eval')).toEqual([
      '__aux1 = (__level2 + _stream * _time_step * __level1) * _factor;'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['_y = __aux1;'])
  })

  // TODO: This test is skipped because Stella's PULSE function takes 1 or 3 arguments, but Vensim's
  // takes 2 arguments, so it is not implemented yet in SDE
  it.skip('should work for PULSE function', () => {
    const vars = readInlineModel(`
      x = 10 ~~|
      y = PULSE(x, 20) ~~|
    `)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 10.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.PULSE(_x, 20.0);'])
  })

  it('should work for RAMP function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   slope = 100 ~~|
    //   start = 1 ~~|
    //   end = 10 ~~|
    //   y = RAMP(slope, start, end) ~~|
    // `)

    const xmileVars = `\
<aux name="slope">
  <eqn>100</eqn>
</aux>
<aux name="start">
  <eqn>1</eqn>
</aux>
<aux name="end">
  <eqn>10</eqn>
</aux>
<aux name="y">
  <eqn>RAMP(slope, start, end)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_slope'))).toEqual(['_slope = 100.0;'])
    expect(genJS(vars.get('_start'))).toEqual(['_start = 1.0;'])
    expect(genJS(vars.get('_end'))).toEqual(['_end = 10.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.RAMP(_slope, _start, _end);'])
  })

  it('should work for SAFEDIV function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = ZIDZ(x, 2) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>SAFEDIV(x, 2)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.ZIDZ(_x, 2.0);'])
  })

  it('should work for SIN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = SIN(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>SIN(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.SIN(_x);'])
  })

  it('should work for SMTH1 function (without initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   delay = 2 ~~|
    //   y = SMOOTH(input, delay) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>SMTH1(input, delay)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_input'))).toEqual(['_input = 1.0;'])
    expect(genJS(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _input;'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = fns.INTEG(__level1, (_input - __level1) / _delay);'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['_y = __level1;'])
  })

  it('should work for SMTH1 function (with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   delay = 2 ~~|
    //   y = SMOOTHI(input, delay, 5) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>SMTH1(input, delay, 5)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_input'))).toEqual(['_input = 1.0;'])
    expect(genJS(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = 5.0;'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = fns.INTEG(__level1, (_input - __level1) / _delay);'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['_y = __level1;'])
  })

  it('should work for SMTH3 function (without initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   delay = 2 ~~|
    //   y = SMOOTH3(input, delay) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>SMTH3(input, delay)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(6)
    expect(genJS(vars.get('_input'))).toEqual(['_input = 1.0;'])
    expect(genJS(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _input;'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = fns.INTEG(__level1, (_input - __level1) / (_delay / 3.0));'
    ])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = _input;'])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual([
      '__level2 = fns.INTEG(__level2, (__level1 - __level2) / (_delay / 3.0));'
    ])
    expect(genJS(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = _input;'])
    expect(genJS(vars.get('__level3'), 'eval')).toEqual([
      '__level3 = fns.INTEG(__level3, (__level2 - __level3) / (_delay / 3.0));'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['_y = __level3;'])
  })

  it('should work for SMTH3 function (no dimensions with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   delay = 2 ~~|
    //   y = SMOOTH3I(input, delay, 5) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>SMTH3(input, delay, 5)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(6)
    expect(genJS(vars.get('_input'))).toEqual(['_input = 1.0;'])
    expect(genJS(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = 5.0;'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      '__level1 = fns.INTEG(__level1, (_input - __level1) / (_delay / 3.0));'
    ])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual(['__level2 = 5.0;'])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual([
      '__level2 = fns.INTEG(__level2, (__level1 - __level2) / (_delay / 3.0));'
    ])
    expect(genJS(vars.get('__level3'), 'init-levels')).toEqual(['__level3 = 5.0;'])
    expect(genJS(vars.get('__level3'), 'eval')).toEqual([
      '__level3 = fns.INTEG(__level3, (__level2 - __level3) / (_delay / 3.0));'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['_y = __level3;'])
  })

  it('should work for SMTH3 function (1D with subscripted delay parameter and initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   input[DimA] = 1 ~~|
    //   delay[DimA] = 2 ~~|
    //   y[DimA] = SMOOTH3I(input[DimA], delay[DimA], 5) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="input">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>2</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>SMTH3(input[DimA], delay[DimA], 5)</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(6)
    expect(genJS(vars.get('_input'))).toEqual(['for (let i = 0; i < 2; i++) {', '_input[i] = 1.0;', '}'])
    expect(genJS(vars.get('_delay'))).toEqual(['for (let i = 0; i < 2; i++) {', '_delay[i] = 2.0;', '}'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level1[i] = 5.0;',
      '}'
    ])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level1[i] = fns.INTEG(__level1[i], (_input[i] - __level1[i]) / (_delay[i] / 3.0));',
      '}'
    ])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level2[i] = 5.0;',
      '}'
    ])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level2[i] = fns.INTEG(__level2[i], (__level1[i] - __level2[i]) / (_delay[i] / 3.0));',
      '}'
    ])
    expect(genJS(vars.get('__level3'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level3[i] = 5.0;',
      '}'
    ])
    expect(genJS(vars.get('__level3'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level3[i] = fns.INTEG(__level3[i], (__level2[i] - __level3[i]) / (_delay[i] / 3.0));',
      '}'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['for (let i = 0; i < 2; i++) {', '_y[i] = __level3[i];', '}'])
  })

  it('should work for SMTH3 function (1D with non-subscripted delay parameter and initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   input[DimA] = 1 ~~|
    //   delay = 2 ~~|
    //   y[DimA] = SMOOTH3I(input[DimA], delay, 5) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="input">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>SMTH3(input[DimA], delay, 5)</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(6)
    expect(genJS(vars.get('_input'))).toEqual(['for (let i = 0; i < 2; i++) {', '_input[i] = 1.0;', '}'])
    expect(genJS(vars.get('_delay'))).toEqual(['_delay = 2.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level1[i] = 5.0;',
      '}'
    ])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level1[i] = fns.INTEG(__level1[i], (_input[i] - __level1[i]) / (_delay / 3.0));',
      '}'
    ])
    expect(genJS(vars.get('__level2'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level2[i] = 5.0;',
      '}'
    ])
    expect(genJS(vars.get('__level2'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level2[i] = fns.INTEG(__level2[i], (__level1[i] - __level2[i]) / (_delay / 3.0));',
      '}'
    ])
    expect(genJS(vars.get('__level3'), 'init-levels')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level3[i] = 5.0;',
      '}'
    ])
    expect(genJS(vars.get('__level3'), 'eval')).toEqual([
      'for (let i = 0; i < 2; i++) {',
      '__level3[i] = fns.INTEG(__level3[i], (__level2[i] - __level3[i]) / (_delay / 3.0));',
      '}'
    ])
    expect(genJS(vars.get('_y'))).toEqual(['for (let i = 0; i < 2; i++) {', '_y[i] = __level3[i];', '}'])
  })

  it('should work for SQRT function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = SQRT(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>SQRT(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.SQRT(_x);'])
  })

  it('should work for STEP function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = STEP(x, 10) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>STEP(x, 10)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.STEP(_x, 10.0);'])
  })

  it('should work for SUM function (single call)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   a[DimA] = 10, 20 ~~|
    //   x = SUM(a[DimA!]) + 1 ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="a">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
</aux>
<aux name="x">
  <eqn>SUM(a[*]) + 1</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(3)
    expect(genJS(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 10.0;'])
    expect(genJS(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 20.0;'])
    expect(genJS(vars.get('_x'))).toEqual([
      'let __t1 = 0.0;',
      'for (let u = 0; u < 2; u++) {',
      '__t1 += _a[u];',
      '}',
      '_x = __t1 + 1.0;'
    ])
  })

  it('should work for SUM function (multiple calls)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   DimB: B1, B2 ~~|
    //   a[DimA] = 10, 20 ~~|
    //   b[DimB] = 50, 60 ~~|
    //   c[DimA] = 1, 2 ~~|
    //   x = SUM(a[DimA!]) + SUM(b[DimB!]) + SUM(c[DimA!]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>`
    const xmileVars = `\
<aux name="a">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
</aux>
<aux name="b">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="B1">
    <eqn>50</eqn>
  </element>
  <element subscript="B2">
    <eqn>60</eqn>
  </element>
</aux>
<aux name="c">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="x">
  <eqn>SUM(a[*]) + SUM(b[*]) + SUM(c[*])</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(7)
    expect(genJS(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 10.0;'])
    expect(genJS(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 20.0;'])
    expect(genJS(vars.get('_b[_b1]'), 'init-constants')).toEqual(['_b[0] = 50.0;'])
    expect(genJS(vars.get('_b[_b2]'), 'init-constants')).toEqual(['_b[1] = 60.0;'])
    expect(genJS(vars.get('_c[_a1]'), 'init-constants')).toEqual(['_c[0] = 1.0;'])
    expect(genJS(vars.get('_c[_a2]'), 'init-constants')).toEqual(['_c[1] = 2.0;'])
    expect(genJS(vars.get('_x'))).toEqual([
      'let __t1 = 0.0;',
      'for (let u = 0; u < 2; u++) {',
      '__t1 += _a[u];',
      '}',
      'let __t2 = 0.0;',
      'for (let v = 0; v < 2; v++) {',
      '__t2 += _b[v];',
      '}',
      'let __t3 = 0.0;',
      'for (let u = 0; u < 2; u++) {',
      '__t3 += _c[u];',
      '}',
      '_x = __t1 + __t2 + __t3;'
    ])
  })

  it('should work for SUM function (with nested function call)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   a[DimA] = 10, 20 ~~|
    //   x = SUM(IF THEN ELSE(a[DimA!] = 10, 0, a[DimA!])) + 1 ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="a">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
</aux>
<aux name="x">
  <eqn>SUM(IF a[*] = 10 THEN 0 ELSE a[*]) + 1</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(3)
    expect(genJS(vars.get('_a[_a1]'), 'init-constants')).toEqual(['_a[0] = 10.0;'])
    expect(genJS(vars.get('_a[_a2]'), 'init-constants')).toEqual(['_a[1] = 20.0;'])
    expect(genJS(vars.get('_x'))).toEqual([
      'let __t1 = 0.0;',
      'for (let u = 0; u < 2; u++) {',
      '__t1 += ((_a[u] === 10.0) ? (0.0) : (_a[u]));',
      '}',
      '_x = __t1 + 1.0;'
    ])
  })

  it('should work for TAN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = TAN(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>TAN(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(2)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = fns.TAN(_x);'])
  })

  it('should work for TREND function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = TREND(x, 10, 2) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>TREND(x, 10, 2)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars.size).toBe(4)
    expect(genJS(vars.get('_x'))).toEqual(['_x = 1.0;'])
    expect(genJS(vars.get('__level1'), 'init-levels')).toEqual(['__level1 = _x / (1.0 + 2.0 * 10.0);'])
    expect(genJS(vars.get('__level1'), 'eval')).toEqual(['__level1 = fns.INTEG(__level1, (_x - __level1) / 10.0);'])
    expect(genJS(vars.get('__aux1'), 'eval')).toEqual(['__aux1 = fns.ZIDZ(_x - __level1, 10.0 * fns.ABS(__level1));'])
    expect(genJS(vars.get('_y'))).toEqual(['_y = __aux1;'])
  })
})
