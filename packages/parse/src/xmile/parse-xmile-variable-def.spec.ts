// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { XmlElement } from '@rgrove/parse-xml'
import { parseXml } from '@rgrove/parse-xml'

import { binaryOp, call, exprEqn, num, varDef, varRef } from '../ast/ast-builders'

import { parseXmileVariableDef } from './parse-xmile-variable-def'

function xml(input: string): XmlElement {
  let xml
  try {
    xml = parseXml(input)
  } catch (e) {
    throw new Error(`Invalid XML:\n${input}\n\n${e}`)
  }
  return xml.root
}

describe('parseXmileVariableDef with <stock>', () => {
  it('should parse a stock variable definition (without subscripts, single inflow)', () => {
    const v = xml(`
      <stock name="x">
        <eqn>y + 10</eqn>
        <inflow>z * 2</inflow>
      </stock>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(varDef('x'), call('INTEG', binaryOp(varRef('z'), '*', num(2)), binaryOp(varRef('y'), '+', num(10))))
    ])
  })

  it('should parse a stock variable definition (with one dimension, apply-to-all, single inflow)', () => {
    const v = xml(`
      <stock name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <eqn>y[DimA] + 10</eqn>
        <inflow>z * 2</inflow>
      </stock>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(
        varDef('x', ['DimA']),
        call('INTEG', binaryOp(varRef('z'), '*', num(2)), binaryOp(varRef('y', ['DimA']), '+', num(10)))
      )
    ])
  })

  it('should parse a stock variable definition (with one dimension, non-apply-to-all, single inflow)', () => {
    const v = xml(`
      <stock name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <element subscript="A1">
          <eqn>y[A1] + 10</eqn>
          <inflow>z * 2</inflow>
        </element>
        <element subscript="A2">
          <eqn>y[A2] + 20</eqn>
          <inflow>z * 3</inflow>
        </element>
      </stock>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(
        varDef('x', ['A1']),
        call('INTEG', binaryOp(varRef('z'), '*', num(2)), binaryOp(varRef('y', ['A1']), '+', num(10)))
      ),
      exprEqn(
        varDef('x', ['A2']),
        call('INTEG', binaryOp(varRef('z'), '*', num(3)), binaryOp(varRef('y', ['A2']), '+', num(20)))
      )
    ])
  })

  it('should throw an error if stock variable definition has no <eqn>', () => {
    const v = xml(`
      <stock name="x">
      </stock>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <eqn> is required for a <stock> variable')
  })

  it('should throw an error if stock variable definition has no <inflow>', () => {
    const v = xml(`
      <stock name="x">
        <eqn>y + 10</eqn>
      </stock>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently only one <inflow> is supported for a <stock> variable')
  })

  // TODO: Support multiple inflows
  it('should throw an error if stock variable definition has multiple <inflow>', () => {
    const v = xml(`
      <stock name="x">
        <eqn>y + 10</eqn>
        <inflow>z * 2</inflow>
        <inflow>q + 4</inflow>
      </stock>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently only one <inflow> is supported for a <stock> variable')
  })

  // TODO: Support <conveyor>
  it('should throw an error if stock variable definition has <conveyor>', () => {
    const v = xml(`
      <stock name="x">
        <eqn>1000</eqn>
        <inflow>matriculating</inflow>
        <outflow>graduating</outflow>
        <conveyor>
          <len>4</len>
          <capacity>1200</capacity>
        </conveyor>
      </stock>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <conveyor> is not supported for a <stock> variable')
  })

  // TODO: Support <queue>
  it('should throw an error if stock variable definition has <queue>', () => {
    const v = xml(`
      <stock name="x">
        <eqn>1000</eqn>
        <inflow>matriculating</inflow>
        <outflow>graduating</outflow>
        <queue />
      </stock>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <queue> is not supported for a <stock> variable')
  })

  // TODO: Support <non_negative>
  it('should throw an error if stock variable definition has <non_negative>', () => {
    const v = xml(`
      <stock name="x">
        <eqn>1000</eqn>
        <inflow>matriculating</inflow>
        <outflow>graduating</outflow>
        <non_negative />
      </stock>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <non_negative> is not supported for a <stock> variable')
  })
})

describe('parseXmileVariableDef with <flow>', () => {
  it('should parse a flow variable definition (without subscripts)', () => {
    const v = xml(`
      <flow name="x">
        <eqn>y + 10</eqn>
      </flow>
    `)
    expect(parseXmileVariableDef(v)).toEqual([exprEqn(varDef('x'), binaryOp(varRef('y'), '+', num(10)))])
  })

  it('should parse a flow variable definition (with one dimension, apply to all)', () => {
    const v = xml(`
      <flow name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <eqn>y[DimA] + 10</eqn>
      </flow>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(varDef('x', ['DimA']), binaryOp(varRef('y', ['DimA']), '+', num(10)))
    ])
  })

  it('should parse a flow variable definition (with one dimension, non-apply-to-all, named subscripts)', () => {
    const v = xml(`
      <flow name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <element subscript="A1">
          <eqn>y[A1] + 10</eqn>
        </element>
        <element subscript="A2">
          <eqn>20</eqn>
        </element>
      </flow>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(varDef('x', ['A1']), binaryOp(varRef('y', ['A1']), '+', num(10))),
      exprEqn(varDef('x', ['A2']), num(20))
    ])
  })

  it('should throw an error if flow variable definition has no <eqn>', () => {
    const v = xml(`
      <flow name="x">
      </flow>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <eqn> is required for a <flow> variable')
  })

  // TODO: Support <multiplier>
  it('should throw an error if flow variable definition has <multiplier>', () => {
    const v = xml(`
      <flow name="x">
        <eqn>y + 10</eqn>
        <multiplier>3</multiplier>
      </flow>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <multiplier> is not supported for a <flow> variable')
  })

  // TODO: Support <non_negative>
  it('should throw an error if flow variable definition has <non_negative>', () => {
    const v = xml(`
      <flow name="x">
        <eqn>1000</eqn>
        <non_negative />
      </flow>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <non_negative> is not supported for a <flow> variable')
  })

  // TODO: Support <overflow>
  it('should throw an error if flow variable definition has <overflow>', () => {
    const v = xml(`
      <flow name="x">
        <eqn>1000</eqn>
        <overflow />
      </flow>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <overflow> is not supported for a <flow> variable')
  })

  // TODO: Support <leak>
  it('should throw an error if flow variable definition has <leak>', () => {
    const v = xml(`
      <flow name="x">
        <eqn>1000</eqn>
        <leak>0.1</leak>
      </flow>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <leak> is not supported for a <flow> variable')
  })
})

describe('parseXmileVariableDef with <aux>', () => {
  it('should parse an aux variable definition (without subscripts)', () => {
    const v = xml(`
      <aux name="x">
        <eqn>y + 10</eqn>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([exprEqn(varDef('x'), binaryOp(varRef('y'), '+', num(10)))])
  })

  it('should parse an aux variable definition (with one dimension, apply to all)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <eqn>y[DimA] + 10</eqn>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(varDef('x', ['DimA']), binaryOp(varRef('y', ['DimA']), '+', num(10)))
    ])
  })

  it('should parse an aux variable definition (with one dimension, non-apply-to-all, named subscripts)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <element subscript="A1">
          <eqn>y[A1] + 10</eqn>
        </element>
        <element subscript="A2">
          <eqn>20</eqn>
        </element>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(varDef('x', ['A1']), binaryOp(varRef('y', ['A1']), '+', num(10))),
      exprEqn(varDef('x', ['A2']), num(20))
    ])
  })

  it('should parse an aux variable definition with XMILE conditional expression', () => {
    const v = xml(`
      <aux name="x">
        <eqn>IF c > 10 THEN y + 3 ELSE z * 5</eqn>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(
        varDef('x'),
        call(
          'IF THEN ELSE',
          binaryOp(varRef('c'), '>', num(10)),
          binaryOp(varRef('y'), '+', num(3)),
          binaryOp(varRef('z'), '*', num(5))
        )
      )
    ])
  })

  it('should throw an error if aux variable equation cannot be parsed', () => {
    const v = xml(`
      <aux name="x">
        <eqn>y ? 10</eqn>
      </aux>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow(`token recognition error at: '?'`)
  })

  it('should parse a constant definition (without subscripts)', () => {
    const v = xml(`
      <aux name="x">
        <eqn>1</eqn>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([exprEqn(varDef('x'), num(1))])
  })

  it('should parse a constant definition (with one dimension, apply-to-all)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <eqn>1</eqn>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([exprEqn(varDef('x', ['DimA']), num(1))])
  })

  it('should parse a constant definition (with one dimension, non-apply-to-all, named subscripts)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <element subscript="A1">
          <eqn>1</eqn>
        </element>
        <element subscript="A2">
          <eqn>2</eqn>
        </element>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(varDef('x', ['A1']), num(1)),
      exprEqn(varDef('x', ['A2']), num(2))
    ])
  })

  // TODO: Support numeric subscript indices
  it('should parse a constant definition (with one dimension, non-apply-to-all, numeric subscripts)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
        </dimensions>
        <element subscript="1">
          <eqn>1</eqn>
        </element>
        <element subscript="2">
          <eqn>1</eqn>
        </element>
      </aux>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Numeric subscript indices are not currently supported')
  })

  it('should parse a constant definition (with two dimensions, apply-to-all)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
          <dim name="DimB" />
        </dimensions>
        <eqn>1</eqn>
      </aux>
    `)
    expect(parseXmileVariableDef(v)).toEqual([exprEqn(varDef('x', ['DimA', 'DimB']), num(1))])
  })

  it('should parse a constant definition (with two dimensions, non-apply-to-all, named subscripts)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
          <dim name="DimB" />
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
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      exprEqn(varDef('x', ['A1', 'B1']), num(1)),
      exprEqn(varDef('x', ['A1', 'B2']), num(2)),
      exprEqn(varDef('x', ['A2', 'B1']), num(3)),
      exprEqn(varDef('x', ['A2', 'B2']), num(4))
    ])
  })

  // TODO: Support numeric subscript indices
  it('should parse a constant definition (with two dimension, non-apply-to-all, numeric subscripts)', () => {
    const v = xml(`
      <aux name="x">
        <dimensions>
          <dim name="DimA" />
          <dim name="DimB" />
        </dimensions>
        <element subscript="1,1">
          <eqn>1</eqn>
        </element>
        <element subscript="1,2">
          <eqn>2</eqn>
        </element>
        <element subscript="2,1">
          <eqn>3</eqn>
        </element>
        <element subscript="2,2">
          <eqn>4</eqn>
        </element>
      </aux>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Numeric subscript indices are not currently supported')
  })

  // it('should parse a data variable definition (without subscripts)', () => {
  //   const eqn = `x ~~|`
  //   expect(parseXmileVariableDef(v)).toEqual(dataVarEqn(varDef('x')))
  // })

  // it('should parse a data variable definition (with one dimension)', () => {
  //   const eqn = `x[a] ~~|`
  //   expect(parseXmileVariableDef(v)).toEqual(dataVarEqn(varDef('x', ['a'])))
  // })

  // it('should parse a data variable definition (with two dimensions)', () => {
  //   const eqn = `x[a, b] ~~|`
  //   expect(parseXmileVariableDef(v)).toEqual(dataVarEqn(varDef('x', ['a', 'b'])))
  // })

  // it('should parse a lookup definition (without lookup range)', () => {
  //   const eqn = `x( (0,0), (1,2), (2,  5)  ) ~~|`
  //   expect(parseXmileVariableDef(v)).toEqual(
  //     lookupVarEqn(
  //       varDef('x'),
  //       lookupDef([
  //         [0, 0],
  //         [1, 2],
  //         [2, 5]
  //       ])
  //     )
  //   )
  // })

  // it('should parse a lookup definition (with lookup range)', () => {
  //   const eqn = `x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|`
  //   expect(parseXmileVariableDef(v)).toEqual(
  //     lookupVarEqn(
  //       varDef('x'),
  //       lookupDef(
  //         [
  //           [0, 0],
  //           [0.1, 0.01],
  //           [0.5, 0.7],
  //           [1, 1],
  //           [1.5, 1.2],
  //           [2, 1.3]
  //         ],
  //         {
  //           min: [0, 0],
  //           max: [2, 2]
  //         }
  //       )
  //     )
  //   )
  // })
})
