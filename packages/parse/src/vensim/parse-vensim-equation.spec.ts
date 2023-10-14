// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { binaryOp, constListEqn, dataVarEqn, exprEqn, lookupDef, lookupVarEqn, num, varRef } from '../ast/ast-types'

import { parseVensimEquation } from './parse-vensim-equation'

describe('parseVensimEquation', () => {
  it('should parse a simple expr equation (without subscripts)', () => {
    const eqn = `x = y + 10 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('x'), binaryOp(varRef('y'), '+', num(10))))
  })

  it('should parse a simple expr equation (with one dimension)', () => {
    const eqn = `x[a] = y[a] + 10 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('x', ['a']), binaryOp(varRef('y', ['a']), '+', num(10))))
  })

  it('should parse a simple expr equation (with two dimensions)', () => {
    const eqn = `x[a, b] = y[a, b] + 10 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(
      exprEqn(varRef('x', ['a', 'b']), binaryOp(varRef('y', ['a', 'b']), '+', num(10)))
    )
  })

  it('should parse a constant definition (without subscripts)', () => {
    const eqn = `x = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('x'), num(1)))
  })

  it('should parse a constant definition (with one dimension)', () => {
    const eqn = `x[a] = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('x', ['a']), num(1)))
  })

  it('should parse a constant definition (with two dimensions)', () => {
    const eqn = `x[a, b] = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('x', ['a', 'b']), num(1)))
  })

  it('should parse a constant definition (with three dimensions)', () => {
    const eqn = `x[a, b, c] = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('x', ['a', 'b', 'c']), num(1)))
  })

  it('should parse a constant definition (with :EXCEPT: clause)', () => {
    const eqn = `x[a, b] :EXCEPT: [a1, b1], [a1, b2] = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(
      exprEqn(
        varRef(
          'x',
          ['a', 'b'],
          [
            ['a1', 'b1'],
            ['a1', 'b2']
          ]
        ),
        num(1)
      )
    )
  })

  it('should parse a const list definition (with one dimension)', () => {
    const eqn = `x[a] = 1, 2, 3 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(constListEqn(varRef('x', ['a']), [num(1), num(2), num(3)]))
  })

  it('should parse a const list definition (with two dimensions)', () => {
    const eqn = `x[a, b] = 1, 2, 3; 4, 5, 6; ~~|`
    expect(parseVensimEquation(eqn)).toEqual(
      constListEqn(varRef('x', ['a', 'b']), [num(1), num(2), num(3), num(4), num(5), num(6)])
    )
  })

  it('should parse a data variable definition (without subscripts)', () => {
    const eqn = `x ~~|`
    expect(parseVensimEquation(eqn)).toEqual(dataVarEqn(varRef('x')))
  })

  it('should parse a data variable definition (with one dimension)', () => {
    const eqn = `x[a] ~~|`
    expect(parseVensimEquation(eqn)).toEqual(dataVarEqn(varRef('x', ['a'])))
  })

  it('should parse a data variable definition (with two dimensions)', () => {
    const eqn = `x[a, b] ~~|`
    expect(parseVensimEquation(eqn)).toEqual(dataVarEqn(varRef('x', ['a', 'b'])))
  })

  it('should parse a lookup definition (without lookup range)', () => {
    const eqn = `x( (0,0), (1,2), (2,  5)  ) ~~|`
    expect(parseVensimEquation(eqn)).toEqual(
      lookupVarEqn(
        varRef('x'),
        lookupDef([
          [0, 0],
          [1, 2],
          [2, 5]
        ])
      )
    )
  })

  it('should parse a lookup definition (with lookup range)', () => {
    const eqn = `x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|`
    expect(parseVensimEquation(eqn)).toEqual(
      lookupVarEqn(
        varRef('x'),
        lookupDef(
          [
            [0, 0],
            [0.1, 0.01],
            [0.5, 0.7],
            [1, 1],
            [1.5, 1.2],
            [2, 1.3]
          ],
          {
            min: [0, 0],
            max: [2, 2]
          }
        )
      )
    )
  })
})
