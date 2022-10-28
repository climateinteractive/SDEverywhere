// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

export type CheckPredicateOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'approx'

/**
 * Return the symbol that describes the given predicate op.
 *
 * @param op The predicate operation.
 */
export function symbolForPredicateOp(op: CheckPredicateOp): string {
  switch (op) {
    case 'gt':
      return '>'
    case 'gte':
      return '>='
    case 'lt':
      return '<'
    case 'lte':
      return '<='
    case 'eq':
      return '=='
    case 'approx':
      return '≈'
    default:
      assertNever(op)
  }
}
