// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { LookupDef } from './lookup-def'
import type { VarSpec } from './types'

/**
 * Return the length of the array that is required to store the variable
 * indices for the given `VarSpec` instances.
 *
 * @hidden This is not part of the public API; it is exposed here for use by
 * the synchronous and asynchronous model runner implementations.
 *
 * @param varSpecs The `VarSpec` instances to encode.
 */
export function getEncodedVarIndicesLength(varSpecs: VarSpec[]): number {
  // The indices buffer has the following format:
  //   variable count
  //   varN index
  //   varN subscript count
  //   varN sub1 index
  //   varN sub2 index
  //   ...
  //   varN subM index
  //   ... (repeat for each var spec)

  // Start with one element for the total variable count
  let length = 1

  for (const varSpec of varSpecs) {
    // Include one element for the variable index and one for the subscript count
    length += 2

    // Include one element for each subscript
    const subCount = varSpec.subscriptIndices?.length || 0
    length += subCount
  }

  return length
}

/**
 * Encode variable indices to the given array.
 *
 * @hidden This is not part of the public API; it is exposed here for use by
 * the synchronous and asynchronous model runner implementations.
 *
 * @param varSpecs The `VarSpec` instances to encode.
 */
export function encodeVarIndices(varSpecs: VarSpec[], indicesArray: Int32Array): void {
  // Write the variable count
  let offset = 0
  indicesArray[offset++] = varSpecs.length

  // Write the indices for each variable
  for (const varSpec of varSpecs) {
    // Write the variable index
    indicesArray[offset++] = varSpec.varIndex

    // Write the subscript count
    const subs = varSpec.subscriptIndices
    const subCount = subs?.length || 0
    indicesArray[offset++] = subCount

    // Write the subscript indices
    for (let i = 0; i < subCount; i++) {
      indicesArray[offset++] = subs[i]
    }
  }
}

/**
 * Return the lengths of the arrays that are required to store the lookup data
 * and indices for the given `LookupDef` instances.
 *
 * @hidden This is not part of the public API; it is exposed here for use by
 * the synchronous and asynchronous model runner implementations.
 *
 * @param lookupDefs The `LookupDef` instances to encode.
 */
export function getEncodedLookupBufferLengths(lookupDefs: LookupDef[]): {
  lookupIndicesLength: number
  lookupsLength: number
} {
  // The lookups buffer includes all data points for the provided lookup overrides
  // (added sequentially, with no padding between datasets).  The lookup indices
  // buffer has the following format:
  //   lookup count
  //   lookupN var index
  //   lookupN subscript count
  //   lookupN sub1 index
  //   lookupN sub2 index
  //   ...
  //   lookupN subM index
  //   lookupN data offset (relative to the start of the lookups buffer, in float64 elements)
  //   lookupN data length (in float64 elements)
  //   ... (repeat for each lookup)

  // Start with one element for the total lookup variable count
  let lookupIndicesLength = 1
  let lookupsLength = 0

  for (const lookupDef of lookupDefs) {
    // Ensure that the var spec has already been resolved
    const varSpec = lookupDef.varRef.varSpec
    if (varSpec === undefined) {
      throw new Error('Cannot compute lookup buffer lengths until all lookup var specs are defined')
    }

    // Include one element for the variable index and one for the subscript count
    lookupIndicesLength += 2

    // Include one element for each subscript
    const subCount = varSpec.subscriptIndices?.length || 0
    lookupIndicesLength += subCount

    // Include one element for the data offset and one element for the data length
    lookupIndicesLength += 2

    // Add the length of the lookup points array
    lookupsLength += lookupDef.points?.length || 0
  }

  return {
    lookupIndicesLength,
    lookupsLength
  }
}

/**
 * Encode lookup data and indices to the given arrays.
 *
 * @hidden This is not part of the public API; it is exposed here for use by
 * the synchronous and asynchronous model runner implementations.
 *
 * @param lookupDefs The `LookupDef` instances to encode.
 * @param lookupIndicesArray The view on the lookup indices buffer.
 * @param lookupsArray The view on the lookup data buffer.  This can be undefined in
 * the case where the data for the lookup(s) is empty.
 */
export function encodeLookups(
  lookupDefs: LookupDef[],
  lookupIndicesArray: Int32Array,
  lookupsArray: Float64Array | undefined
): void {
  // Write the lookup variable count
  let li = 0
  lookupIndicesArray[li++] = lookupDefs.length

  // Write the indices and data for each lookup
  let lookupDataOffset = 0
  for (const lookupDef of lookupDefs) {
    // Write the lookup variable index
    const varSpec = lookupDef.varRef.varSpec
    lookupIndicesArray[li++] = varSpec.varIndex

    // Write the subscript count
    const subs = varSpec.subscriptIndices
    const subCount = subs?.length || 0
    lookupIndicesArray[li++] = subCount

    // Write the subscript indices
    for (let i = 0; i < subCount; i++) {
      lookupIndicesArray[li++] = subs[i]
    }

    if (lookupDef.points !== undefined) {
      // Write the lookup data offset and length for this variable
      lookupIndicesArray[li++] = lookupDataOffset
      lookupIndicesArray[li++] = lookupDef.points.length

      // Write the lookup data.  Note that `lookupsView` can be undefined in the case
      // where the lookup data is empty.
      lookupsArray?.set(lookupDef.points, lookupDataOffset)
      lookupDataOffset += lookupDef.points.length
    } else {
      // Note that the points array can be undefined, which is used to indicate
      // that the lookup should be reset to its original data.  In this case,
      // we use -1 for the data offset, which will be translated to NULL/undefined
      // when passed to the `setLookup` call.
      lookupIndicesArray[li++] = -1
      lookupIndicesArray[li++] = 0
    }
  }
}

/**
 * Decode lookup data and indices from the given buffer views and return the
 * reconstructed `LookupDef` instances.
 *
 * @hidden This is not part of the public API; it is exposed here for use by
 * the synchronous and asynchronous model runner implementations.
 *
 * @param lookupIndicesArray The view on the lookup indices buffer.
 * @param lookupsArray The view on the lookup data buffer.  This can be undefined in
 * the case where the data for the lookup(s) is empty.
 */
export function decodeLookups(lookupIndicesArray: Int32Array, lookupsArray: Float64Array | undefined): LookupDef[] {
  const lookupDefs: LookupDef[] = []
  let li = 0

  // Read the lookup variable count
  const lookupCount = lookupIndicesArray[li++]

  // Read the metadata for each variable from the lookup indices buffer
  for (let i = 0; i < lookupCount; i++) {
    // Read the lookup variable index
    const varIndex = lookupIndicesArray[li++]

    // Read the subscript count
    const subCount = lookupIndicesArray[li++]

    // Read the subscript indices
    const subscriptIndices: number[] = subCount > 0 ? Array(subCount) : undefined
    for (let subIndex = 0; subIndex < subCount; subIndex++) {
      subscriptIndices[subIndex] = lookupIndicesArray[li++]
    }

    // Read the lookup data offset and length for this variable
    const lookupDataOffset = lookupIndicesArray[li++]
    const lookupDataLength = lookupIndicesArray[li++]

    // Create a `VarSpec` for the variable
    const varSpec: VarSpec = {
      varIndex,
      subscriptIndices
    }

    let points: Float64Array
    if (lookupDataOffset >= 0) {
      // Copy the data from the lookup data buffer.  Note that `lookupsArray` can be undefined
      // in the case where the lookup data is empty.
      // TODO: We can use `subarray` here instead of `slice` and let the model implementations
      // copy the data if needed on their side
      if (lookupsArray) {
        points = lookupsArray.slice(lookupDataOffset, lookupDataOffset + lookupDataLength)
      } else {
        points = new Float64Array(0)
      }
    } else {
      // A negative data offset value is used in the case where the points array is undefined,
      // which is used to indicate that the lookup should be reset to its original data
      points = undefined
    }
    lookupDefs.push({
      varRef: {
        varSpec
      },
      points
    })
  }

  return lookupDefs
}
