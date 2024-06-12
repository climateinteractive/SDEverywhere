// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { VarSpec } from './types'

/**
 * For each variable specified in an indices buffer, there are 4 index values:
 *   varIndex
 *   subIndex0
 *   subIndex1
 *   subIndex2
 * NOTE: This value needs to match `INDICES_PER_VARIABLE` as defined in SDE's `model.c`.
 * @hidden This is not part of the public API.
 */
export const indicesPerVariable = 4

/**
 * @hidden This is not part of the public API; it is exposed here for use by
 * the synchronous and asynchronous model runner implementations.
 */
export function updateVarIndices(indicesArray: Int32Array, varSpecs: VarSpec[]): void {
  if (indicesArray.length < varSpecs.length * indicesPerVariable) {
    throw new Error('Length of indicesArray must be large enough to accommodate the given varSpecs')
  }

  // Write the indices to the buffer
  let offset = 0
  for (const varSpec of varSpecs) {
    const subCount = varSpec.subscriptIndices?.length || 0
    indicesArray[offset + 0] = varSpec.varIndex
    indicesArray[offset + 1] = subCount > 0 ? varSpec.subscriptIndices[0] : 0
    indicesArray[offset + 2] = subCount > 1 ? varSpec.subscriptIndices[1] : 0
    indicesArray[offset + 3] = subCount > 2 ? varSpec.subscriptIndices[2] : 0
    offset += indicesPerVariable
  }

  // Fill the remainder of the buffer with zeros
  indicesArray.fill(0, offset)
}
