// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey } from '../../_shared/types'
import type { ComparisonScenario } from '../_shared/comparison-resolved-types'

import type { DataPlanner } from '../../data/data-planner'

import type { ComparisonConfig } from '../config/comparison-config'
import type { ComparisonScenarioTitleSpec } from '../config/comparison-spec-types'

import { diffDatasets } from '../diff-datasets/diff-datasets'
import type { DiffReport } from '../diff-datasets/diff-datasets'

import type { ComparisonTestReport } from '../report/comparison-report-types'

/**
 * Prepare all comparison tests and add them to the given data planner.
 *
 * @param comparisonConfig The comparison configuration.
 * @param dataPlanner The planner that will plan out data fetches for the compare tests.
 * @param skipScenarios The comparison scenarios to skip.
 * @return A function that will build the compare reports after the data requests are all processed.
 */
export function runComparisons(
  comparisonConfig: ComparisonConfig,
  dataPlanner: DataPlanner,
  skipScenarios: ComparisonScenarioTitleSpec[]
): () => ComparisonTestReport[] {
  function skipScenarioKey(title: string, subtitle?: string): string {
    let key = title.toLowerCase()
    if (subtitle) {
      key += ` :: ${subtitle.toLowerCase()}`
    }
    return key
  }
  const skipScenariosSet = new Set(skipScenarios.map(scenario => skipScenarioKey(scenario.title, scenario.subtitle)))

  // Pull out the baseline (all inputs at default) scenario
  const allScenarios = [...comparisonConfig.scenarios.getAllScenarios()]
  let baselineScenario: ComparisonScenario | undefined
  const baselineScenarioIndex = allScenarios.findIndex(scenario => {
    const settings = scenario.settings
    return settings.kind === 'all-inputs-settings' && settings.position === 'at-default'
  })
  if (baselineScenarioIndex !== -1) {
    baselineScenario = allScenarios.splice(baselineScenarioIndex, 1)[0]
  }

  // Build an array of test reports for all comparisons
  // TODO: The following leads to an explosion of scenario/dataset combinations;
  // if memory usage becomes a concern, we can change this to add a wildcard
  // placeholder in the data request and then expand the dataset keys at the
  // time that the request is processed instead of adding them all in advance
  const testReports: ComparisonTestReport[] = []

  // Store baseline diff reports by dataset key
  const baselineDiffReports: Map<DatasetKey, DiffReport> = new Map()

  // Helper function that runs the comparisons for a given scenario
  function runComparisonsForScenario(scenario: ComparisonScenario, isBaseline: boolean): void {
    const datasetKeys = comparisonConfig.datasets.getDatasetKeysForScenario(scenario)
    const shouldSkip = skipScenariosSet.has(skipScenarioKey(scenario.title, scenario.subtitle))
    if (shouldSkip) {
      // Add a test report for each dataset in the scenario, but with `diffReport` undefined
      // to indicate that the test was skipped
      for (const datasetKey of datasetKeys) {
        testReports.push({
          scenarioKey: scenario.key,
          datasetKey,
          diffReport: undefined
        })
      }
      return
    }

    for (const datasetKey of datasetKeys) {
      dataPlanner.addRequest(scenario.specL, scenario.specR, datasetKey, datasets => {
        const diffReport = diffDatasets(datasets.datasetL, datasets.datasetR)
        if (isBaseline) {
          // Save the diff report for this dataset in the baseline scenario
          baselineDiffReports.set(datasetKey, diffReport)
          // Add the test report, but leave `baselineDiffReport` undefined so that
          // the relative values are computed correctly
          testReports.push({
            scenarioKey: scenario.key,
            datasetKey,
            diffReport
          })
        } else {
          // Get the diff report for this dataset in the baseline scenario so that
          // we can compute the relative-to-baseline values
          const baselineDiffReport = baselineDiffReports.get(datasetKey)
          // Add the test report
          testReports.push({
            scenarioKey: scenario.key,
            datasetKey,
            diffReport,
            baselineDiffReport
          })
        }
      })
    }
  }

  // Run the comparisons for the baseline scenario first so that we can capture the
  // baseline diff reports
  runComparisonsForScenario(baselineScenario, /*isBaseline=*/ true)

  // Run the comparisons for all other scenarios
  for (const scenario of allScenarios) {
    runComparisonsForScenario(scenario, /*isBaseline=*/ false)
  }

  // Return a function that will build the report with the test results; this
  // should be called only after all data tasks have been processed
  // TODO: This is an unusual approach; should refactor
  return () => {
    return testReports
  }
}
