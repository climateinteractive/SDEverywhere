// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { OutputVar, CheckDatasetSpec } from '@sdeverywhere/check-core'

import type { ListItemViewModel } from '../../list/list-item-vm.svelte'
import type { DatasetItemConfig } from './check-editor-types'

/**
 * View model for managing dataset configurations in the check editor.
 */
export class DatasetEditorViewModel {
  /** The list of datasets. */
  public datasets = $state<DatasetItemConfig[]>([])

  /** The currently selected dataset ID. */
  public selectedDatasetId = $state<string | undefined>(undefined)

  /** List items for output variable selectors. */
  public readonly datasetListItems: ListItemViewModel[]

  private nextDatasetId = 1

  /**
   * Create a new dataset editor view model.
   *
   * @param outputVars The list of output variables available in the model.
   */
  constructor(public readonly outputVars: OutputVar[]) {
    this.datasetListItems = this.outputVars.map(outputVar => ({
      id: outputVar.datasetKey,
      label: outputVar.varName
    }))
  }

  /**
   * Clear all dataset state.
   */
  clear(): void {
    this.datasets = []
    this.selectedDatasetId = undefined
    this.nextDatasetId = 1
  }

  /**
   * Add a new dataset with default settings.
   */
  addDataset(): void {
    const defaultDatasetKey = this.outputVars.length > 0 ? this.outputVars[0].datasetKey : ''
    const newDataset: DatasetItemConfig = {
      id: `dataset-${this.nextDatasetId++}`,
      datasetKey: defaultDatasetKey
    }
    this.datasets.push(newDataset)
    // Auto-select the first dataset if none is selected
    if (!this.selectedDatasetId) {
      this.selectedDatasetId = newDataset.id
    }
  }

  /**
   * Add a dataset from a spec.
   *
   * @param spec The dataset spec to convert.
   */
  addDatasetFromSpec(spec: CheckDatasetSpec): void {
    if (spec.name) {
      const outputVar = this.outputVars.find(v => v.varName === spec.name)
      if (outputVar) {
        const newDataset: DatasetItemConfig = {
          id: `dataset-${this.nextDatasetId++}`,
          datasetKey: outputVar.datasetKey
        }
        this.datasets.push(newDataset)
      }
    }
    // Note: The editor currently supports only datasets specified by name.
    // Dataset groups (spec.group) and type matching (spec.matching) are not
    // supported in the editor and will be silently ignored. These features
    // require access to model-level information to expand into individual datasets.
  }

  /**
   * Select a dataset by ID.
   *
   * @param id The dataset ID to select.
   */
  selectDataset(id: string): void {
    this.selectedDatasetId = id
  }

  /**
   * Remove a dataset by ID.
   *
   * @param id The dataset ID to remove.
   */
  removeDataset(id: string): void {
    const index = this.datasets.findIndex(d => d.id === id)
    if (index !== -1) {
      this.datasets.splice(index, 1)
      // If we removed the selected dataset, select another one
      if (this.selectedDatasetId === id && this.datasets.length > 0) {
        // Select the previous item, or the first item if we removed the first
        const newIndex = Math.max(0, index - 1)
        this.selectedDatasetId = this.datasets[newIndex].id
      }
    }
  }

  /**
   * Update a dataset's configuration.
   *
   * @param id The dataset ID to update.
   * @param updates The updates to apply.
   */
  updateDataset(id: string, updates: Partial<DatasetItemConfig>): void {
    const index = this.datasets.findIndex(d => d.id === id)
    if (index !== -1) {
      // Replace the dataset object to trigger reactivity
      this.datasets[index] = { ...this.datasets[index], ...updates }
    }
  }

  /**
   * Find an output variable by dataset key.
   *
   * @param datasetKey The dataset key.
   * @returns The output variable, or undefined if not found.
   */
  findOutputVar(datasetKey: string): OutputVar | undefined {
    return this.outputVars.find(v => v.datasetKey === datasetKey)
  }
}
