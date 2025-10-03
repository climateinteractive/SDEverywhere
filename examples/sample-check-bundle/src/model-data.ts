// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  Dataset,
  DatasetKey,
  DatasetsResult,
  ModelSpec,
  ScenarioSpec,
  ScenarioSpecUid
} from '@sdeverywhere/check-core'

// The deltas that are included for a certain output variable to
// simulate differences between two versions of the model.
const deltas: Map<ScenarioSpecUid, number> = new Map()

export function getDatasetsForScenario(
  modelVersion: number,
  modelSpec: ModelSpec,
  scenarioSpec: ScenarioSpec,
  datasetKeys: DatasetKey[]
): DatasetsResult {
  const datasetMap: Map<DatasetKey, Dataset> = new Map()

  // TODO: With a real JS model, you would configure the model inputs based on
  // the scenario that is passed in.  For this sample bundle, we tweak the fake
  // output values below based on which scenario is passed in.

  // TODO: With a real JS model, you would run the model here.  For this sample
  // bundle, we simulate a non-zero elapsed time.
  const modelRunTime = 30 - 5 * modelVersion + Math.random() * 2

  // Extract the data for each requested output variable and put it into a map
  for (const datasetKey of datasetKeys) {
    if (datasetKey.startsWith('ModelImpl')) {
      const dataset: Dataset = new Map()
      if (modelVersion === 2 && datasetKey === 'ModelImpl__output_y') {
        // XXX: Set a different value at one data point for one model to show
        // what happens when there is a difference at one time step
        for (let t = 2000; t <= 2100; t++) {
          dataset.set(t, t >= 2025 ? 6 : 5)
        }
      } else {
        // XXX: For now, fill with fake data at each time value
        for (let t = 2000; t <= 2100; t++) {
          dataset.set(t, 5)
        }
      }
      datasetMap.set(datasetKey, dataset)
      continue
    }

    // Get the output variable for the given dataset key; if the variable doesn't
    // exist in this version of the model/bundle, just skip it
    const outputVar = modelSpec.outputVars.get(datasetKey)
    if (!outputVar) {
      continue
    }

    // TODO: With a real model, you would get the actual data for the
    // requested variable here (from the set of model outputs).  For this
    // sample bundle, we generate a few data points.  For a couple variables,
    // we generate different values depending on the model version to
    // demonstrate how differences are shown in the report.
    const isDefaultScenario = scenarioSpec.kind === 'all-inputs' && scenarioSpec.position === 'at-default'
    const hasInputA =
      scenarioSpec.kind === 'input-settings' && scenarioSpec.settings.find(s => s.inputVarId.includes('input_a'))

    let delta: number
    if ((datasetKey === 'Model__output_x' && hasInputA) || (datasetKey === 'Model__output_z' && isDefaultScenario)) {
      delta = deltas.get(scenarioSpec.uid)
      if (delta === undefined) {
        delta = Math.random() * modelVersion
        deltas.set(scenarioSpec.uid, delta)
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
    dataset.set(2000, 5 + delta)
    dataset.set(2020, 6 + delta)
    dataset.set(2040, 8 + delta)
    dataset.set(2060, 12 + delta)
    dataset.set(2080, 16 + delta)
    dataset.set(2100, 22 + delta)
    datasetMap.set(datasetKey, dataset)
  }

  return {
    datasetMap,
    modelRunTime
  }
}
