// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DataPlanner } from '../../data/data-planner'
import type { CompareConfig } from '../config/compare-config'
import { diffDatasets } from './compare-diff-datasets'
import type { CompareDatasetReport } from './compare-report'
import { scenariosFromDef } from './compare-scenario'

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
  if (simplifyScenarios) {
    console.log('simplifyScenarios not yet implemented')
  }

  // TODO: The following leads to an explosion of scenario/dataset combinations;
  // if memory usage becomes a concern, we can change this to add a wildcard
  // placeholder in the data request and then expand the dataset keys at the
  // time that the request is processed instead of adding them all in advance
  const datasetReports: CompareDatasetReport[] = []
  for (const scenarioDef of compareConfig.scenarios) {
    // Get a `Scenario` instance for each model
    const [scenarioL, scenarioR] = scenariosFromDef(scenarioDef)

    // Get the keys of the datasets of interest for this scenario
    // TODO: For now we only look at one scenario here; typically `getDatasetKeysForScenario`
    // only looks at whether the scenario is baseline or not, so this should be OK for now
    // but we should revisit
    const datasetKeys = compareConfig.datasets.getDatasetKeysForScenario(scenarioR || scenarioL)

    // Create a combined key that can be used to identify this pair of scenarios later
    // when reconstructing summaries.  If the left and right keys are different, include
    // both, separated by "::".  If they are the same, we only need to take one (without
    // the separator) to keep the size of the generated JSON summaries down.
    const scenarioKeyL = scenarioL?.key || ''
    const scenarioKeyR = scenarioR?.key || ''
    let scenarioPairKey: string
    if (scenarioKeyL === scenarioKeyR) {
      scenarioPairKey = scenarioKeyL
    } else {
      scenarioPairKey = `${scenarioKeyL}::${scenarioKeyR}`
    }

    // For each dataset key, add a request so that the datasets are fetched
    // from the data sources (i.e., run the models with the given scenario
    // and compare the datasets)
    for (const datasetKey of datasetKeys) {
      dataPlanner.addRequest(scenarioL, scenarioR, datasetKey, datasets => {
        // Diff the two datasets
        const diffReport = diffDatasets(datasets.datasetL, datasets.datasetR)
        datasetReports.push({
          scenarioKey: scenarioPairKey,
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
