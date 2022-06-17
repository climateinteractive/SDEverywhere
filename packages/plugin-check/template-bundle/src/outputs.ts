// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { DatasetKey, OutputVar, SourceName } from '@sdeverywhere/check-core'
import type { OutputVarId } from '@sdeverywhere/runtime'

/**
 * Gather the list of output variables (and their related graphs, etc) used
 * in this version of the model.
 */
export function getOutputVars(): Map<DatasetKey, OutputVar> {
  // Convert the info to `OutputVar` instances
  const outputVars: Map<DatasetKey, OutputVar> = new Map()

  // for (const [datasetKey, outputInfo] of outputInfoMap.entries()) {
  //   outputVars.set(datasetKey, {
  //     sourceName: outputInfo.sourceName,
  //     varId: outputInfo.varId,
  //     varName: outputInfo.varName,
  //     relatedItems: []
  //   })
  // }

  return outputVars
}

export function datasetKeyForOutputVar(sourceName: SourceName | undefined, varId: OutputVarId): DatasetKey {
  return `${sourceName || 'Model'}_${varId}`
}
