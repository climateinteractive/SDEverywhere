// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Scenario } from '../_shared/scenario'
import { allInputsAtPositionScenario } from '../_shared/scenario'
import type { DataPlanner } from '../data/data-planner'
import type { CompareConfig } from './compare-config'
import { diffDatasets } from './compare-diff-datasets'
import type { CompareDatasetReport } from './compare-report'

/**
 * Prepare all comparison tests and add them to the given data planner.
 *
 * @param compareConfig The compare configuration.
 * @param dataPlanner The planner that will plan out data fetches for the compare tests.
 * @param simplifyScenarios If true, only run the "all inputs at default" scenario.
 * @return A function that will build the compare reports after the data requests are all processed.
 */
export function runCompare(
  compareConfig: CompareConfig,
  dataPlanner: DataPlanner,
  simplifyScenarios: boolean
): () => CompareDatasetReport[] {
  // Get the configured set of scenarios
  const scenarios: Scenario[] = simplifyScenarios
    ? [allInputsAtPositionScenario('at-default')]
    : compareConfig.scenarios.getScenarios()

  // TODO: The following leads to an explosion of scenario/dataset combinations;
  // if memory usage becomes a concern, we can change this to add a wildcard
  // placeholder in the data request and then expand the dataset keys at the
  // time that the request is processed instead of adding them all in advance
  const datasetReports: CompareDatasetReport[] = []
  for (const scenario of scenarios) {
    // Get the keys of the datasets of interest for this scenario
    const datasetKeys = compareConfig.datasets.getDatasetKeysForScenario(scenario)

    // For each dataset key, add a request so that the datasets are fetched
    // from the data sources (i.e., run the models with the given scenario
    // and compare the datasets)
    for (const datasetKey of datasetKeys) {
      dataPlanner.addRequest('compare', scenario, datasetKey, datasets => {
        // Diff the two datasets
        const diffReport = diffDatasets(datasets.datasetL, datasets.datasetR)
        datasetReports.push({
          scenarioKey: scenario.key,
          datasetKey,
          diffReport
        })
      })
    }
  }

  // Return a function that will build the report with the check results; this
  // should be called only after all data tasks have been processed
  // TODO: This is an unusual approach; should refactor
  return () => {
    return datasetReports
  }
}
