// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { DatasetKey, ImplVar, OutputVar, RelatedItem, VarId } from '@sdeverywhere/check-core'

export interface Outputs {
  outputVars: Map<DatasetKey, OutputVar>
  implVars: Map<DatasetKey, ImplVar>
  datasetGroups: Map<string, DatasetKey[]>
}

/**
 * Gather the list of output variables (and their related graphs, etc) used
 * in this version of the model.
 */
export function getOutputs(modelVersion: number): Outputs {
  const outputVars: Map<DatasetKey, OutputVar> = new Map()

  // TODO: Typically you would return the actual list of model outputs (for
  // example, the list used to configure an SDEverywhere-generated model),
  // but for now we will use a hardcoded list of outputs
  const addOutput = (varId: VarId, varName: string, sourceName?: string) => {
    const relatedItems: RelatedItem[] = []
    if (varId === '_output_x' || varId === '_output_z' || varId === `_output_w_v${modelVersion}`) {
      for (let i = 1; i <= 8; i++) {
        relatedItems.push({
          id: `${i}`,
          locationPath: ['Graphs', `Sample Graph ${i}`]
        })
      }
    }

    const sourceKey = sourceName || 'Model'
    const datasetKey = `${sourceKey}_${varId}`
    outputVars.set(datasetKey, {
      datasetKey,
      sourceName,
      varId,
      varName,
      relatedItems
    })
  }

  // Define outputs that are in both versions of the model
  addOutput('_output_x', 'Output X')
  addOutput('_output_y', 'Output Y')
  addOutput('_output_z', 'Output Z')
  addOutput('_historical_x', 'Historical X')
  addOutput('_historical_x_confidence_lower_bound', 'Historical X confidence lower bound')
  addOutput('_historical_x_confidence_upper_bound', 'Historical X confidence upper bound')

  // Define an output that is only in the "v1" model (to simulate a
  // variable that is treated as "removed" in the new model)
  if (modelVersion === 1) {
    addOutput('_output_only_in_v1', 'Output only in v1')
  }

  // Define an output that is only in the "v2" model (to simulate a
  // variable that is treated as "added" in the new model)
  if (modelVersion !== 1) {
    addOutput('_output_only_in_v2', 'Output only in v2')
  }

  // Define an output that is called "Output W v1" in the "v1" model
  // but is called "Output W v2" in the "v2" model (to simulate a variable
  // that is treated as "renamed" in the new model)
  addOutput(`_output_w_v${modelVersion}`, `Output W v${modelVersion}`)

  // Define a couple variables from static data files (that are external
  // to the model); these are handled differently than normal model outputs
  // since data variables are not affected by different input scenarios
  addOutput('_static_s', 'Static S', 'StaticData')
  addOutput('_static_t', 'Static T', 'StaticData')

  // TODO: For an SDEverywhere-generated model, you could use the JSON file
  // produced by `sde generate --list` to create an `ImplVar` for each
  // internal variable used in the model.  For the purposes of this sample
  // bundle, we will synthesize `ImplVar` instances for the model outputs.
  const implVarArray = [...outputVars.values()]
    .filter(outputVar => outputVar.sourceName === undefined)
    .map((outputVar, index) => {
      const implVar: ImplVar = {
        varId: outputVar.varId,
        varName: outputVar.varName,
        varIndex: index,
        dimensions: [],
        varType: 'aux'
      }
      return implVar
    })
  const implVars: Map<DatasetKey, ImplVar> = new Map()
  implVarArray.forEach(implVar => {
    implVars.set(`ModelImpl${implVar.varId}`, implVar)
  })

  // Configure dataset groups
  const keyForVarWithName = (name: string) => {
    return [...outputVars.entries()].find(e => e[1].varName === name)[0]
  }
  const keysForVarsWithSource = (sourceName?: string) => {
    return [...outputVars.entries()].filter(e => e[1].sourceName === sourceName).map(([k]) => k)
  }
  const datasetGroups: Map<string, DatasetKey[]> = new Map([
    ['All Outputs', keysForVarsWithSource(undefined)],
    ['Basic Outputs', [keyForVarWithName('Output X'), keyForVarWithName('Output Y'), keyForVarWithName('Output Z')]],
    ['Static', keysForVarsWithSource('StaticData')]
  ])

  return {
    outputVars,
    implVars,
    datasetGroups
  }
}
