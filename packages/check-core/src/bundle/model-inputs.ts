// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { VarId } from '../_shared/types'
import type { ModelSpec } from './bundle-types'
import type { InputVar } from './var-types'

/**
 * Wraps a `ModelSpec` to provide easier/faster lookups of input variables by variable
 * name or alias.
 */
export class ModelInputs {
  /** All inputs keyed by lookup name (lowercase variable name or alias). */
  private readonly inputsByLookupName: Map<string, InputVar> = new Map()

  /** All input ID aliases. */
  private readonly inputIdAliases: Set<string> = new Set()

  constructor(public readonly modelSpec: ModelSpec) {
    // Add the inputs from the primary map
    for (const inputVar of modelSpec.inputVars.values()) {
      // Add an entry with the input's variable name as the key
      const varNameKey = inputVar.varName.toLowerCase()
      this.inputsByLookupName.set(varNameKey, inputVar)

      if (inputVar.inputId) {
        // Also automatically add an entry using the input's ID as an alias.  Keep the original
        // input ID for the set of aliases (to preserve original case), but use lowercase for
        // the key, like we do for all other keys.
        const idAlias = `id ${inputVar.inputId}`
        this.inputIdAliases.add(idAlias)
        const idKey = idAlias.toLowerCase()
        this.inputsByLookupName.set(idKey, inputVar)
      }
    }

    if (modelSpec.inputAliases) {
      // Add the inputs from the alias map, keyed by alias
      for (const [alias, varId] of modelSpec.inputAliases.entries()) {
        const aliasKey = alias.toLowerCase()
        if (this.inputsByLookupName.has(aliasKey)) {
          console.warn(
            `WARNING: Input variable already defined with a name that collides with alias '${alias}', skipping`
          )
          continue
        }

        const inputVar = modelSpec.inputVars.get(varId)
        if (inputVar === undefined) {
          console.warn(`WARNING: No input variable found for '${varId}' associated with alias '${alias}', skipping`)
          continue
        }

        this.inputsByLookupName.set(aliasKey, inputVar)
      }
    }
  }

  /**
   * Return the set of `id XYZ` aliases for all input variables.
   */
  getAllInputIdAliases(): string[] {
    return [...this.inputIdAliases]
  }

  /**
   * Return the `InputVar` that matches the requested name (either by variable name or alias).
   *
   * @param name The variable name or alias to match.
   */
  getInputVarForName(name: string): InputVar | undefined {
    return this.inputsByLookupName.get(name.toLowerCase())
  }

  /**
   * Return the `InputVar` that matches the requested variable ID.
   *
   * @param varId The variable identifier to match.
   */
  getInputVarForVarId(varId: VarId): InputVar | undefined {
    return this.modelSpec.inputVars.get(varId)
  }
}
