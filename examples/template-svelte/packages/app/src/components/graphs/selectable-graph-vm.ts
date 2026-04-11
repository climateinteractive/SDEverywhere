import type { Readable } from 'svelte/store'
import { derived } from 'svelte/store'

import type { GraphId } from '@core'

import { type SyncWritable, syncWritable } from '@shared/stores'

import type { SelectorViewModel } from '@components/selector/selector-vm'

import type { GraphViewModel } from './graph-vm'

export class SelectableGraphViewModel {
  public readonly selectorViewModel: SelectorViewModel
  public readonly selectedGraphId: SyncWritable<GraphId>
  public readonly selectedGraphViewModel: Readable<GraphViewModel>

  constructor(
    public readonly graphViewModels: GraphViewModel[],
    graphIndex: number,
    initialGraphId: GraphId
  ) {
    // Restore the previously selected graph when HMR is enabled
    if (import.meta.hot) {
      const savedGraphId = import.meta.hot.data[`savedGraphId_${graphIndex}`]
      if (savedGraphId) {
        initialGraphId = savedGraphId
      }
    }

    const graphOptions = graphViewModels.map(graph => ({
      value: graph.spec.id,
      stringKey: graph.spec.titleKey
    }))

    this.selectedGraphId = syncWritable(initialGraphId)
    this.selectorViewModel = {
      options: graphOptions,
      selectedValue: this.selectedGraphId,
      onUserChange: graphId => {
        // Preserve the selected graph when HMR is enabled
        if (import.meta.hot) {
          import.meta.hot.data[`savedGraphId_${graphIndex}`] = graphId
        }
      }
    }

    this.selectedGraphViewModel = derived(this.selectedGraphId, $selectedGraphId => {
      return this.graphViewModels.find(graph => graph.spec.id === $selectedGraphId)
    })
  }
}
