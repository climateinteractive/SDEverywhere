// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { VarRef, VarSpec } from '../_shared'
import type { ModelListing } from '../model-listing'

/**
 * Resolve the provided variable reference using the `ModelListing` and variable name
 * or identifier.
 *
 * - If `varRef` has a defined `varSpec`, it is assumed to be valid.
 * - Otherwise, if `varRef` has a defined `varId`, it will be used to locate the
 *   corresponding `varSpec` in the provided listing.
 * - Otherwise, if `varRef` has a defined `varName`, it will be used to locate the
 *   corresponding `varSpec` in the provided listing.
 *
 * If the `varSpec` is found, this will set the `varSpec` property on the provided `varRef`.
 * Otherwise, this will throw an error.
 *
 * @hidden This is not part of the public API; it is exposed here for internal
 * use only.
 *
 * @param listing The model listing.
 * @param varRef The variable reference.
 * @param varKind The kind of variable (e.g., "lookup"), used to build an error message.
 */
export function resolveVarRef(listing: ModelListing | undefined, varRef: VarRef, varKind: string): VarSpec {
  if (varRef.varSpec) {
    // We assume the spec is valid
    // TODO: Should we validate the spec here?
    return
  }

  if (listing === undefined) {
    throw new Error(
      `Unable to resolve ${varKind} variable references by name or identifier when model listing is unavailable`
    )
  }

  if (varRef.varId) {
    const varSpec = listing?.getSpecForVarId(varRef.varId)
    if (varSpec) {
      varRef.varSpec = varSpec
    } else {
      throw new Error(`Failed to resolve ${varKind} variable reference for varId=${varRef.varId}`)
    }
  } else {
    const varSpec = listing?.getSpecForVarName(varRef.varName)
    if (varSpec) {
      varRef.varSpec = varSpec
    } else {
      throw new Error(`Failed to resolve ${varKind} variable reference for varName='${varRef.varId}'`)
    }
  }
}
