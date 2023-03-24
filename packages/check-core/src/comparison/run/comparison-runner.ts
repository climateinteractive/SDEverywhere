// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DataPlanner } from '../../data/data-planner'
import type { ComparisonConfig } from '../config/comparison-config'
import { diffDatasets } from '../diff-datasets/diff-datasets'
import type { ComparisonTestReport } from '../report/comparison-report-types'

/**
 * Prepare all comparison tests and add them to the given data planner.
 *
 * @param comparisonConfig The comparison configuration.
 * @param dataPlanner The planner that will plan out data fetches for the compare tests.
 * @return A function that will build the compare reports after the data requests are all processed.
 */
export function runComparisons(
  comparisonConfig: ComparisonConfig,
  dataPlanner: DataPlanner
): () => ComparisonTestReport[] {
  // TODO: The following leads to an explosion of scenario/dataset combinations;
  // if memory usage becomes a concern, we can change this to add a wildcard
  // placeholder in the data request and then expand the dataset keys at the
  // time that the request is processed instead of adding them all in advance
  const testReports: ComparisonTestReport[] = []
  for (const scenario of comparisonConfig.scenarios.getAllScenarios()) {
    // Get the keys of the datasets of interest for this scenario
    const datasetKeys = comparisonConfig.datasets.getDatasetKeysForScenario(scenario)

    // For each dataset key, add a request so that the datasets are fetched
    // from the data sources (i.e., run the models with the given scenario
    // and compare the datasets)
    for (const datasetKey of datasetKeys) {
      dataPlanner.addRequest(scenario.specL, scenario.specR, datasetKey, datasets => {
        // Diff the two datasets
        const diffReport = diffDatasets(datasets.datasetL, datasets.datasetR)
        testReports.push({
          scenarioKey: scenario.key,
          datasetKey,
          diffReport
        })
      })
    }
  }

  // Return a function that will build the report with the test results; this
  // should be called only after all data tasks have been processed
  // TODO: This is an unusual approach; should refactor
  return () => {
    return testReports
  }
}
