// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  InputAliasName,
  InputGroupName,
  InputScenarioName,
  InputId,
  InputSetting,
  InputVar,
  VarId
} from '@sdeverywhere/check-core'

export interface Inputs {
  inputVars: Map<VarId, InputVar>
  inputGroups: Map<InputGroupName, InputVar[]>
  inputAliases: Map<InputAliasName, VarId>
  inputScenarios: Map<InputScenarioName, InputSetting[]>
}

/**
 * Gather the list of input variables used in this version of the model.
 */
export function getInputs(modelVersion: number): Inputs {
  const inputVars: Map<VarId, InputVar> = new Map()
  const inputAliases: Map<InputAliasName, VarId> = new Map()

  // TODO: Typically you would return the actual list of model inputs (for
  // example, the list used to configure an SDEverywhere-generated model),
  // but for now we will use a hardcoded list of inputs
  const addSlider = (inputId: InputId, varName: string) => {
    const varId = `_${varName.toLowerCase().replace(/\s/g, '_')}`

    inputVars.set(varId, {
      inputId,
      varId,
      varName,
      defaultValue: 50,
      minValue: 0,
      maxValue: 100,
      relatedItem: {
        id: varId,
        locationPath: ['Assumptions', varName]
      }
    })

    const sliderName = `Main Sliders > Slider ${inputId}`
    inputAliases.set(sliderName, varId)
  }

  // Slider id=1 is defined with input var 'Input A' in both v1 and v2
  addSlider('1', 'Input A')

  // Slider id=2 is defined with input var 'Input B' in v1, but pretend it was renamed
  // to 'Input B prime' in v2
  addSlider('2', modelVersion === 1 ? 'Input B' : 'Input B prime')

  // Slider id=3 is defined with input var 'Input C' in v1 only (pretend slider was
  // removed in v2)
  if (modelVersion === 1) {
    addSlider('3', 'Input C')
  }

  // Slider id=4 is defined with input var 'Input D' in v2 only (pretend slider was
  // added in v2)
  if (modelVersion === 2) {
    addSlider('4', 'Input D')
  }

  // Configure input groups
  const inputGroups: Map<InputGroupName, InputVar[]> = new Map([
    ['All Inputs', [...inputVars.values()]],
    // ['Input Group 1', [inputVars.get('_input_a'), inputVars.get('_input_b')]],
    ['Input Group 1', [inputVars.get('_input_a')]],
    ['Empty Input Group', []]
  ])

  // Configure custom scenarios.  This demonstrates how to configure custom scenarios
  // that can be referenced by name in check and comparison specs, but that have
  // settings that are specific to the particular model being tested.
  const scenario1Settings: InputSetting[] = []
  scenario1Settings.push({
    kind: 'value',
    inputVarId: '_input_a',
    value: 60
  })
  scenario1Settings.push({
    kind: 'value',
    inputVarId: modelVersion === 1 ? '_input_b' : '_input_b_prime',
    value: 60
  })
  if (modelVersion === 2) {
    scenario1Settings.push({
      kind: 'value',
      inputVarId: '_input_d',
      value: 60
    })
  }
  const inputScenarios: Map<InputScenarioName, InputSetting[]> = new Map([['Named scenario 1', scenario1Settings]])

  return {
    inputVars,
    inputGroups,
    inputAliases,
    inputScenarios
  }
}
