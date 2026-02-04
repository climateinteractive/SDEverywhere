// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { VarRef } from './types'

/**
 * Specifies the constant value that will be used to override a constant in a
 * generated model.
 */
export interface ConstantDef {
  /** The reference that identifies the constant variable to be modified. */
  varRef: VarRef

  /** The new constant value. */
  value: number
}

/**
 * Create a `ConstantDef` instance.
 *
 * @param varRef The reference to the constant variable to be modified.
 * @param value The new constant value.
 */
export function createConstantDef(varRef: VarRef, value: number): ConstantDef {
  return {
    varRef,
    value
  }
}
