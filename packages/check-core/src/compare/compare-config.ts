// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Scenario } from '../_shared/scenario'
import type { DatasetKey, ScenarioGroupKey, ScenarioKey } from '../_shared/types'
import type { LoadedBundle, NamedBundle } from '../bundle/bundle-types'
import type { CompareGroupInfo } from './compare-group'
import type { DatasetInfo, ScenarioInfo } from './compare-info'

/**
 * Provides access to the set of scenarios that are used when comparing the two models.
 */
export interface CompareScenarios {
  /**
   * Return an array containing all configured scenarios.
   */
  getScenarios(): Scenario[]

  /**
   * Return the scenario for the given key.
   *
   * @param scenarioKey The key for the scenario.
   */
  getScenario(scenarioKey: ScenarioKey): Scenario | undefined

  /**
   * Return the group info for the given group key.
   *
   * @param groupKey The scenario group key.
   */
  getScenarioGroupInfo(groupKey: ScenarioGroupKey): CompareGroupInfo | undefined

  /**
   * Return the title/subtitle info for the given scenario.
   *
   * Note that the given `groupKey` could be different than `scenario.groupKey`.  This
   * will be the case for the "all inputs at default" item that is included in each
   * row in the detail view for reference purposes.  The provided `groupKey` will be
   * used to customize the title and subtitle for that item (for example, it will show
   * the default value of the input associated with the row).
   *
   * @param scenario The scenario to be displayed.
   * @param groupKey The key for the group in which the scenario will be displayed.
   */
  getScenarioInfo(scenario: Scenario, groupKey: ScenarioGroupKey): ScenarioInfo | undefined
}

/**
 * Provides access to the set of datasets that are configured for comparison.
 */
export interface CompareDatasets {
  /** The mapping of renamed dataset keys. */
  renamedDatasetKeys?: Map<DatasetKey, DatasetKey>

  /**
   * Return the keys for the datasets that should be compared for the given scenario.
   *
   * @param scenario The scenario.
   */
  getDatasetKeysForScenario(scenario: Scenario): DatasetKey[]

  /**
   * Return the dataset info for the given key.
   */
  getDatasetInfo(datasetKey: DatasetKey): DatasetInfo | undefined
}

export interface CompareOptions {
  baseline: NamedBundle
  thresholds: number[]
  scenarios: CompareScenarios
  datasets: CompareDatasets
}

export interface CompareConfig {
  bundleL: LoadedBundle
  bundleR: LoadedBundle
  thresholds: number[]
  scenarios: CompareScenarios
  datasets: CompareDatasets
}
