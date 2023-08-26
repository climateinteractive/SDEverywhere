// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { Expr, VariableRef } from '../ast/ast-types'

export function debugPrintExpr(expr: Expr, indent = 0): void {
  const spaces = ' '.repeat(indent * 2)
  const log = (s: string) => {
    console.log(`${spaces}${s}`)
  }

  switch (expr.kind) {
    case 'number':
      log(`const: ${expr.value}`)
      break

    case 'variable-ref':
      log(`ref: ${fullIdForVarRef(expr)}`)
      break

    case 'unary-op':
      log(`unary-op: ${expr.op}`)
      debugPrintExpr(expr.expr, indent + 1)
      break

    case 'binary-op':
      log(`binary-op: ${expr.op}`)
      debugPrintExpr(expr.lhs, indent + 1)
      debugPrintExpr(expr.rhs, indent + 1)
      break

    case 'lookup-def':
      // TODO: Include range and points?
      log(`lookup-def`)
      break

    case 'lookup-call':
      log(`lookup-call: ${debugPrintExpr(expr.varRef)}`)
      debugPrintExpr(expr.arg, indent + 1)
      break

    case 'function-call':
      log(`function-call: ${expr.fnId}`)
      expr.args.forEach(arg => debugPrintExpr(arg, indent + 1))
      break

    default:
      assertNever(expr)
  }
}

export type FormatVariableRefFunc = (varRef: VariableRef) => string

export interface PrettyOpts {
  html?: boolean
  formatVariableRef?: FormatVariableRefFunc
}

export function toPrettyString(expr: Expr, opts?: PrettyOpts): string {
  switch (expr.kind) {
    case 'number':
      return expr.value.toString()

    case 'variable-ref':
      if (opts?.formatVariableRef) {
        return opts.formatVariableRef(expr)
      } else {
        if (expr.subscriptRefs?.length > 0) {
          return `${expr.varName}[${expr.subscriptRefs.map(ref => ref.subName).join(', ')}]`
        } else {
          return expr.varName
        }
      }

    case 'unary-op':
      if (expr.op === ':NOT:') {
        return `${expr.op} ${toPrettyString(expr.expr, opts)}`
      } else {
        return `${expr.op}${toPrettyString(expr.expr, opts)}`
      }

    case 'binary-op': {
      let op: string
      if (opts?.html === true) {
        switch (expr.op) {
          case '<':
            op = '&lt;'
            break
          case '<=':
            op = '&lt;='
            break
          case '>':
            op = '&gt;'
            break
          case '>=':
            op = '&gt;='
            break
          default:
            op = expr.op
            break
        }
      } else {
        op = expr.op
      }
      return `( ${toPrettyString(expr.lhs, opts)} ${op} ${toPrettyString(expr.rhs, opts)} )`
    }

    case 'lookup-def': {
      const pointString = (p: [number, number]) => {
        return `(${p[0]},${p[1]})`
      }
      const points = expr.points.map(pointString).join(', ')
      if (expr.range) {
        const min = pointString(expr.range.min)
        const max = pointString(expr.range.max)
        return `( [${min}-${max}], ${points} )`
      } else {
        return `( ${points} )`
      }
    }

    case 'lookup-call': {
      const varRef = toPrettyString(expr.varRef, opts)
      const arg = toPrettyString(expr.arg, opts)
      return `${varRef}( ${arg} )`
    }

    case 'function-call': {
      const args = expr.args.map(arg => toPrettyString(arg, opts))
      return `${expr.fnName}( ${args.join(', ')} )`
    }

    default:
      assertNever(expr)
  }
}

export function prettyPrintExpr(expr: Expr, indent = 0): void {
  const spaces = ' '.repeat(indent * 2)
  const log = (s: string) => {
    console.log(`${spaces}${s}`)
  }
  log(toPrettyString(expr))
}

type CountMap = Map<string, number>

class Stats {
  constCount = 0
  varRefCount = 0
  readonly unaryOpCounts: CountMap = new Map()
  readonly binaryOpCounts: CountMap = new Map()
  readonly fnCallCounts: CountMap = new Map()
  readonly luCallCounts: CountMap = new Map()
}

function increment(map: CountMap, key: string): void {
  const count = map.get(key) || 0
  map.set(key, count + 1)
}

function getExprStats(expr: Expr, stats: Stats) {
  switch (expr.kind) {
    case 'number':
      stats.constCount++
      break

    case 'variable-ref':
      stats.varRefCount++
      break

    case 'unary-op':
      getExprStats(expr.expr, stats)
      increment(stats.unaryOpCounts, expr.op)
      break

    case 'binary-op':
      getExprStats(expr.lhs, stats)
      getExprStats(expr.rhs, stats)
      increment(stats.binaryOpCounts, expr.op)
      break

    case 'lookup-def':
      // TODO
      break

    case 'lookup-call':
      increment(stats.luCallCounts, fullIdForVarRef(expr.varRef))
      getExprStats(expr.arg, stats)
      break

    case 'function-call':
      increment(stats.fnCallCounts, expr.fnId)
      expr.args.forEach(arg => getExprStats(arg, stats))
      break

    default:
      assertNever(expr)
  }
}

export function printExprStats(exprs: Expr[]): void {
  const stats = new Stats()
  for (const expr of exprs) {
    getExprStats(expr, stats)
  }

  function printCount(count: number, label: string) {
    console.log(`${count.toString().padStart(6)} ${label}`)
  }

  function printCounts(map: CountMap): number {
    const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    let total = 0
    for (const entry of entries) {
      printCount(entry[1], entry[0])
      total += entry[1]
    }
    printCount(total, 'total')
    return total
  }

  let nodeCount = 0

  printCount(stats.constCount, 'consts')
  nodeCount += stats.constCount

  printCount(stats.varRefCount, 'var refs')
  nodeCount += stats.varRefCount

  console.log()
  console.log('UNARY OPS')
  nodeCount += printCounts(stats.unaryOpCounts)

  console.log()
  console.log('BINARY OPS')
  nodeCount += printCounts(stats.binaryOpCounts)

  console.log()
  console.log('FUNCTION CALLS')
  nodeCount += printCounts(stats.fnCallCounts)

  console.log()
  console.log('LOOKUP CALLS')
  nodeCount += printCounts(stats.luCallCounts)

  console.log()
  console.log('TOTAL')
  printCount(nodeCount, 'nodes')
}

// TODO: Move to names.ts?
function fullIdForVarRef(varRef: VariableRef): string {
  if (varRef.subscriptRefs?.length > 0) {
    return `${varRef.varId}[${varRef.subscriptRefs.map(ref => ref.subId).join(',')}]`
  } else {
    return varRef.varId
  }
}
