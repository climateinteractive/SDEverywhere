// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  CheckDataset,
  CheckScenario,
  CheckDataRef,
  CheckPredicateOpConstantRef,
  CheckPredicateOpDataRef
} from '@sdeverywhere/check-core'

import { allInputsAtPositionSpec } from './mock-scenario-spec'

export function dataset(prefix: string, varName: string): CheckDataset {
  const varId = `_${varName.toLowerCase()}`
  const datasetKey = `${prefix}_${varId}`
  return {
    datasetKey,
    name: varName
  }
}

function dataRef(dataset: CheckDataset, scenario?: CheckScenario): CheckDataRef {
  if (!scenario) {
    scenario = {
      spec: allInputsAtPositionSpec('at-default'),
      inputDescs: []
    }
  }
  return {
    key: `${scenario.spec.uid}::${dataset.datasetKey}`,
    dataset,
    scenario
  }
}

export function opConstantRef(value: number): CheckPredicateOpConstantRef {
  return {
    kind: 'constant',
    value
  }
}

export function opDataRef(dataset: CheckDataset, scenario?: CheckScenario): CheckPredicateOpDataRef {
  return {
    kind: 'data',
    dataRef: dataRef(dataset, scenario)
  }
}
