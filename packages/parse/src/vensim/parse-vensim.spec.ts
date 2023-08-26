// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import {
  binaryOp,
  call,
  constListEqn,
  exprEqn,
  lookupCall,
  lookupDef,
  model,
  num,
  unaryOp,
  varRef
} from '../ast/ast-types'

import { parseVensimEquation, parseVensimExpr, parseVensimModel } from './parse-vensim'

const one = num(1)
const two = num(2)
const three = num(3)
const x = varRef('x')
const y = varRef('y')

describe('parseVensimModel', () => {
  it('should parse a model', () => {
    let mdl: string

    mdl = `x = 1 ~~|`
    expect(parseVensimModel(mdl)).toEqual(model([], [exprEqn(varRef('x'), num(1))]))

    mdl = `y[a, b] = 1 ~~|`
    expect(parseVensimModel(mdl)).toEqual(model([], [exprEqn(varRef('y', ['a', 'b']), num(1))]))

    mdl = `y[a, b] :EXCEPT: [a1, b1], [a1, b2] = 1 ~~|`
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

    mdl = `
x = 1
  ~ meters
  ~ comment is here
  |
`
    expect(parseVensimModel(mdl)).toEqual(model([], [exprEqn(varRef('x'), num(1), 'meters', 'comment is here')]))

    mdl = `
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

describe('parseVensimEquation', () => {
  it('should parse an expression equation', () => {
    let eqn: string

    eqn = `x = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('x'), num(1)))

    eqn = `y[a, b] = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(exprEqn(varRef('y', ['a', 'b']), num(1)))

    eqn = `y[a, b] :EXCEPT: [a1, b1], [a1, b2] = 1 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(
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
    )
  })

  it('should parse a const list equation', () => {
    let eqn: string

    eqn = `x[a] = 1, 2, 3 ~~|`
    expect(parseVensimEquation(eqn)).toEqual(constListEqn(varRef('x', ['a']), '1,2,3'))

    eqn = `y[a, b] = 1, 2, 3; 4, 5, 6; ~~|`
    expect(parseVensimEquation(eqn)).toEqual(constListEqn(varRef('y', ['a', 'b']), '1,2,3;4,5,6;'))
  })
})

describe('parseVensimExpr', () => {
  it('should parse an expression', () => {
    expect(parseVensimExpr('1')).toEqual(one)

    expect(parseVensimExpr('+1')).toEqual(unaryOp('+', one))
    expect(parseVensimExpr('-1')).toEqual(unaryOp('-', one))
    expect(parseVensimExpr(':NOT: 1')).toEqual(unaryOp(':NOT:', one))

    expect(parseVensimExpr('1 + 2')).toEqual(binaryOp(one, '+', two))
    expect(parseVensimExpr('1 - 2')).toEqual(binaryOp(one, '-', two))
    expect(parseVensimExpr('1 * 2')).toEqual(binaryOp(one, '*', two))
    expect(parseVensimExpr('1 / 2')).toEqual(binaryOp(one, '/', two))
    expect(parseVensimExpr('1 ^ 2')).toEqual(binaryOp(one, '^', two))

    expect(parseVensimExpr('x < y')).toEqual(binaryOp(x, '<', y))
    expect(parseVensimExpr('x > y')).toEqual(binaryOp(x, '>', y))
    expect(parseVensimExpr('x <= y')).toEqual(binaryOp(x, '<=', y))
    expect(parseVensimExpr('x >= y')).toEqual(binaryOp(x, '>=', y))

    expect(parseVensimExpr('x = y')).toEqual(binaryOp(x, '=', y))
    expect(parseVensimExpr('x <> y')).toEqual(binaryOp(x, '<>', y))

    expect(parseVensimExpr('x :AND: y')).toEqual(binaryOp(x, ':AND:', y))
    expect(parseVensimExpr('x :OR: y')).toEqual(binaryOp(x, ':OR:', y))

    expect(parseVensimExpr('1 + 2 + 3')).toEqual(binaryOp(binaryOp(one, '+', two), '+', three))
    expect(parseVensimExpr('(1 + 2) * 3')).toEqual(binaryOp(binaryOp(one, '+', two), '*', three))

    expect(parseVensimExpr('y[a]')).toEqual(varRef('y', ['a']))
    expect(parseVensimExpr('x[a, b]')).toEqual(varRef('x', ['a', 'b']))

    expect(parseVensimExpr('LN(2)')).toEqual(call('LN', two))
    expect(parseVensimExpr('MAX(x, y)')).toEqual(call('MAX', x, y))

    // Verify lookup call without subscript (looks like a call)
    expect(parseVensimExpr('x (t)')).toEqual(call('x', varRef('t')))

    // Verify lookup call with subscript
    expect(parseVensimExpr('y[a] (t)')).toEqual(lookupCall(varRef('y', ['a']), varRef('t')))

    // Verify lookup expression without range
    expect(parseVensimExpr('WITH LOOKUP( t , ((0,0), (1,1)) )')).toEqual(
      call(
        'WITH LOOKUP',
        varRef('t'),
        lookupDef([
          [0, 0],
          [1, 1]
        ])
      )
    )

    // Verify lookup expression with range
    expect(parseVensimExpr('WITH LOOKUP( t , ([(0,0)-(2,2)], (0,0), (1,1), (2,2)) )')).toEqual(
      call(
        'WITH LOOKUP',
        varRef('t'),
        lookupDef(
          [
            [0, 0],
            [1, 1],
            [2, 2]
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
