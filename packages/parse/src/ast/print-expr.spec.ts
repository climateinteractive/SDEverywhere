// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { binaryOp, call, lookupCall, lookupDef, num, parens, unaryOp, varRef } from './ast-builders'
import { toPrettyString } from './print-expr'

const one = num(1)
const two = num(2)
const three = num(3)
const x = varRef('x')
const y = varRef('y')

describe('toPrettyString', () => {
  it('should create a pretty string', () => {
    expect(toPrettyString(one)).toEqual('1')
    expect(toPrettyString(num(1000000, '1e+06'))).toEqual('1e+06')

    expect(toPrettyString(unaryOp('+', one))).toEqual('+1')
    expect(toPrettyString(unaryOp('-', one))).toEqual('-1')
    expect(toPrettyString(unaryOp(':NOT:', one))).toEqual(':NOT: 1')

    expect(toPrettyString(binaryOp(one, '+', two))).toEqual('1 + 2')
    expect(toPrettyString(binaryOp(one, '-', two))).toEqual('1 - 2')
    expect(toPrettyString(binaryOp(one, '*', two))).toEqual('1 * 2')
    expect(toPrettyString(binaryOp(one, '/', two))).toEqual('1 / 2')
    expect(toPrettyString(binaryOp(one, '^', two))).toEqual('1 ^ 2')

    expect(toPrettyString(binaryOp(x, '<', y))).toEqual('x < y')
    expect(toPrettyString(binaryOp(x, '>', y))).toEqual('x > y')
    expect(toPrettyString(binaryOp(x, '<=', y))).toEqual('x <= y')
    expect(toPrettyString(binaryOp(x, '>=', y))).toEqual('x >= y')

    expect(toPrettyString(binaryOp(x, '=', y))).toEqual('x = y')
    expect(toPrettyString(binaryOp(x, '<>', y))).toEqual('x <> y')

    expect(toPrettyString(binaryOp(x, ':AND:', y))).toEqual('x :AND: y')
    expect(toPrettyString(binaryOp(x, ':OR:', y))).toEqual('x :OR: y')

    expect(toPrettyString(binaryOp(binaryOp(one, '+', two), '+', three))).toEqual('1 + 2 + 3')
    expect(toPrettyString(binaryOp(parens(binaryOp(one, '+', two)), '+', three))).toEqual('( 1 + 2 ) + 3')

    expect(toPrettyString(varRef('x'))).toEqual('x')
    expect(toPrettyString(varRef('x', ['a', 'b']))).toEqual('x[a, b]')

    expect(toPrettyString(call('LN', two))).toEqual('LN( 2 )')
    expect(toPrettyString(call('MAX', two, three))).toEqual('MAX( 2, 3 )')

    expect(
      toPrettyString(
        lookupDef([
          [0, 0],
          [1, 1]
        ])
      )
    ).toEqual('( (0,0), (1,1) )')

    expect(
      toPrettyString(
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
    ).toEqual('( [(0,0)-(2,2)], (0,0), (1,1), (2,2) )')

    expect(toPrettyString(lookupCall(varRef('y', ['a']), two))).toEqual('y[a]( 2 )')
  })
})
