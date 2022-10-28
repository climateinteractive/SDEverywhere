// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Scenario } from '../_shared/scenario'
import type { DatasetKey } from '../_shared/types'
import type { Bundle } from '../bundle/bundle-types'
import type { OutputVar } from '../bundle/var-types'
import type { CompareDatasets } from '../compare/compare-config'
import type { DatasetInfo } from '../compare/compare-info'

/**
 * Manages a set of dataset keys (corresponding to the available model outputs
 * in the given bundles) that can be used to compare two versions of the model.
 *
 * This class computes the union of the available dataset keys and handles
 * renames so that if any variables were renamed in the "right" bundle, the
 * old key will be used so that the variable can still be compared.
 *
 * This is intended to be a simple, general purpose way to create a set of
 * dataset keys, but every model is different, so you can replace this with
 * a different set of dataset keys that is better suited for the model you
 * are testing.
 */
export class DatasetManager implements CompareDatasets {
  public readonly allOutputVarKeys: DatasetKey[]
  public readonly modelOutputVarKeys: DatasetKey[]

  /**
   * @param bundleL The "left" bundle being compared.
   * @param bundleR The "right" bundle being compared.
   * @param renamedDatasetKeys The mapping of renamed dataset keys.
   */
  constructor(
    private readonly bundleL: Bundle,
    private readonly bundleR: Bundle,
    public readonly renamedDatasetKeys?: Map<DatasetKey, DatasetKey>
  ) {
    // Invert the map of renamed keys so that new names are on the left (map
    // keys) old names are on the right (map values)
    const invertedRenamedKeys: Map<DatasetKey, DatasetKey> = new Map()
    renamedDatasetKeys?.forEach((newKey, oldKey) => {
      invertedRenamedKeys.set(newKey, oldKey)
    })

    function leftKeyForRightKey(rightKey: DatasetKey): DatasetKey {
      return invertedRenamedKeys.get(rightKey) || rightKey
    }

    // Get the union of all output variables appearing in left and/or right
    const allOutputVarKeysSet: Set<DatasetKey> = new Set()
    const modelOutputVarKeysSet: Set<DatasetKey> = new Set()
    function addOutputVars(outputVars: Map<DatasetKey, OutputVar>, handleRenames: boolean): void {
      outputVars.forEach((outputVar, key) => {
        // When there are renamed output variables, only include the old dataset
        // key in the set of all keys
        const remappedKey = handleRenames ? leftKeyForRightKey(key) : key
        allOutputVarKeysSet.add(remappedKey)
        if (outputVar.sourceName === undefined) {
          modelOutputVarKeysSet.add(remappedKey)
        }
      })
    }
    addOutputVars(bundleL.modelSpec.outputVars, false)
    addOutputVars(bundleR.modelSpec.outputVars, true)
    this.allOutputVarKeys = Array.from(allOutputVarKeysSet)
    this.modelOutputVarKeys = Array.from(modelOutputVarKeysSet)
  }

  // from CompareDatasets interface
  getDatasetKeysForScenario(scenario: Scenario): DatasetKey[] {
    if (scenario.kind === 'all-inputs' && scenario.position === 'at-default') {
      // Include both model and static variables for the "all at default" scenario
      return this.allOutputVarKeys
    } else {
      // For all other scenarios, only include model variables (since only model
      // outputs are affected by different input scenarios)
      return this.modelOutputVarKeys
    }
  }

  // from CompareDatasets interface
  getDatasetInfo(datasetKey: DatasetKey): DatasetInfo | undefined {
    const modelSpecL = this.bundleL.modelSpec
    const modelSpecR = this.bundleR.modelSpec

    // Get the dataset keys accounting for renames
    const datasetKeyL = datasetKey
    const datasetKeyR = this.renamedDatasetKeys?.get(datasetKeyL) || datasetKeyL

    // Get the output variable name
    const outputVarL = modelSpecL.outputVars.get(datasetKeyL)
    const outputVarR = modelSpecR.outputVars.get(datasetKeyR)
    let varName: string
    let newVarName: string
    let sourceName: string
    let newSourceName: string
    if (outputVarL && outputVarR && outputVarL.varName != outputVarR.varName) {
      varName = outputVarL.varName
      newVarName = outputVarR.varName
    } else {
      const outputVar = outputVarR || outputVarL
      varName = outputVar?.varName || 'Unknown'
    }
    if (outputVarL && outputVarR && outputVarL.sourceName != outputVarR.sourceName) {
      sourceName = outputVarL.sourceName
      newSourceName = outputVarR.sourceName
    } else {
      const outputVar = outputVarR || outputVarL
      sourceName = outputVar?.sourceName
    }

    return {
      varName,
      newVarName,
      sourceName,
      newSourceName,
      relatedItems: outputVarR?.relatedItems || []
    }
  }
}
