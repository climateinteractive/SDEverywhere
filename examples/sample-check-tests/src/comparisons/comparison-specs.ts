// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type {
  Bundle,
  ComparisonScenarioInputPosition,
  ComparisonScenarioSpec,
  ComparisonSpecs,
  InputId
} from '@sdeverywhere/check-core'

/**
 * Create a programmatically-defined set of comparison specs.  This demonstrates how you can
 * use a mix of programmatic and YAML/JSON specs.  We use programmatic specs here to define
 * basic scenarios for each of the input variables (each input at its minimum and maximum),
 * and then we define custom views on these scenarios in the `compare.yaml` file.
 */
export function createBaseComparisonSpecs(bundleL: Bundle, bundleR: Bundle): ComparisonSpecs {
  // Get the union of all input IDs appearing in left and/or right
  const allInputIds: Set<InputId> = new Set()
  const addInputs = (bundle: Bundle) => {
    for (const inputVar of bundle.modelSpec.inputVars.values()) {
      allInputIds.add(inputVar.inputId)
    }
  }
  addInputs(bundleL)
  addInputs(bundleR)

  // Create "input at min/max" scenarios for all inputs (that appear in either "left" or "right")
  const scenarios: ComparisonScenarioSpec[] = []
  const addScenario = (inputId: InputId, position: ComparisonScenarioInputPosition) => {
    scenarios.push({
      kind: 'scenario-with-inputs',
      id: `${inputId}_at_${position}`,
      title: `Slider ${inputId}`,
      subtitle: `at ${position}`,
      inputs: [
        {
          kind: 'input-at-position',
          inputName: `id ${inputId}`,
          position
        }
      ]
    })
  }
  for (const inputId of allInputIds) {
    addScenario(inputId, 'min')
    addScenario(inputId, 'max')
  }

  return {
    scenarios,
    scenarioGroups: [],
    viewGroups: []
  }
}
