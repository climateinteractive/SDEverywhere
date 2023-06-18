// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { allInputsAtPositionSpec } from '../_shared/scenario-specs'
import type { CheckDataset } from './check-dataset'
import type { CheckScenario } from './check-scenario'

/**
 * The key type for data references (in the form `<ScenarioUid::DatasetKey>`).
 */
export type CheckDataRefKey = string

/**
 * The scenario and dataset referenced by a particular predicate (for cases
 * where the check is against another dataset rather than a constant value).
 */
export interface CheckDataRef {
  /** The key for the reference; can be undefined if inputs or datasets failed to match. */
  key?: CheckDataRefKey
  /** The scenario used to generate the referenced dataset. */
  scenario: CheckScenario
  /** The referenced dataset. */
  dataset: CheckDataset
}

/**
 * Return a new `CheckDataRef` that includes the given dataset and scenario.
 *
 * @param dataset The referenced dataset.
 * @param scenario The referenced scenario; if undefined, the "all inputs at default"
 * scenario will be used.
 */
export function dataRef(dataset: CheckDataset, scenario?: CheckScenario): CheckDataRef {
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
