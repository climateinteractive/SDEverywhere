// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import {
  binaryOp,
  call,
  keyword,
  lookupCall,
  lookupDef,
  num,
  parens,
  stringLiteral,
  unaryOp,
  varRef
} from '../ast/ast-builders'

import { parseVensimExpr } from './parse-vensim-expr'

const one = num(1)
const two = num(2)
const three = num(3)
const x = varRef('x')
const y = varRef('y')

describe('parseVensimExpr', () => {
  it('should throw an error if expression cannot be parsed', () => {
    expect(() => parseVensimExpr(`x ? 5`)).toThrow(`token recognition error at: '?'`)
  })

  it('should parse an expr with a single constant', () => {
    expect(parseVensimExpr('1')).toEqual(one)
  })

  it('should parse an expr with a single constant and preserve original notation', () => {
    expect(parseVensimExpr('1e+06')).toEqual(num(1000000, '1e+06'))
  })

  it('should parse an expr with unary + op', () => {
    expect(parseVensimExpr('+1')).toEqual(unaryOp('+', one))
  })

  it('should parse an expr with unary - op', () => {
    expect(parseVensimExpr('-1')).toEqual(unaryOp('-', one))
  })

  it('should parse an expr with unary :NOT: op', () => {
    expect(parseVensimExpr(':NOT: 1')).toEqual(unaryOp(':NOT:', one))
  })

  it('should parse an expr with binary + op', () => {
    expect(parseVensimExpr('1 + 2')).toEqual(binaryOp(one, '+', two))
  })

  it('should parse an expr with binary - op', () => {
    expect(parseVensimExpr('1 - 2')).toEqual(binaryOp(one, '-', two))
  })

  it('should parse an expr with binary * op', () => {
    expect(parseVensimExpr('1 * 2')).toEqual(binaryOp(one, '*', two))
  })

  it('should parse an expr with binary / op', () => {
    expect(parseVensimExpr('1 / 2')).toEqual(binaryOp(one, '/', two))
  })

  it('should parse an expr with binary ^ op', () => {
    expect(parseVensimExpr('1 ^ 2')).toEqual(binaryOp(one, '^', two))
  })

  it('should parse an expr with explicit parentheses', () => {
    expect(parseVensimExpr('(1 + 2)')).toEqual(parens(binaryOp(one, '+', two)))
  })

  it('should parse multiple math expressions (without parentheses)', () => {
    expect(parseVensimExpr('1 + 2 + 3')).toEqual(binaryOp(binaryOp(one, '+', two), '+', three))
  })

  it('should parse multiple binary math expressions (with parentheses)', () => {
    expect(parseVensimExpr('(1 + 2) * 3')).toEqual(binaryOp(parens(binaryOp(one, '+', two)), '*', three))
  })

  // The following tests exercise operator grouping.  Precedence in the Vensim grammar comes
  // from the order of the alternatives in the (left-recursive) `expr` rule, so a change to
  // that order silently changes how an expression evaluates without causing a parse error.
  // For more details, see: https://github.com/climateinteractive/antlr4-vensim/issues/16

  it('should parse an expr with ^ op binding tighter than a leading unary - op', () => {
    expect(parseVensimExpr('-x^2')).toEqual(unaryOp('-', binaryOp(x, '^', two)))
  })

  it('should parse an expr with ^ op binding tighter than a leading unary + op', () => {
    expect(parseVensimExpr('+x^2')).toEqual(unaryOp('+', binaryOp(x, '^', two)))
  })

  it('should parse an expr with ^ op binding tighter than a leading unary - op (with constant base)', () => {
    expect(parseVensimExpr('-2^3')).toEqual(unaryOp('-', binaryOp(two, '^', three)))
  })

  it('should parse an expr with a negated exponent', () => {
    expect(parseVensimExpr('x^-2')).toEqual(binaryOp(x, '^', unaryOp('-', two)))
  })

  it('should parse an expr with a negated base (with explicit parentheses)', () => {
    expect(parseVensimExpr('(-x)^2')).toEqual(binaryOp(parens(unaryOp('-', x)), '^', two))
  })

  it('should parse a Gaussian kernel expr with the sign applied to the power', () => {
    // This is the case that motivated the grammar fix; grouping this as `EXP(((-x)^2)/2)`
    // drops the sign of the exponent, turning a decaying curve into a growing one
    expect(parseVensimExpr('EXP(-x^2/2)')).toEqual(call('EXP', binaryOp(unaryOp('-', binaryOp(x, '^', two)), '/', two)))
  })

  it('should parse an expr with ^ op binding tighter than * op', () => {
    expect(parseVensimExpr('x^2 * y')).toEqual(binaryOp(binaryOp(x, '^', two), '*', y))
  })

  it('should parse an expr with ^ op binding tighter than - op (used as subtraction)', () => {
    expect(parseVensimExpr('x - y^2')).toEqual(binaryOp(x, '-', binaryOp(y, '^', two)))
  })

  it('should parse an expr with a negated power followed by a * op', () => {
    expect(parseVensimExpr('-x^2 * y')).toEqual(binaryOp(unaryOp('-', binaryOp(x, '^', two)), '*', y))
  })

  it('should parse an expr with unary - op binding tighter than * op', () => {
    // Unary sign still outranks `*` and `/`, so this grouping is unaffected by the
    // precedence of the `^` op
    expect(parseVensimExpr('-x * y')).toEqual(binaryOp(unaryOp('-', x), '*', y))
  })

  it('should parse an expr with left-associative ^ ops', () => {
    // Left associative, so `2^3^2` is `(2^3)^2` (64), not `2^(3^2)` (512)
    expect(parseVensimExpr('2^3^2')).toEqual(binaryOp(binaryOp(two, '^', three), '^', two))
  })

  it('should parse an expr with binary = op', () => {
    expect(parseVensimExpr('x = y')).toEqual(binaryOp(x, '=', y))
  })

  it('should parse an expr with binary = op (with :NA: keyword)', () => {
    expect(parseVensimExpr('x = :NA:')).toEqual(binaryOp(x, '=', keyword(':NA:')))
  })

  it('should parse an expr with binary <> op', () => {
    expect(parseVensimExpr('x <> y')).toEqual(binaryOp(x, '<>', y))
  })

  it('should parse an expr with binary < op', () => {
    expect(parseVensimExpr('x < y')).toEqual(binaryOp(x, '<', y))
  })

  it('should parse an expr with binary <= op', () => {
    expect(parseVensimExpr('x <= y')).toEqual(binaryOp(x, '<=', y))
  })

  it('should parse an expr with binary > op', () => {
    expect(parseVensimExpr('x > y')).toEqual(binaryOp(x, '>', y))
  })

  it('should parse an expr with binary >= op', () => {
    expect(parseVensimExpr('x >= y')).toEqual(binaryOp(x, '>=', y))
  })

  it('should parse an expr with binary :AND: op', () => {
    expect(parseVensimExpr('x :AND: y')).toEqual(binaryOp(x, ':AND:', y))
  })

  it('should parse an expr with binary :OR: op', () => {
    expect(parseVensimExpr('x :OR: y')).toEqual(binaryOp(x, ':OR:', y))
  })

  it('should parse a variable reference expr (without subscript)', () => {
    expect(parseVensimExpr('x')).toEqual(varRef('x'))
  })

  it('should parse a variable reference expr (with one subscript)', () => {
    expect(parseVensimExpr('x[a]')).toEqual(varRef('x', ['a']))
  })

  it('should parse a variable reference expr (with two subscripts)', () => {
    expect(parseVensimExpr('x[a, b]')).toEqual(varRef('x', ['a', 'b']))
  })

  it('should parse a variable reference expr (with three subscripts)', () => {
    expect(parseVensimExpr('x[a, b, c]')).toEqual(varRef('x', ['a', 'b', 'c']))
  })

  it('should parse a lookup call expr (without subscript)', () => {
    expect(parseVensimExpr('x (t)')).toEqual(call('x', varRef('t')))
  })

  it('should parse a lookup call expr (with one subscript)', () => {
    expect(parseVensimExpr('x[a] (t)')).toEqual(lookupCall(varRef('x', ['a']), varRef('t')))
  })

  it('should parse a lookup call expr (with two subscripts)', () => {
    expect(parseVensimExpr('x[a, b] (t)')).toEqual(lookupCall(varRef('x', ['a', 'b']), varRef('t')))
  })

  it('should parse a function call expr (with one argument)', () => {
    expect(parseVensimExpr('LN(2)')).toEqual(call('LN', two))
  })

  it('should parse a function call expr (with two arguments)', () => {
    expect(parseVensimExpr('MAX(x, y)')).toEqual(call('MAX', x, y))
  })

  it('should parse a function call expr (with three arguments)', () => {
    expect(parseVensimExpr('IF THEN ELSE(x, y, 1)')).toEqual(call('IF THEN ELSE', x, y, one))
  })

  it('should parse a "WITH LOOKUP" function call expr (without lookup range)', () => {
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
  })

  it('should parse a "WITH LOOKUP" function call expr (with lookup range)', () => {
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

  it('should parse a "GET DIRECT CONSTANTS" function call (with string arguments)', () => {
    expect(parseVensimExpr("GET DIRECT CONSTANTS('data/a.csv', ',', 'B2')")).toEqual(
      call('GET DIRECT CONSTANTS', stringLiteral('data/a.csv'), stringLiteral(','), stringLiteral('B2'))
    )
  })
})
