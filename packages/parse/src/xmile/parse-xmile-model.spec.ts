// Copyright (c) 2023-2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { dimDef, exprEqn, model, num, varDef } from '../ast/ast-builders'

import { parseXmileModel } from './parse-xmile-model'

function xmile(dimensions: string, variables: string, options?: { simSpecs?: string }): string {
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

  let simSpecs: string
  if (options?.simSpecs !== undefined) {
    simSpecs = options.simSpecs
  } else {
    simSpecs = `\
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>100</stop>
    <dt>1</dt>
</sim_specs>`
  }

  return `\
<xmile xmlns="http://docs.oasis-open.org/xmile/ns/XMILE/v1.0" version="1.0">
<header>
    <options namespace="std"/>
    <vendor>Ventana Systems, xmutil</vendor>
    <product lang="en">Vensim, xmutil</product>
</header>
${simSpecs}
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

  // TODO: Verify error message
  it.skip('should throw an error if model dimension definition cannot be parsed')

  it('should throw an error if model equation cannot be parsed', () => {
    const vars = `\
<aux name="x">
  <eqn>x + ?! + y</eqn>
</aux>`
    const mdl = xmile('', vars)

    const msg = `\
Failed to parse XMILE variable definition at line 15, col 4:
            <aux name="x">
  <eqn>x + ?! + y</eqn>
</aux>

Detail:
  token recognition error at: '?'`
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should throw an error if sim specs element is missing', () => {
    const simSpecs = ''
    const mdl = xmile('', '', { simSpecs })
    const msg = '<sim_specs> element is required for XMILE model definition'
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should throw an error if <start> element is missing', () => {
    const simSpecs = `\
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <stop>100</stop>
    <dt>1</dt>
</sim_specs>`
    const mdl = xmile('', '', { simSpecs })
    const msg = `\
Failed to parse XMILE model definition at line 7:
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <stop>100</stop>
    <dt>1</dt>
</sim_specs>

Detail:
  <start> element is required in XMILE sim specs`
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should throw an error if <start> element is not a number', () => {
    const simSpecs = `\
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>NOT A NUMBER</start>
    <stop>100</stop>
    <dt>1</dt>
</sim_specs>`
    const mdl = xmile('', '', { simSpecs })
    const msg = `\
Failed to parse XMILE model definition at line 7:
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>NOT A NUMBER</start>
    <stop>100</stop>
    <dt>1</dt>
</sim_specs>

Detail:
  Invalid numeric value for <start> element: NOT A NUMBER`
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should throw an error if <stop> element is missing', () => {
    const simSpecs = `\
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <dt>1</dt>
</sim_specs>`
    const mdl = xmile('', '', { simSpecs })
    const msg = `\
Failed to parse XMILE model definition at line 7:
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <dt>1</dt>
</sim_specs>

Detail:
  <stop> element is required in XMILE sim specs`
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should throw an error if <stop> element is not a number', () => {
    const simSpecs = `\
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>NOT A NUMBER</stop>
    <dt>1</dt>
</sim_specs>`
    const mdl = xmile('', '', { simSpecs })
    const msg = `\
Failed to parse XMILE model definition at line 7:
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>NOT A NUMBER</stop>
    <dt>1</dt>
</sim_specs>

Detail:
  Invalid numeric value for <stop> element: NOT A NUMBER`
    expect(() => parseXmileModel(mdl)).toThrow(msg)
  })

  it('should throw an error if <dt> element is not a number', () => {
    const simSpecs = `\
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>100</stop>
    <dt>NOT A NUMBER</dt>
</sim_specs>`
    const mdl = xmile('', '', { simSpecs })
    const msg = `\
Failed to parse XMILE model definition at line 7:
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>0</start>
    <stop>100</stop>
    <dt>NOT A NUMBER</dt>
</sim_specs>

Detail:
  Invalid numeric value for <dt> element: NOT A NUMBER`
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
    expect(parseXmileModel(mdl)).toEqual(
      model([dimDef('DimA', 'DimA', ['A1', 'A2', 'A3'])], [], {
        startTime: 0,
        endTime: 100,
        timeStep: 1
      })
    )
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
      model([dimDef('DimA', 'DimA', ['A1', 'A2', 'A3'], undefined, 'comment is here')], [], {
        startTime: 0,
        endTime: 100,
        timeStep: 1
      })
    )
  })

  it('should parse a model with equation only (no dimension definitions)', () => {
    const vars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>`
    const mdl = xmile('', vars)
    expect(parseXmileModel(mdl)).toEqual(
      model([], [exprEqn(varDef('x'), num(1))], {
        startTime: 0,
        endTime: 100,
        timeStep: 1
      })
    )
  })

  it('should parse a model with no explicit dt value (defaults to 1)', () => {
    const vars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>`
    const mdl = xmile('', vars, {
      simSpecs: `\
<sim_specs isee:simulation_delay="0" method="Euler" time_units="Months">
    <start>2000</start>
    <stop>2100</stop>
</sim_specs>`
    })
    expect(parseXmileModel(mdl)).toEqual(
      model([], [exprEqn(varDef('x'), num(1))], {
        startTime: 2000,
        endTime: 2100,
        timeStep: 1
      })
    )
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
        [exprEqn(varDef('x', ['DimA']), num(1), 'meters', 'comment is here')],

        // simulation spec
        {
          startTime: 0,
          endTime: 100,
          timeStep: 1
        }
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
