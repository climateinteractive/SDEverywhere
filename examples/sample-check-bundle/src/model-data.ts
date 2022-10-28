// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Dataset, DatasetKey, DatasetsResult, ModelSpec, Scenario, ScenarioKey } from '@sdeverywhere/check-core'

// The deltas that are included for a certain output variable to
// simulate differences between two versions of the model.
const deltas: Map<ScenarioKey, number> = new Map()

export function getDatasetsForScenario(
  modelVersion: number,
  modelSpec: ModelSpec,
  scenario: Scenario,
  datasetKeys: DatasetKey[]
): DatasetsResult {
  const datasetMap: Map<DatasetKey, Dataset> = new Map()

  // TODO: Set the model inputs according to the given scenario

  // TODO: Run the JS model
  const modelRunTime = 30 - 5 * modelVersion + Math.random() * 2

  // Extract the data for each requested output variable and put it into a map
  for (const datasetKey of datasetKeys) {
    // Get the output variable for the given dataset key; if the variable doesn't
    // exist in this version of the model/bundle, just skip it
    const outputVar = modelSpec.outputVars.get(datasetKey)
    if (!outputVar) {
      continue
    }

    // TODO: With a real model, you would get the actual data for the
    // requested variable here (from the set of model outputs).  For this
    // sample bundle, we generate a few data points.  For one variable,
    // we generate different values depending on the model version to
    // demonstrate how differences are shown in the report.
    let delta: number
    const hasInputA = scenario.key.includes('input_a') || scenario.key.includes('input_group')
    if (
      (datasetKey === 'Model__output_x' && hasInputA) ||
      (datasetKey === 'Model__output_z' && scenario.key === 'all_inputs_at_default')
    ) {
      delta = deltas.get(scenario.key)
      if (delta === undefined) {
        delta = Math.random() * modelVersion
        deltas.set(scenario.key, delta)
      }
    } else if (datasetKey === 'Model__historical_x') {
      delta = -0.5
    } else if (datasetKey === 'Model__historical_x_confidence_lower_bound') {
      delta = -2
    } else if (datasetKey === 'Model__historical_x_confidence_upper_bound') {
      delta = 2
    } else {
      // TODO: Uncomment to make extra large values for some scenarios to
      // trigger check failures
      // if (scenario.key.startsWith('all_inputs_at_m')) {
      //   delta = 100
      // } else {
      //   delta = 0
      // }
      delta = 0
    }
    const dataset: Dataset = new Map()
    dataset.set(1850, 5 + delta)
    dataset.set(1900, 6 + delta)
    dataset.set(1950, 8 + delta)
    dataset.set(2000, 12 + delta)
    dataset.set(2050, 16 + delta)
    dataset.set(2100, 22 + delta)
    datasetMap.set(datasetKey, dataset)
  }

  return {
    datasetMap,
    modelRunTime
  }
}
