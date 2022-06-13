// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

import type { DatasetKey, OutputVar } from '@sdeverywhere/check-core'

import { SearchListViewModel } from './search-list-vm'
import { SelListViewModel } from './sel-list-vm'

export interface WizardCardOutputsViewModel {
  availableOutputs: SearchListViewModel
  selectedOutputs: SelListViewModel
}

export function createOutputsCardViewModel(outputVars: Map<DatasetKey, OutputVar>): WizardCardOutputsViewModel {
  // Keep track of which outputs have been selected
  const selectedKeySet: Set<DatasetKey> = new Set()
  const selectedKeys: Writable<Set<DatasetKey>> = writable(selectedKeySet)

  // Create a list item for each output variable
  const outputItems = [...outputVars.entries()].map(([datasetKey, v]) => {
    return {
      id: datasetKey,
      label: v.varName
    }
  })

  // Derive a filtered array that includes only those outputs that
  // have not been selected; these are the "available" outputs that
  // appear in the searchable list on the left side
  const availableOutputItems = derived(selectedKeys, $selectedKeys => {
    return outputItems.filter(item => !$selectedKeys.has(item.id))
  })

  // Derive another filtered array that includes the outputs that
  // have been selected; these are the "selected" outputs that
  // appear in the list on the right side
  const selectedOutputItems = derived(selectedKeys, $selectedKeys => {
    // TODO: Show these in the order in which they were added (rather
    // than in the alphabetical order from the original list)?
    return outputItems.filter(item => $selectedKeys.has(item.id))
  })

  // Keep track of which selected dataset is "active" (meaning the user
  // clicked on it); this controls what dataset is shown in the preview
  // graph on the right side
  const activeSelectedDatasetKey: Writable<string> = writable(undefined)

  // Create the list view models
  const availableOutputs = new SearchListViewModel(availableOutputItems)
  const selectedOutputs = new SelListViewModel(selectedOutputItems, activeSelectedDatasetKey)

  // When an item is selected in the "available" list, mark it as selected
  // so that it gets moved to the "selected" list
  availableOutputs.onItemSelected = item => {
    selectedKeys.update(keys => keys.add(item.id))
  }

  // When an item is removed from the "selected" list, unmark it as selected
  // so that it gets moved back to the "available" list
  selectedOutputs.onItemRemoved = item => {
    selectedKeys.update(keys => {
      keys.delete(item.id)
      return keys
    })
  }

  return {
    availableOutputs,
    selectedOutputs
  }
}
