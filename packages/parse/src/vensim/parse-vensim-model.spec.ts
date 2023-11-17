// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { exprEqn, model, num, subRange, varRef } from '../ast/ast-builders'

import { parseVensimModel } from './parse-vensim-model'

describe('parseVensimModel', () => {
  it('should parse a model with subscript range only (no equations)', () => {
    const mdl = `DimA: A1, A2, A3 ~~|`
    expect(parseVensimModel(mdl)).toEqual(model([subRange('DimA', 'DimA', ['A1', 'A2', 'A3'])], []))
  })

  it('should parse a model with equation only (no subscript ranges)', () => {
    const mdl = `x = 1 ~~|`
    expect(parseVensimModel(mdl)).toEqual(model([], [exprEqn(varRef('x'), num(1))]))
  })

  it('should parse a model with equation with subscripts on LHS', () => {
    const mdl = `y[a, b] = 1 ~~|`
    expect(parseVensimModel(mdl)).toEqual(model([], [exprEqn(varRef('y', ['a', 'b']), num(1))]))
  })

  it('should parse a model with equation with :EXCEPT: clause on LHS', () => {
    const mdl = `y[a, b] :EXCEPT: [a1, b1], [a1, b2] = 1 ~~|`
    expect(parseVensimModel(mdl)).toEqual(
      model(
        [],
        [
          exprEqn(
            varRef(
              'y',
              ['a', 'b'],
              [
                ['a1', 'b1'],
                ['a1', 'b2']
              ]
            ),
            num(1)
          )
        ]
      )
    )
  })

  it('should parse a model with equation with units and single-line comment', () => {
    const mdl = `
DimA: A1, A2, A3 ~~|
x = 1
  ~ meters
  ~ comment is here
  |
`
    expect(parseVensimModel(mdl)).toEqual(
      model(
        [
          // subscript ranges
          subRange('DimA', 'DimA', ['A1', 'A2', 'A3'])
        ],
        [
          // equations
          exprEqn(varRef('x'), num(1), 'meters', 'comment is here')
        ]
      )
    )
  })

  it('should parse a model with equation with units and multi-line comment', () => {
    const mdl = `
x = 1
  ~ watt/(meter*meter)
  ~ Something, Chapter 6. More things. p.358. More words \\
    continued on next line.
  |
    `
    expect(parseVensimModel(mdl)).toEqual(
      model(
        [],
        [
          exprEqn(
            varRef('x'),
            num(1),
            'watt/(meter*meter)',
            'Something, Chapter 6. More things. p.358. More words continued on next line.'
          )
        ]
      )
    )
  })
})
