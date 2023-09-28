// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { OutputVarId, OutputVarSpec } from '../_shared'
import { Outputs } from './outputs'

type SubscriptId = string
type DimensionId = string

/**
 * Holds information about a subscript used in the model.
 */
interface Subscript {
  /** The subscript identifier, as used in SDE. */
  id: SubscriptId
  // /** The original subscript name, as used in the modeling tool. */
  // name: string
  /* The zero-based index for the subscript within the dimension. */
  index: number
}

/**
 * Holds information about a dimension (subscript family) used in the model.
 */
interface Dimension {
  /** The dimension identifier, as used in SDE. */
  id: DimensionId
  // /** The original dimension name, as used in the modeling tool. */
  // name: string
  /** The set of subscripts in this dimension. */
  subscripts: Subscript[]
}

/**
 * @hidden This is not yet part of the public API; it is exposed here for use
 * in experimental testing tools.
 */
export class ModelListing {
  public readonly varSpecs: Map<OutputVarId, OutputVarSpec> = new Map()

  constructor(modelJsonString: string) {
    // Parse the model listing JSON (as written by `sde generate --list`)
    const modelJson = JSON.parse(modelJsonString)

    // Put dimension info into a map for easier access
    const dimensions: Map<DimensionId, Dimension> = new Map()
    for (const dimInfo of modelJson.dimensions) {
      const dimId = dimInfo.name
      const subscripts: Subscript[] = []
      for (let i = 0; i < dimInfo.value.length; i++) {
        subscripts.push({
          id: dimInfo.value[i],
          // name: dimInfo.modelValue[i]
          index: i
        })
      }
      dimensions.set(dimId, {
        id: dimId,
        // name: dimInfo.modelName,
        subscripts
      })
    }

    function dimensionForId(dimId: DimensionId): Dimension {
      const dim = dimensions.get(dimId)
      if (dim === undefined) {
        throw new Error(`No dimension info found for id=${dimId}`)
      }
      return dim
    }

    // Gather the set of unique variables (consolidating refs that have different
    // subscripts but refer to the same variable)
    const baseVarIds: Set<OutputVarId> = new Set()
    for (const v of modelJson.variables) {
      // Get the base name of the variable (without subscripts)
      const baseVarId = varIdWithoutSubscripts(v.varName)

      if (!baseVarIds.has(baseVarId)) {
        // Look up dimensions from the map
        const dimIds: DimensionId[] = v.families || []
        const dimensions = dimIds.map(dimensionForId)

        // Expand and add all combinations of subscripts
        if (dimensions.length > 0) {
          // The variable is subscripted
          if (dimensions.length > 3) {
            // TODO: Add support for variables with more than 3 dimensions
            throw new Error('Variables with more than 3 dimensions not currently supported')
          }
          const dimSubs: Subscript[][] = []
          for (const dim of dimensions) {
            // For each dimension, get the array of subscripts;
            // for example, if the dimension has 3 subscripts, push
            // an array like ['_a1', '_a2', '_a3']
            dimSubs.push(dim.subscripts)
          }
          const combos = cartesianProductOf(dimSubs)
          for (const combo of combos) {
            // Add a spec for this var+subscript(s)
            const subs = combo.map(sub => sub.id).join(',')
            const subIndices = combo.map(sub => sub.index)
            const fullVarId = `${baseVarId}[${subs}]`
            this.varSpecs.set(fullVarId, {
              varIndex: v.varIndex,
              subscriptIndices: subIndices
            })
          }
        } else {
          // The variable is not subscripted
          this.varSpecs.set(baseVarId, {
            varIndex: v.varIndex
          })
        }

        // Mark this variable as visited
        baseVarIds.add(baseVarId)
      }
    }
  }

  /**
   * Create a new `Outputs` instance that uses the same start/end years as the given "normal"
   * `Outputs` instance but is prepared for reading the specified internal variables from the model.
   *
   * @param normalOutputs The `Outputs` that is used to access normal output variables from the model.
   * @param varIds The variable IDs to include with the new `Outputs` instance.
   */
  deriveOutputs(normalOutputs: Outputs, varIds: OutputVarId[]): Outputs {
    // Look up an `OutputVarSpec` for each variable ID
    const varSpecs: OutputVarSpec[] = []
    for (const varId of varIds) {
      const varSpec = this.varSpecs.get(varId)
      if (varSpec !== undefined) {
        varSpecs.push(varSpec)
      } else {
        // TODO: Throw error or just log warning?
        console.warn(`WARNING: No output var spec found for id=${varId}`)
      }
    }

    // Create a new `Outputs` instance that accepts the internal variables
    const newOutputs = new Outputs(varIds, normalOutputs.startTime, normalOutputs.endTime, normalOutputs.saveFreq)
    newOutputs.varSpecs = varSpecs
    return newOutputs
  }
}

/**
 * Helper function that returns the base name of a variable without the subscripts.
 */
function varIdWithoutSubscripts(fullVarId: string): string {
  const bracketIndex = fullVarId.indexOf('[')
  if (bracketIndex >= 0) {
    return fullVarId.substring(0, bracketIndex)
  } else {
    return fullVarId
  }
}

/**
 * Return the cartesian product of the given array of arrays.
 *
 * For example, if we have an array that lists out two dimensions:
 *   [ ['a1','a2'], ['b1','b2','b3'] ]
 * this function will return all the combinations, e.g.:
 *   [ ['a1', 'b1'], ['a1', 'b2'], ['a1', 'b3'], ['a2', 'b1'], ... ]
 *
 * This can be used in place of nested for loops and has the benefit of working
 * for multi-dimensional inputs.
 */
function cartesianProductOf<T>(arr: T[][]): T[][] {
  // Implementation based on: https://stackoverflow.com/a/36234242
  return arr.reduce(
    (a, b) => {
      return a.map(x => b.map(y => x.concat([y]))).reduce((v, w) => v.concat(w), [])
    },
    [[]]
  )
}
