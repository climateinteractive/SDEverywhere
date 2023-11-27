// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import { binaryOp, lookupCall, num, parens, unaryOp } from './ast-builders'
import type { Expr, NumberLiteral, VariableRef } from './ast-types'

/**
 * @hidden This is not yet part of the public API.
 */
export interface ReduceExprOptions {
  /** A callback that returns the possibly reduced expression for the referenced variable. */
  resolveVarRef?: (varRef: VariableRef) => Expr | undefined
}

/**
 * @hidden This is not yet part of the public API.
 */
export function reduceExpr(expr: Expr, opts?: ReduceExprOptions): Expr {
  switch (expr.kind) {
    case 'number':
    case 'string':
    case 'keyword':
      return expr

    case 'variable-ref':
      if (opts?.resolveVarRef !== undefined) {
        // Note that we assume the resolved expression has already been reduced by
        // the callback, and don't attempt to reduce further
        const resolvedExpr = opts.resolveVarRef(expr)
        if (resolvedExpr) {
          return resolvedExpr
        }
      }
      return expr

    case 'unary-op': {
      // Reduce the child expression
      const child = reduceExpr(expr.expr, opts)
      switch (expr.op) {
        case '+':
          // When there is an explicit plus sign, we can take the child expression as is
          return child
        case '-':
          if (child.kind === 'number') {
            // Negate the number
            return num(-child.value)
          } else {
            // Cannot simplify further
            return unaryOp('-', child)
          }
        case ':NOT:':
          throw new Error('not yet implemented')
        default:
          assertNever(expr)
      }
      break
    }

    case 'binary-op': {
      // Reduce the lhs and rhs expressions
      // TODO: Don't visit rhs if expression can be reduced by looking at lhs alone
      const lhs = reduceExpr(expr.lhs, opts)
      const rhs = reduceExpr(expr.rhs, opts)
      if (lhs.kind === 'number' && rhs.kind === 'number') {
        // Perform basic arithmetic to reduce to a constant number
        switch (expr.op) {
          case '+':
            return num(lhs.value + rhs.value)
          case '-':
            return num(lhs.value - rhs.value)
          case '*':
            return num(lhs.value * rhs.value)
          case '/':
            // TODO: Catch divide-by-zero errors at compile time
            return num(lhs.value / rhs.value)
          case '^':
            return num(Math.pow(lhs.value, rhs.value))
          case '=':
            return num(lhs.value === rhs.value ? 1 : 0)
          case '<>':
            return num(lhs.value !== rhs.value ? 1 : 0)
          case '<':
            return num(lhs.value < rhs.value ? 1 : 0)
          case '>':
            return num(lhs.value > rhs.value ? 1 : 0)
          case '<=':
            return num(lhs.value <= rhs.value ? 1 : 0)
          case '>=':
            return num(lhs.value >= rhs.value ? 1 : 0)
          case ':AND:':
            // For AND expressions, if both sides are non-zero, then resolve to 1
            return num(lhs.value !== 0 && rhs.value !== 0 ? 1 : 0)
          case ':OR:':
            // For OR expressions, if either side is non-zero, then resolve to 1
            return num(lhs.value !== 0 || rhs.value !== 0 ? 1 : 0)
          default:
            assertNever(expr)
        }
      } else if (lhs.kind === 'number' || rhs.kind === 'number') {
        // Try to reduce identity expressions to a single value (x*1 == x, and so on)
        const lhsNum: number = lhs.kind === 'number' ? lhs.value : undefined
        const rhsNum: number = rhs.kind === 'number' ? rhs.value : undefined
        const numValue = lhsNum !== undefined ? lhsNum : rhsNum
        const otherSide = lhsNum !== undefined ? rhs : lhs
        switch (expr.op) {
          case '+': {
            if (numValue === 0) {
              // x+0 == x
              // 0+x == x
              return otherSide
            } else if (
              otherSide.kind === 'binary-op' &&
              otherSide.op === '+' &&
              (otherSide.lhs.kind === 'number' || otherSide.rhs.kind === 'number')
            ) {
              // In this case, one side is const and and the child is a '+' with a const, so we
              // can add the two consts and fold into a single add op
              const otherSideLhsNum: number = otherSide.lhs.kind === 'number' ? otherSide.lhs.value : undefined
              const otherSideRhsNum: number = otherSide.rhs.kind === 'number' ? otherSide.rhs.value : undefined
              const otherSideConstValue = otherSideLhsNum !== undefined ? otherSideLhsNum : otherSideRhsNum
              const otherSideOtherPart = otherSideLhsNum !== undefined ? otherSide.rhs : otherSide.lhs
              return binaryOp(num(numValue + otherSideConstValue), '+', otherSideOtherPart)
            }
            break
          }

          case '-': {
            if (rhsNum === 0) {
              // x-0 == x
              return lhs
            } else if (lhsNum === 0) {
              // 0-x == -x
              // TODO: This probably isn't too helpful
              return unaryOp('-', rhs)
            }
            break
          }

          case '*': {
            if (numValue === 0) {
              // x*0 == 0
              // 0*x == 0
              return num(0)
            } else if (numValue === 1) {
              // x*1 == x
              // 1*x == x
              return otherSide
            } else if (
              otherSide.kind === 'binary-op' &&
              otherSide.op === '*' &&
              (otherSide.lhs.kind === 'number' || otherSide.rhs.kind === 'number')
            ) {
              // In this case, one side is const and and the child is a '*' with a const, so we
              // can multiply the two consts and fold into a single multiply op
              const otherSideLhsNum: number = otherSide.lhs.kind === 'number' ? otherSide.lhs.value : undefined
              const otherSideRhsNum: number = otherSide.rhs.kind === 'number' ? otherSide.rhs.value : undefined
              const otherSideConstValue = otherSideLhsNum !== undefined ? otherSideLhsNum : otherSideRhsNum
              const otherSideOtherPart = otherSideLhsNum !== undefined ? otherSide.rhs : otherSide.lhs
              return binaryOp(num(numValue * otherSideConstValue), '*', otherSideOtherPart)
            }
            break
          }

          case '/': {
            if (rhsNum === 1) {
              // x/1 == x
              return lhs
            }
            break
          }

          case '^': {
            if (rhsNum === 0) {
              // x^0 == 1
              return num(1)
            } else if (rhsNum === 1) {
              // x^1 == x
              return lhs
            }
            break
          }

          case ':AND:':
            // For AND expressions:
            //   - if the constant side is zero, then resolve to zero (false)
            //       x && 0 == 0
            //       0 && x == 0
            //   - if the constant side is non-zero, then resolve to the other side
            //       x && 1 == x
            //       1 && x == x
            return numValue === 0 ? num(0) : otherSide

          case ':OR:':
            // For OR expressions:
            //   - if the constant side is non-zero, then resolve to one (true)
            //       x || 1 == 1
            //       1 || x == 1
            //   - if the constant side is zero, resolve to the other side
            //       x || 0 == x
            //       0 || x == x
            return numValue !== 0 ? num(1) : otherSide

          default:
            break
        }
      }

      // Cannot simplify further; return a new expression with the reduced child expressions
      return {
        kind: 'binary-op',
        lhs,
        op: expr.op,
        rhs
      }
    }

    case 'parens': {
      const child = reduceExpr(expr.expr, opts)
      switch (child.kind) {
        case 'number':
        case 'string':
        case 'keyword':
        case 'variable-ref':
          // When the child expression resolves to something simple, drop the parens
          // TODO: Are there other cases where we should drop the parens?
          return child
        default:
          // Otherwise, preserve the parens
          return parens(child)
      }
    }

    case 'lookup-def':
      // TODO: Reduce lookup def?
      return expr

    case 'lookup-call':
      // TODO: Reduce lookup call arg?
      return expr

    case 'function-call': {
      // Reduce each argument expression
      if (expr.fnId === '_IF_THEN_ELSE') {
        // If condition is a constant, we can eliminate the unused branch
        const conditionExpr = reduceExpr(expr.args[0], opts)
        if (conditionExpr.kind === 'number') {
          return conditionExpr.value !== 0 ? reduceExpr(expr.args[1], opts) : reduceExpr(expr.args[2], opts)
        }
      }

      // If all args are constant, apply the function at compile time (for certain functions)
      const reducedArgs = expr.args.map(arg => reduceExpr(arg, opts))
      const allConst = reducedArgs.every(arg => arg.kind === 'number')
      if (allConst) {
        const constArg = (index: number) => {
          const num = reducedArgs[index] as NumberLiteral
          return num.value
        }
        switch (expr.fnId) {
          case '_ABS':
            return num(Math.abs(constArg(0)))
          case '_COS':
            return num(Math.cos(constArg(0)))
          case '_EXP':
            return num(Math.exp(constArg(0)))
          case '_INITIAL':
            return reducedArgs[0]
          case '_INTEGER':
            return num(Math.trunc(constArg(0)))
          case '_LN':
            return num(Math.log(constArg(0)))
          case '_MAX':
            return num(Math.max(constArg(0), constArg(1)))
          case '_MIN':
            return num(Math.min(constArg(0), constArg(1)))
          case '_MODULO':
            return num(constArg(0) % constArg(1))
          case '_POWER':
            return num(Math.pow(constArg(0), constArg(1)))
          case '_SIN':
            return num(Math.sin(constArg(0)))
          case '_SQRT':
            return num(Math.sqrt(constArg(0)))
          default:
            break
        }
      }

      return {
        kind: 'function-call',
        fnName: expr.fnName,
        fnId: expr.fnId,
        args: reducedArgs
      }
    }

    default:
      return expr
    // assertNever(expr)
  }
}

/**
 * A variant of `reduceExpr` that does not aggressively reduce the expression, but only
 * tries to eliminate the unused branch if a conditional (`IF THEN ELSE`) has a condition
 * that resolves to a constant.
 *
 * @hidden This is not yet part of the public API.
 *
 * @param expr The expression to reduce.
 * @param opts The reduce options.
 */
export function reduceConditionals(expr: Expr, opts?: ReduceExprOptions): Expr {
  switch (expr.kind) {
    case 'number':
    case 'string':
    case 'keyword':
      return expr

    case 'variable-ref':
      if (opts?.resolveVarRef !== undefined) {
        // Note that we assume the resolved expression has already been reduced by
        // the callback, and don't attempt to reduce further
        const resolvedExpr = opts.resolveVarRef(expr)
        if (resolvedExpr) {
          return resolvedExpr
        }
      }
      return expr

    case 'unary-op': {
      const child = reduceConditionals(expr.expr, opts)
      return unaryOp(expr.op, child)
    }

    case 'binary-op': {
      const lhs = reduceConditionals(expr.lhs, opts)
      const rhs = reduceConditionals(expr.rhs, opts)
      return binaryOp(lhs, expr.op, rhs)
    }

    case 'parens': {
      const child = reduceConditionals(expr.expr, opts)
      switch (child.kind) {
        case 'number':
        case 'string':
        case 'keyword':
        case 'variable-ref':
          // When the child expression resolves to something simple, drop the parens
          // TODO: Are there other cases where we should drop the parens?
          return child
        default:
          // Otherwise, preserve the parens
          return parens(child)
      }
    }

    case 'lookup-def':
      return expr

    case 'lookup-call': {
      const arg = reduceConditionals(expr.arg, opts)
      return lookupCall(expr.varRef, arg)
    }

    case 'function-call': {
      if (expr.fnId === '_IF_THEN_ELSE') {
        // Note that (unlike all other places in this function) we use `reduceExpr` here
        // to aggressively reduce the condition
        const conditionExpr = reduceExpr(expr.args[0], opts)
        if (conditionExpr.kind === 'number') {
          return conditionExpr.value !== 0
            ? reduceConditionals(expr.args[1], opts)
            : reduceConditionals(expr.args[2], opts)
        }
      }

      // For all other kinds of function calls, call `reduceConditionals` on the args
      const reducedArgs = expr.args.map(arg => reduceConditionals(arg, opts))
      return {
        kind: 'function-call',
        fnName: expr.fnName,
        fnId: expr.fnId,
        args: reducedArgs
      }
    }

    default:
      assertNever(expr)
  }
}
