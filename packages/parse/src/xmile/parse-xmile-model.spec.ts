// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { dimDef, exprEqn, model, num, varDef } from '../ast/ast-builders'

import { parseXmileModel } from './parse-xmile-model'

function xmile(dimensions: string, variables: string): string {
  let dims: string
  if (dimensions.length > 0) {
    dims = `\
    <dimensions>
        ${dimensions}
    </dimensions>`
  } else {
    dims = ''
  }

  let vars: string
  if (variables.length > 0) {
    vars = `\
        <variables>
            ${variables}
        </variables>`
  } else {
    vars = ''
  }

  return `\
<xmile xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0" version="1.0">
<header>
    <options namespace="std"/>
    <vendor>Ventana Systems, xmutil</vendor>
    <product lang="en">Vensim, xmutil</product>
</header>
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>100</stop>
    <dt>1</dt>
</sim_specs>
${dims}
    <model>
    ${vars}
    </model>
</xmile>`
}

describe('parseXmileModel', () => {
  it('should throw an error if model XML cannot be parsed', () => {
    const mdl = 'NOT XMILE'

    let msg = 'Failed to parse XMILE model definition:\n\n'
    msg += 'Root element is missing or invalid (line 1, column 1)\n'
    msg += '  NOT XMILE\n'
    msg += '  ^'
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should throw an error if model equation cannot be parsed', () => {
    const vars = `\
<aux name="x">
  <eqn>IF   THEN 1 ELSE 2</eqn>
</aux>`
    const mdl = xmile('', vars)

    const msg = `\
Failed to parse XMILE variable definition at line 15, col 13:
<aux name="x">
  <eqn>IF   THEN 1 ELSE 2</eqn>
</aux>

Detail:
  no viable alternative at input 'IF THEN ELSE(,'`
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should parse a model with dimension definition only (no equations)', () => {
    const dims = `\
<dim name="DimA">
  <elem name="A1" />
  <elem name="A2" />
  <elem name="A3" />
</dim>`
    const mdl = xmile(dims, '')
    expect(parseXmileModel(mdl)).toEqual(model([dimDef('DimA', 'DimA', ['A1', 'A2', 'A3'])], []))
  })

  it('should parse a model with dimension definition with comment', () => {
    const dims = `\
<dim name="DimA">
  <doc>comment is here</doc>
  <elem name="A1" />
  <elem name="A2" />
  <elem name="A3" />
</dim>`
    const mdl = xmile(dims, '')
    expect(parseXmileModel(mdl)).toEqual(
      model([dimDef('DimA', 'DimA', ['A1', 'A2', 'A3'], undefined, 'comment is here')], [])
    )
  })

  it('should parse a model with equation only (no dimension definitions)', () => {
    const vars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>`
    const mdl = xmile('', vars)
    expect(parseXmileModel(mdl)).toEqual(model([], [exprEqn(varDef('x'), num(1))]))
  })

  it('should parse a model with equation with units and single-line comment', () => {
    const dims = `\
<dim name="DimA">
  <doc>comment is here</doc>
  <elem name="A1" />
  <elem name="A2" />
  <elem name="A3" />
</dim>`
    const vars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA" />
  </dimensions>
  <doc>comment is here</doc>
  <units>meters</units>
  <eqn>1</eqn>
</aux>`

    const mdl = xmile(dims, vars)
    expect(parseXmileModel(mdl)).toEqual(
      model(
        // dimension definitions
        [dimDef('DimA', 'DimA', ['A1', 'A2', 'A3'], undefined, 'comment is here')],

        // variable definitions
        [exprEqn(varDef('x', ['DimA']), num(1), 'meters', 'comment is here')]
      )
    )
  })

  //   it('should parse a model with equation with units and multi-line comment', () => {
  //     const mdl = `
  // x = 1
  //   ~ watt/(meter*meter)
  //   ~ Something, Chapter 6. More things. p.358. More words \\
  //     continued on next line.
  //   |
  //     `
  //     expect(parseVensimModel(mdl)).toEqual(
  //       model(
  //         [],
  //         [
  //           exprEqn(
  //             varDef('x'),
  //             num(1),
  //             'watt/(meter*meter)',
  //             'Something, Chapter 6. More things. p.358. More words continued on next line.'
  //           )
  //         ]
  //       )
  //     )
  //   })
})
