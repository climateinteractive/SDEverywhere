// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { InputVar, VarId } from '@sdeverywhere/check-core'

/**
 * Gather the list of input variables used in this version of the model.
 */
export function getInputVars(): Map<VarId, InputVar> {
  const inputVars: Map<VarId, InputVar> = new Map()

  // TODO: Typically you would return the actual list of model inputs (for
  // example, the list used to configure an SDEverywhere-generated model),
  // but for now we will use a hardcoded list of inputs
  const addSlider = (varId: VarId, varName: string) => {
    inputVars.set(varId, {
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
  }
  addSlider('_input_a', 'Input A')
  addSlider('_input_b', 'Input B')
  // XXX
  addSlider('_carbon_tax_initial_target', 'Carbon tax initial target')
  addSlider('_global_population_in_2100', 'Global population in 2100')

  return inputVars
}
