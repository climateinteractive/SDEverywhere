// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ScenarioSpec } from './scenario-spec-types'
import type { DatasetKey, DatasetMap } from './types'

export interface DatasetsResult {
  /**
   * The map of datasets for the scenario.
   */
  datasetMap: DatasetMap
  /**
   * The number of milliseconds that elapsed when running the model, or undefined if the model
   * wasn't run for this scenario.
   */
  modelRunTime?: number
}

export interface DataSource {
  /** Return the datasets that result from running the given scenario. */
  getDatasetsForScenario(scenarioSpec: ScenarioSpec, datasetKeys: DatasetKey[]): Promise<DatasetsResult>
}
