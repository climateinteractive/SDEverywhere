// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { binaryOp, call, num, parens, unaryOp, varRef } from './ast-builders'
import type { Expr, VariableRef } from './ast-types'
import type { ReduceExprOptions } from './reduce-expr'
import { reduceConditionals, reduceExpr } from './reduce-expr'

const zero = num(0)
const one = num(1)
const two = num(2)
const x = varRef('x')
const y = varRef('y')

describe('reduceExpr', () => {
  it('should reduce trivial arithmetic expressions to a constant', () => {
    expect(reduceExpr(unaryOp('+', num(3)))).toEqual(num(3))
    expect(reduceExpr(unaryOp('-', num(3)))).toEqual(num(-3))

    expect(reduceExpr(binaryOp(num(3), '+', num(2)))).toEqual(num(5))
    expect(reduceExpr(binaryOp(num(3), '-', num(2)))).toEqual(num(1))
    expect(reduceExpr(binaryOp(num(3), '*', num(2)))).toEqual(num(6))
    expect(reduceExpr(binaryOp(num(3), '/', num(2)))).toEqual(num(1.5))
    expect(reduceExpr(binaryOp(num(3), '^', num(2)))).toEqual(num(9))

    expect(reduceExpr(binaryOp(one, '=', one))).toEqual(one)
    expect(reduceExpr(binaryOp(one, '=', zero))).toEqual(zero)

    expect(reduceExpr(binaryOp(one, '<>', one))).toEqual(zero)
    expect(reduceExpr(binaryOp(one, '<>', zero))).toEqual(one)

    expect(reduceExpr(binaryOp(zero, '<', one))).toEqual(one)
    expect(reduceExpr(binaryOp(one, '<', one))).toEqual(zero)
    expect(reduceExpr(binaryOp(one, '<', zero))).toEqual(zero)

    expect(reduceExpr(binaryOp(one, '>', zero))).toEqual(one)
    expect(reduceExpr(binaryOp(one, '>', one))).toEqual(zero)
    expect(reduceExpr(binaryOp(zero, '>', one))).toEqual(zero)

    expect(reduceExpr(binaryOp(zero, '<=', one))).toEqual(one)
    expect(reduceExpr(binaryOp(one, '<=', one))).toEqual(one)
    expect(reduceExpr(binaryOp(one, '<=', zero))).toEqual(zero)

    expect(reduceExpr(binaryOp(one, '>=', zero))).toEqual(one)
    expect(reduceExpr(binaryOp(one, '>=', one))).toEqual(one)
    expect(reduceExpr(binaryOp(zero, '>=', one))).toEqual(zero)

    expect(reduceExpr(binaryOp(zero, ':AND:', zero))).toEqual(zero)
    expect(reduceExpr(binaryOp(zero, ':AND:', two))).toEqual(zero)
    expect(reduceExpr(binaryOp(two, ':AND:', zero))).toEqual(zero)
    expect(reduceExpr(binaryOp(two, ':AND:', two))).toEqual(one)

    expect(reduceExpr(binaryOp(zero, ':OR:', zero))).toEqual(zero)
    expect(reduceExpr(binaryOp(zero, ':OR:', two))).toEqual(one)
    expect(reduceExpr(binaryOp(two, ':OR:', zero))).toEqual(one)
    expect(reduceExpr(binaryOp(two, ':OR:', two))).toEqual(one)
  })

  it('should reduce identity expressions when possible', () => {
    expect(reduceExpr(binaryOp(x, '+', x))).toEqual(binaryOp(x, '+', x))
    expect(reduceExpr(binaryOp(x, '+', zero))).toEqual(x)
    expect(reduceExpr(binaryOp(zero, '+', x))).toEqual(x)
    expect(reduceExpr(binaryOp(x, '+', one))).toEqual(binaryOp(x, '+', one))
    expect(reduceExpr(binaryOp(one, '+', x))).toEqual(binaryOp(one, '+', x))
    expect(reduceExpr(binaryOp(one, '+', binaryOp(x, '+', one)))).toEqual(binaryOp(two, '+', x))

    // TODO: We could detect this case and reduce to zero
    expect(reduceExpr(binaryOp(x, '-', x))).toEqual(binaryOp(x, '-', x))
    expect(reduceExpr(binaryOp(x, '-', zero))).toEqual(x)
    expect(reduceExpr(binaryOp(zero, '-', x))).toEqual(unaryOp('-', x))
    expect(reduceExpr(binaryOp(x, '-', one))).toEqual(binaryOp(x, '-', one))
    expect(reduceExpr(binaryOp(one, '-', x))).toEqual(binaryOp(one, '-', x))

    expect(reduceExpr(binaryOp(x, '*', x))).toEqual(binaryOp(x, '*', x))
    expect(reduceExpr(binaryOp(x, '*', zero))).toEqual(zero)
    expect(reduceExpr(binaryOp(zero, '*', x))).toEqual(zero)
    expect(reduceExpr(binaryOp(x, '*', one))).toEqual(x)
    expect(reduceExpr(binaryOp(one, '*', x))).toEqual(x)
    expect(reduceExpr(binaryOp(x, '*', two))).toEqual(binaryOp(x, '*', two))
    expect(reduceExpr(binaryOp(two, '*', x))).toEqual(binaryOp(two, '*', x))

    // 5 * (x * 2) === 10 * x
    expect(reduceExpr(binaryOp(num(5), '*', binaryOp(x, '*', two)))).toEqual(binaryOp(num(10), '*', x))

    // TODO: We could detect this case and reduce to one
    expect(reduceExpr(binaryOp(x, '/', x))).toEqual(binaryOp(x, '/', x))
    expect(reduceExpr(binaryOp(x, '/', one))).toEqual(x)
    expect(reduceExpr(binaryOp(one, '/', x))).toEqual(binaryOp(one, '/', x))
    expect(reduceExpr(binaryOp(x, '/', two))).toEqual(binaryOp(x, '/', two))
    expect(reduceExpr(binaryOp(two, '/', x))).toEqual(binaryOp(two, '/', x))

    expect(reduceExpr(binaryOp(x, '^', x))).toEqual(binaryOp(x, '^', x))
    expect(reduceExpr(binaryOp(x, '^', zero))).toEqual(one)
    expect(reduceExpr(binaryOp(zero, '^', x))).toEqual(binaryOp(zero, '^', x))
    expect(reduceExpr(binaryOp(x, '^', one))).toEqual(x)
    expect(reduceExpr(binaryOp(one, '^', x))).toEqual(binaryOp(one, '^', x))

    // TODO: We could detect this case and reduce to one
    expect(reduceExpr(binaryOp(x, '=', x))).toEqual(binaryOp(x, '=', x))
    expect(reduceExpr(binaryOp(x, '=', zero))).toEqual(binaryOp(x, '=', zero))

    // TODO: We could detect this case and reduce to zero
    expect(reduceExpr(binaryOp(x, '<>', x))).toEqual(binaryOp(x, '<>', x))
    expect(reduceExpr(binaryOp(x, '<>', zero))).toEqual(binaryOp(x, '<>', zero))

    // TODO: We could detect this case and reduce to zero
    expect(reduceExpr(binaryOp(x, '<', x))).toEqual(binaryOp(x, '<', x))
    expect(reduceExpr(binaryOp(x, '<', one))).toEqual(binaryOp(x, '<', one))

    // TODO: We could detect this case and reduce to zero
    expect(reduceExpr(binaryOp(x, '>', x))).toEqual(binaryOp(x, '>', x))
    expect(reduceExpr(binaryOp(x, '>', one))).toEqual(binaryOp(x, '>', one))

    // TODO: We could detect this case and reduce to one
    expect(reduceExpr(binaryOp(x, '<=', x))).toEqual(binaryOp(x, '<=', x))
    expect(reduceExpr(binaryOp(x, '<=', one))).toEqual(binaryOp(x, '<=', one))

    // TODO: We could detect this case and reduce to zero
    expect(reduceExpr(binaryOp(x, '>=', x))).toEqual(binaryOp(x, '>=', x))
    expect(reduceExpr(binaryOp(x, '>=', one))).toEqual(binaryOp(x, '>=', one))

    // TODO: We could detect this case and reduce to `v`
    expect(reduceExpr(binaryOp(x, ':AND:', x))).toEqual(binaryOp(x, ':AND:', x))
    expect(reduceExpr(binaryOp(zero, ':AND:', zero))).toEqual(zero)
    expect(reduceExpr(binaryOp(x, ':AND:', zero))).toEqual(zero)
    expect(reduceExpr(binaryOp(zero, ':AND:', x))).toEqual(zero)
    expect(reduceExpr(binaryOp(one, ':AND:', one))).toEqual(one)
    expect(reduceExpr(binaryOp(x, ':AND:', one))).toEqual(x)
    expect(reduceExpr(binaryOp(one, ':AND:', x))).toEqual(x)

    // TODO: We could detect this case and reduce to `v`
    expect(reduceExpr(binaryOp(x, ':OR:', x))).toEqual(binaryOp(x, ':OR:', x))
    expect(reduceExpr(binaryOp(zero, ':OR:', zero))).toEqual(zero)
    expect(reduceExpr(binaryOp(x, ':OR:', zero))).toEqual(x)
    expect(reduceExpr(binaryOp(zero, ':OR:', x))).toEqual(x)
    expect(reduceExpr(binaryOp(one, ':OR:', one))).toEqual(one)
    expect(reduceExpr(binaryOp(x, ':OR:', one))).toEqual(one)
    expect(reduceExpr(binaryOp(one, ':OR:', x))).toEqual(one)
  })

  it('should reduce unary op expressions recursively', () => {
    // -(2-1) == -1
    expect(reduceExpr(unaryOp('-', binaryOp(two, '-', one)))).toEqual(num(-1))
  })

  it('should reduce binary op expressions recursively', () => {
    // 2*1 + v*0 == 2 + 0 == 2
    expect(reduceExpr(binaryOp(binaryOp(two, '*', one), '+', binaryOp(x, '*', zero)))).toEqual(two)

    // (2*1) - x == 2 - x
    expect(reduceExpr(binaryOp(parens(binaryOp(two, '*', one)), '-', x))).toEqual(binaryOp(two, '-', x))

    // 2 - (x*1) == 2 - x
    expect(reduceExpr(binaryOp(two, '-', parens(binaryOp(x, '*', one))))).toEqual(binaryOp(two, '-', x))

    // IF THEN ELSE(x, 2, 0) * 2
    expect(reduceExpr(binaryOp(call('IF THEN ELSE', one, two, zero), '*', two))).toEqual(num(4))
  })

  it('should not remove parens when the child expression resolves to a constant', () => {
    // (x*1) == x
    expect(reduceExpr(parens(binaryOp(x, '*', one)))).toEqual(x)
  })

  it('should not remove parens when the child expression cannot be reduced further', () => {
    // (x*2) == (x*2)
    expect(reduceExpr(parens(binaryOp(x, '*', two)))).toEqual(parens(binaryOp(x, '*', two)))
  })

  it('should reduce call arg expressions', () => {
    expect(reduceExpr(call('MIN', binaryOp(one, '+', one), x))).toEqual(call('MIN', two, x))
  })

  it('should reduce calls involving constants when possible', () => {
    expect(reduceExpr(call('IF THEN ELSE', x, zero, one))).toEqual(call('IF THEN ELSE', x, zero, one))
    expect(reduceExpr(call('IF THEN ELSE', one, x, y))).toEqual(x)
    expect(reduceExpr(call('IF THEN ELSE', zero, x, y))).toEqual(y)

    expect(reduceExpr(call('ABS', num(-1)))).toEqual(one)
    expect(reduceExpr(call('COS', one))).toEqual(num(Math.cos(1)))
    expect(reduceExpr(call('EXP', two))).toEqual(num(Math.exp(2)))
    expect(reduceExpr(call('INTEGER', num(2.5)))).toEqual(num(Math.trunc(2.5)))
    expect(reduceExpr(call('LN', two))).toEqual(num(Math.log(2)))
    expect(reduceExpr(call('MAX', one, two))).toEqual(two)
    expect(reduceExpr(call('MIN', one, two))).toEqual(one)
    expect(reduceExpr(call('MODULO', two, one))).toEqual(zero)
    expect(reduceExpr(call('POWER', two, two))).toEqual(num(Math.pow(2, 2)))
    // TODO: QUANTUM
    expect(reduceExpr(call('SIN', one))).toEqual(num(Math.sin(1)))
    expect(reduceExpr(call('SQRT', two))).toEqual(num(Math.sqrt(2)))

    expect(reduceExpr(call('INITIAL', two))).toEqual(two)
  })

  it('should try to resolve variable refs when callback is provided', () => {
    interface Variable {
      refId: string
      expr?: Expr
    }

    const xVar: Variable = { refId: '_x', expr: one }

    function resolveVarRef(varRef: VariableRef): Expr | undefined {
      if (varRef.varId === '_x') {
        return xVar.expr
      } else {
        return undefined
      }
    }

    const opts: ReduceExprOptions = {
      resolveVarRef
    }
    expect(reduceExpr(varRef('x'), opts)).toEqual(one)
    expect(reduceExpr(varRef('y'), opts)).toEqual(varRef('y'))
    expect(reduceExpr(binaryOp(call('IF THEN ELSE', varRef('x'), two, zero), '*', two), opts)).toEqual(num(4))
  })
})

describe('reduceConditionals', () => {
  it('should reduce conditionals when possible but leave others untouched', () => {
    // This one cannot be reduced because the var in the condition cannot be resolved
    expect(reduceConditionals(binaryOp(call('IF THEN ELSE', x, zero, one), '*', zero))).toEqual(
      binaryOp(call('IF THEN ELSE', x, zero, one), '*', zero)
    )

    // The next ones can eliminate a branch, but should avoid reducing anything outside
    // of the condition expression
    expect(reduceConditionals(binaryOp(call('IF THEN ELSE', one, x, y), '*', zero))).toEqual(binaryOp(x, '*', zero))
    expect(reduceConditionals(binaryOp(call('IF THEN ELSE', binaryOp(zero, '*', two), x, y), '*', zero))).toEqual(
      binaryOp(y, '*', zero)
    )
  })

  it('should try to resolve variable refs in the condition but not elsewhere', () => {
    interface Variable {
      refId: string
      expr?: Expr
    }

    const xVar: Variable = { refId: '_x', expr: one }

    function resolveVarRef(varRef: VariableRef): Expr | undefined {
      if (varRef.varId === '_x') {
        return xVar.expr
      } else {
        return undefined
      }
    }

    // Note that unlike the `reduceExpr` tests above, the `reduceConditionals` function
    // should not attempt to reduce `variable-ref` expressions outside of the condition
    // expression, so the `x` variable references below are expected to remain unchanged
    // (should not be reduced to or replaced with the constant value)
    const opts: ReduceExprOptions = {
      resolveVarRef
    }
    expect(reduceConditionals(varRef('x'), opts)).toEqual(varRef('x'))
    expect(reduceConditionals(varRef('y'), opts)).toEqual(varRef('y'))

    // In this example, the `x` used in the condition expression resolves to a constant
    // value of 1, so the whole `IF THEN ELSE` is expected to be replaced with the "true"
    // branch expression
    expect(reduceConditionals(binaryOp(call('IF THEN ELSE', varRef('x'), varRef('x'), zero), '*', two), opts)).toEqual(
      binaryOp(varRef('x'), '*', two)
    )
  })
})
