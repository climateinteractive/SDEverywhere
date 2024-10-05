// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { BundleGraphId, ModelSpec } from '../../bundle/bundle-types'
import type { OutputVar } from '../../bundle/var-types'
import type { DatasetKey } from '../../_shared/types'
import type { ComparisonDataset, ComparisonScenario } from '../_shared/comparison-resolved-types'
import type { ComparisonDatasetOptions } from './comparison-config'

/**
 * Provides access to the set of dataset definitions (`ComparisonDataset` instances) that are used
 * when comparing the two models.
 */
export interface ComparisonDatasets {
  /**
   * Return all `ComparisonDataset` instances that are available for comparisons.
   */
  getAllDatasets(): IterableIterator<ComparisonDataset>

  /**
   * Return the dataset metadata for the given key.
   *
   * @param datasetKey The key for the dataset.
   */
  getDataset(datasetKey: DatasetKey): ComparisonDataset | undefined

  /**
   * Return the keys for the datasets that should be compared for the given scenario.
   *
   * @param scenario The scenario definition.
   */
  getDatasetKeysForScenario(scenario: ComparisonScenario): DatasetKey[]

  /**
   * Return the context graph IDs that should be shown for the given dataset and scenario.
   *
   * @param datasetKey The key for the dataset.
   * @param scenario The scenario for which the dataset will be displayed.
   */
  getContextGraphIdsForDataset(datasetKey: DatasetKey, scenario: ComparisonScenario): BundleGraphId[]
}

/**
 * Create an instance of the `ComparisonDatasets` interface that sources the output
 * variables from the given models.
 *
 * @param modelSpecL The model spec for the "left" bundle being compared.
 * @param modelSpecR The model spec for the "right" bundle being compared.
 * @param datasetOptions The custom configuration for the datasets to be compared.
 */
export function getComparisonDatasets(
  modelSpecL: ModelSpec,
  modelSpecR: ModelSpec,
  datasetOptions?: ComparisonDatasetOptions
): ComparisonDatasets {
  return new ComparisonDatasetsImpl(modelSpecL, modelSpecR, datasetOptions)
}

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
class ComparisonDatasetsImpl implements ComparisonDatasets {
  private readonly allDatasets: Map<DatasetKey, ComparisonDataset>
  private readonly allOutputVarKeys: DatasetKey[]
  private readonly modelOutputVarKeys: DatasetKey[]

  /**
   * @param modelSpecL The model spec for the "left" bundle being compared.
   * @param modelSpecR The model spec for the "right" bundle being compared.
   * @param datasetOptions The custom configuration for the datasets to be compared.
   */
  constructor(
    private readonly modelSpecL: ModelSpec,
    private readonly modelSpecR: ModelSpec,
    private readonly datasetOptions?: ComparisonDatasetOptions
  ) {
    // Invert the map of renamed keys so that new names are on the left (map
    // keys) old names are on the right (map values)
    const renamedDatasetKeys = datasetOptions?.renamedDatasetKeys
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
    addOutputVars(modelSpecL.outputVars, false)
    addOutputVars(modelSpecR.outputVars, true)
    this.allOutputVarKeys = Array.from(allOutputVarKeysSet)
    this.modelOutputVarKeys = Array.from(modelOutputVarKeysSet)

    // Create `ComparisonDataset` instances for all available keys
    this.allDatasets = new Map()
    for (const datasetKeyL of this.allOutputVarKeys) {
      const datasetKeyR = renamedDatasetKeys?.get(datasetKeyL) || datasetKeyL
      const outputVarL = modelSpecL.outputVars.get(datasetKeyL)
      const outputVarR = modelSpecR.outputVars.get(datasetKeyR)
      this.allDatasets.set(datasetKeyL, {
        kind: 'dataset',
        key: datasetKeyL,
        outputVarL,
        outputVarR
      })
    }
  }

  // from ComparisonDatasets interface
  getAllDatasets(): IterableIterator<ComparisonDataset> {
    return this.allDatasets.values()
  }

  // from ComparisonDatasets interface
  getDataset(datasetKey: string): ComparisonDataset | undefined {
    return this.allDatasets.get(datasetKey)
  }

  // from ComparisonDatasets interface
  getDatasetKeysForScenario(scenario: ComparisonScenario): DatasetKey[] {
    if (this.datasetOptions?.datasetKeysForScenario !== undefined) {
      // Delegate to the custom filter function
      return this.datasetOptions.datasetKeysForScenario(this.allOutputVarKeys, scenario)
    } else {
      // Use the default filtering
      if (scenario.settings.kind === 'all-inputs-settings' && scenario.settings.position === 'at-default') {
        // Include both model and static variables for the "all at default" scenario
        return this.allOutputVarKeys
      } else {
        // For all other scenarios, only include model variables (since only model
        // outputs are affected by different input scenarios)
        return this.modelOutputVarKeys
      }
    }
  }

  // from ComparisonDatasets interface
  getContextGraphIdsForDataset(datasetKey: DatasetKey, scenario: ComparisonScenario): BundleGraphId[] {
    const dataset = this.getDataset(datasetKey)
    if (dataset === undefined) {
      return []
    }
    if (this.datasetOptions?.contextGraphIdsForDataset !== undefined) {
      // Delegate to the custom filter function
      return this.datasetOptions.contextGraphIdsForDataset(dataset, scenario)
    } else {
      // Use the default filtering, which uses the graph specs advertised by the bundles
      // to determine which context graphs are associated with the given dataset
      return getContextGraphIdsForDataset(this.modelSpecL, this.modelSpecR, dataset)
    }
  }
}

function getContextGraphIdsForDataset(
  modelSpecL: ModelSpec,
  modelSpecR: ModelSpec,
  dataset: ComparisonDataset
): BundleGraphId[] {
  // Get the union of all graph IDs (appearing in either left or right) in which this
  // dataset appears
  const contextGraphIds: Set<BundleGraphId> = new Set()
  function addGraphs(modelSpec: ModelSpec, outputVar: OutputVar | undefined): void {
    for (const graphSpec of modelSpec.graphSpecs || []) {
      for (const graphDatasetSpec of graphSpec.datasets) {
        if (graphDatasetSpec.datasetKey === outputVar?.datasetKey) {
          contextGraphIds.add(graphSpec.id)
          break
        }
      }
    }
  }
  addGraphs(modelSpecL, dataset.outputVarL)
  addGraphs(modelSpecR, dataset.outputVarR)
  return [...contextGraphIds]
}
