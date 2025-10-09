// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { BundleModel, Dataset, DatasetKey, InputVar, ModelSpec, OutputVar, VarId } from '@sdeverywhere/check-core'

export function inputVar(inputId: string, varName: string): [VarId, InputVar] {
  const varId = `_${varName.toLowerCase()}`
  const v: InputVar = {
    inputId,
    varId,
    varName,
    defaultValue: 50,
    minValue: 0,
    maxValue: 100
  }
  return [varId, v]
}

export function outputVar(varName: string, source?: string): [DatasetKey, OutputVar] {
  const varId = `_${varName.toLowerCase().replace(/\s/g, '_')}`
  const datasetKey = `${source || 'Model'}_${varId}`
  const v: OutputVar = {
    datasetKey,
    sourceName: source,
    varId,
    varName
  }
  return [datasetKey, v]
}

function dataset(delta = 0): Dataset {
  return new Map([
    [2000, 10 + delta],
    [2020, 20 + delta],
    [2040, 80 + delta],
    [2060, 50 + delta],
    [2080, 70 + delta],
    [2100, 100 + delta]
  ])
}

export function mockBundleModel(modelSpec: ModelSpec): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async () => {
      return {
        // TODO: Allow for customizing the data points
        datasetMap: new Map([
          ['Model__o1', dataset()],
          ['Model__o2', dataset(5)],
          ['Model__o2_upper', dataset(15)],
          ['Model__o2_lower', dataset(-5)]
        ])
      }
    },
    getGraphDataForScenario: async () => {
      return undefined
    },
    getGraphLinksForScenario: () => {
      return []
    }
  }
}
