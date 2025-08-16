// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type {
  Bundle,
  ComparisonScenarioInputPosition,
  ComparisonScenarioSpec,
  ComparisonSpecs,
  InputId,
  InputSettingGroupId
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
  function addInputs(bundle: Bundle): void {
    for (const inputVar of bundle.modelSpec.inputVars.values()) {
      allInputIds.add(inputVar.inputId)
    }
  }
  addInputs(bundleL)
  addInputs(bundleR)

  // Create an "all inputs at default" (baseline) scenario
  const scenarios: ComparisonScenarioSpec[] = []
  scenarios.push({
    kind: 'scenario-with-all-inputs',
    id: 'baseline',
    title: 'All inputs',
    subtitle: 'at default',
    position: 'default'
  })

  // Create "input at min/max" scenarios for all inputs (that appear in either "left" or "right")
  function addScenarioForInputAtExtreme(inputId: InputId, position: ComparisonScenarioInputPosition): void {
    scenarios.push({
      kind: 'scenario-with-inputs',
      id: `input_${inputId}_at_${position}`,
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
    addScenarioForInputAtExtreme(inputId, 'min')
    addScenarioForInputAtExtreme(inputId, 'max')
  }

  // Create a special scenario that controls a different set of inputs in the "left" model
  // than in the "right" model
  scenarios.push({
    kind: 'scenario-with-distinct-inputs',
    id: 'extreme_main_sliders_at_best_case',
    title: 'Main sliders',
    subtitle: 'at best case',
    inputsL: [{ kind: 'input-at-value', inputName: 'Input A', value: 75 }],
    inputsR: [{ kind: 'input-at-value', inputName: 'Input B prime', value: 25 }]
  })

  // Create scenarios that set the inputs for each model based on the settings
  // defined by that model
  function addScenarioForSettingGroup(settingGroupId: InputSettingGroupId): void {
    scenarios.push({
      kind: 'scenario-with-setting-group',
      id: `scenario_from_setting_group_${settingGroupId}`,
      title: 'Custom scenario',
      subtitle: settingGroupId.replace(/_/g, ' '),
      settingGroupId
    })
  }
  addScenarioForSettingGroup('setting_group_1')
  addScenarioForSettingGroup('setting_group_2')

  return {
    scenarios
  }
}
