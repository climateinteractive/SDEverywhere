// Copyright (c) 2020-2022 Climate Interactive / New Venture Fund

import type { Point } from './types'
import type { VarSpec } from './var-indices'

/**
 * Specifies the data that will be used to set or override a lookup definition.
 */
export interface LookupDef {
  /** The spec for the lookup or data variable to be modified. */
  varSpec: VarSpec
  /** The lookup data as a flat array of (x,y) pairs. */
  points: Float64Array
}

/**
 * Create a `LookupDef` instance from the given array of `Point` objects.
 * @param varSpec The spec for the lookup or data variable to be modified.
 * @param points The lookup data as an array of `Point` objects.
 */
export function createLookupDef(varSpec: VarSpec, points: Point[]): LookupDef {
  const flatPoints = new Float64Array(points.length * 2)
  let i = 0
  for (const p of points) {
    flatPoints[i++] = p.x
    flatPoints[i++] = p.y
  }
  return {
    varSpec,
    points: flatPoints
  }
}
