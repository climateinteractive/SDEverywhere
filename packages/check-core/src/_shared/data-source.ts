// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ConstantOverride, ScenarioSpec } from './scenario-spec-types'
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

/**
 * Options for the `getDatasetsForScenario` method.
 */
export interface GetDatasetsOptions {
  /**
   * If defined, override the values for the specified constant variables.
   *
   * Unlike input settings (which work with pre-declared input variables), constant
   * overrides can modify ANY constant in the model when the `customConstants` feature
   * is enabled.
   *
   * Note that constant overrides do NOT persist across `getDatasetsForScenario` calls.
   * They must be provided each time you want to override constants.
   */
  constants?: ConstantOverride[]
}

export interface DataSource {
  /**
   * Return the datasets that result from running the given scenario.
   *
   * @param scenarioSpec The scenario spec that defines the inputs for the model run.
   * @param datasetKeys The keys of the datasets to be fetched.
   * @param options Optional configuration including constant overrides.
   */
  getDatasetsForScenario(
    scenarioSpec: ScenarioSpec,
    datasetKeys: DatasetKey[],
    options?: GetDatasetsOptions
  ): Promise<DatasetsResult>
}
