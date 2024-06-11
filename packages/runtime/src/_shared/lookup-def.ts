// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { Point, VarRef } from './types'

/**
 * Specifies the data that will be used to set or override a lookup definition.
 */
export interface LookupDef {
  /** The reference that identifies the lookup or data variable to be modified. */
  varRef: VarRef

  /** The lookup data as a flat array of (x,y) pairs. */
  points: Float64Array
}

/**
 * Create a `LookupDef` instance from the given array of `Point` objects.
 *
 * @param varRef The reference to the lookup or data variable to be modified.
 * @param points The lookup data as an array of `Point` objects.
 */
export function createLookupDef(varRef: VarRef, points: Point[]): LookupDef {
  const flatPoints = new Float64Array(points.length * 2)
  let i = 0
  for (const p of points) {
    flatPoints[i++] = p.x
    flatPoints[i++] = p.y
  }

  return {
    varRef,
    points: flatPoints
  }
}
