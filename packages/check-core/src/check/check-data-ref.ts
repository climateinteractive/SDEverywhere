// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { allInputsAtPositionSpec } from '../_shared/scenario-specs'
import type { CheckDataset } from './check-dataset'
import type { CheckScenario } from './check-scenario'

/**
 * The key type for data references (in the form `<ScenarioUid::DatasetKey>`).
 */
export type CheckDataRefKey = string

/**
 * The operation used to combine multiple referenced datasets into a single dataset.
 */
export type CheckDataRefOp = 'sum'

/**
 * A single dataset (along with the scenario used to produce it) that is referenced
 * by a predicate.  Each of these corresponds to one data fetch.
 */
export interface CheckRefDataset {
  /** The key for the reference; can be undefined if inputs or datasets failed to match. */
  key?: CheckDataRefKey
  /** The scenario used to generate the referenced dataset. */
  scenario: CheckScenario
  /** The referenced dataset. */
  dataset: CheckDataset
}

/**
 * The dataset(s) referenced by a particular predicate op (for cases where the check
 * is against other datasets rather than a constant value).  When more than one dataset
 * is referenced, the `op` determines how they are combined into a single dataset.
 */
export interface CheckDataRef {
  /** The operation used to combine the referenced datasets; undefined if there is a single dataset. */
  op?: CheckDataRefOp
  /** The referenced datasets. */
  refs: CheckRefDataset[]
}

/**
 * Return a new `CheckRefDataset` that includes the given dataset and scenario.
 *
 * @param dataset The referenced dataset.
 * @param scenario The referenced scenario; if undefined, the "all inputs at default"
 * scenario will be used.
 */
export function refDataset(dataset: CheckDataset, scenario?: CheckScenario): CheckRefDataset {
  if (!scenario) {
    scenario = {
      spec: allInputsAtPositionSpec('at-default'),
      inputDescs: []
    }
  }
  let key: CheckDataRefKey
  if (scenario.spec && dataset.datasetKey) {
    key = `${scenario.spec.uid}::${dataset.datasetKey}`
  }
  return {
    key,
    dataset,
    scenario
  }
}

/**
 * Return a new `CheckDataRef` that refers to the single given dataset and scenario.
 *
 * @param dataset The referenced dataset.
 * @param scenario The referenced scenario; if undefined, the "all inputs at default"
 * scenario will be used.
 */
export function dataRef(dataset: CheckDataset, scenario?: CheckScenario): CheckDataRef {
  return {
    refs: [refDataset(dataset, scenario)]
  }
}

/**
 * Return a new `CheckDataRef` that refers to the sum of the given datasets (all
 * evaluated in the same scenario).
 *
 * @param datasets The referenced datasets.
 * @param scenario The referenced scenario; if undefined, the "all inputs at default"
 * scenario will be used.
 */
export function sumDataRef(datasets: CheckDataset[], scenario?: CheckScenario): CheckDataRef {
  return {
    op: 'sum',
    refs: datasets.map(dataset => refDataset(dataset, scenario))
  }
}
