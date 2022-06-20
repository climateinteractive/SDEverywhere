// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { DatasetKey, OutputVar, SourceName } from '@sdeverywhere/check-core'
import type { OutputVarId } from '@sdeverywhere/runtime'

export interface OutputSpec {
  /** The variable identifier (as used by SDEverywhere). */
  varId: string
  /** The variable name (as used in the modeling tool). */
  varName: string
}

/**
 * Gather the list of output variables (and their related graphs, etc) used
 * in this version of the model.
 */
export function getOutputVars(outputSpecs: OutputSpec[]): Map<DatasetKey, OutputVar> {
  // Convert the specs to `OutputVar` instances
  const outputVars: Map<DatasetKey, OutputVar> = new Map()

  for (const outputSpec of outputSpecs) {
    const varId = outputSpec.varId
    const datasetKey = datasetKeyForOutputVar(undefined, varId)
    outputVars.set(datasetKey, {
      sourceName: undefined,
      varId,
      varName: outputSpec.varName
    })
  }

  return outputVars
}

export function datasetKeyForOutputVar(sourceName: SourceName | undefined, varId: OutputVarId): DatasetKey {
  return `${sourceName || 'Model'}_${varId}`
}
