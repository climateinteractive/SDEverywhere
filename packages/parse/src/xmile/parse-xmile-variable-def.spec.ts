// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { XmlElement } from '@rgrove/parse-xml'
import { parseXml } from '@rgrove/parse-xml'

import { binaryOp, call, exprEqn, lookupDef, lookupVarEqn, num, varDef, varRef } from '../ast/ast-builders'

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

  it('should throw an error if stock variable definition has <gf>', () => {
    const v = xml(`
      <stock name="x">
        <gf>
          <xscale min="0" max="1"/>
          <ypts>0,0.1,0.5,0.9,1</ypts>
        </gf>
      </stock>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<gf> is not valid within a <stock> variable')
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
  it('should parse a flow variable definition (without subscripts, defined with <eqn>)', () => {
    const v = xml(`
      <flow name="x">
        <eqn>y + 10</eqn>
      </flow>
    `)
    expect(parseXmileVariableDef(v)).toEqual([exprEqn(varDef('x'), binaryOp(varRef('y'), '+', num(10)))])
  })

  it('should parse a flow variable definition (without subscripts, defined with <gf> and <xscale>)', () => {
    const v = xml(`
      <flow name="x">
        <gf>
          <xscale min="0" max="1"/>
          <ypts>0,0.1,0.5,0.9,1</ypts>
        </gf>
      </flow>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      lookupVarEqn(
        varDef('x'),
        lookupDef([
          [0, 0],
          [0.25, 0.1],
          [0.5, 0.5],
          [0.75, 0.9],
          [1, 1]
        ])
      )
    ])
  })

  it('should parse a flow variable definition (without subscripts, defined with <gf> and <xpts>)', () => {
    const v = xml(`
      <flow name="x">
        <gf>
          <ypts>0,0.4,0.5,0.8,1</ypts>
          <ypts>0,0.1,0.5,0.9,1</ypts>
        </gf>
      </flow>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      lookupVarEqn(
        varDef('x'),
        lookupDef([
          [0, 0],
          [0.4, 0.1],
          [0.5, 0.5],
          [0.8, 0.9],
          [1, 1]
        ])
      )
    ])
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

  it('should throw an error if flow variable definition has no <eqn> or <gf>', () => {
    const v = xml(`
      <flow name="x">
      </flow>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently <eqn> or <gf> is required for a <flow> variable')
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
})

describe('parseXmileVariableDef with <gf>', () => {
  it('should parse a graphical function (with <xscale> and <ypts>', () => {
    const v = xml(`
      <gf name="x">
        <xscale min="0" max="1"/>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(parseXmileVariableDef(v)).toEqual([
      lookupVarEqn(
        varDef('x'),
        lookupDef([
          [0, 0],
          [0.25, 0.1],
          [0.5, 0.5],
          [0.75, 0.9],
          [1, 1]
        ])
      )
    ])
  })

  it('should parse a graphical function (with <xpts> and <ypts>', () => {
    const v = xml(`
      <gf name="x">
        <xpts>0,0.4,0.5,0.8,1</xpts>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(parseXmileVariableDef(v)).toEqual(
      lookupVarEqn(
        varDef('x'),
        lookupDef([
          [0, 0],
          [0.4, 0.1],
          [0.5, 0.5],
          [0.8, 0.9],
          [1, 1]
        ])
      )
    )
  })

  it('should parse a graphical function (with custom separator)', () => {
    const v = xml(`
      <gf name="x">
        <xpts>0,0.4,0.5,0.8,1</xpts>
        <ypts sep=";">0;0.1;0.5;0.9;1</ypts>
      </gf>
    `)
    expect(parseXmileVariableDef(v)).toEqual(
      lookupVarEqn(
        varDef('x'),
        lookupDef([
          [0, 0],
          [0.4, 0.1],
          [0.5, 0.5],
          [0.8, 0.9],
          [1, 1]
        ])
      )
    )
  })

  it('should throw an error if name is undefined', () => {
    const v = xml(`
      <gf>
        <xpts>0,0.4,0.5,0.8,1</xpts>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<gf> name attribute is required')
  })

  it('should throw an error if name is empty', () => {
    const v = xml(`
      <gf name="">
        <xpts>0,0.4,0.5,0.8,1</xpts>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<gf> name attribute is required')
  })

  // TODO: Support other types (extrapolate and discrete)
  it('should throw an error if type is defined and is not "continuous"', () => {
    const v = xml(`
      <gf name="x" type="extrapolate">
        <xpts>0,0.4,0.5,0.8,1</xpts>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('Currently "continuous" is the only type supported for <gf>')
  })

  it('should throw an error if <xpts> and <xscale> are both defined', () => {
    const v = xml(`
      <gf name="x">
        <xscale min="0" max="1"/>
        <xpts>0,0.4,0.5,0.8,1</xpts>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<gf> must contain <xpts> or <xscale> but not both')
  })

  it('should throw an error if <xpts> is empty', () => {
    const v = xml(`
      <gf name="x">
        <xpts></xpts>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<xpts> must have at least one element')
  })

  it('should throw an error if <ypts> is undefined', () => {
    const v = xml(`
      <gf name="x">
        <xpts>0,0.4,0.5,0.8,1,666</xpts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<ypts> must be defined')
  })

  it('should throw an error if <ypts> is empty', () => {
    const v = xml(`
      <gf name="x">
        <xpts>0,0.4,0.5,0.8,1,666</xpts>
        <ypts></ypts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<ypts> must have at least one element')
  })

  it('should throw an error if <xpts> and <ypts> have different number of elements', () => {
    const v = xml(`
      <gf name="x">
        <xpts>0,0.4,0.5,0.8,1,666</xpts>
        <ypts>0,0.1,0.5,0.9,1</ypts>
      </gf>
    `)
    expect(() => parseXmileVariableDef(v)).toThrow('<xpts> and <ypts> must have the same number of elements')
  })
})
