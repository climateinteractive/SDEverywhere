import type { Readable } from 'svelte/store'
import { derived } from 'svelte/store'

import type { GraphId } from '@core'

import { type SyncWritable, syncWritable } from '../../model/stores'
import type { SelectorViewModel } from '../selector/selector-vm'
import type { GraphViewModel } from './graph-vm'

export class SelectableGraphViewModel {
  public readonly selectorViewModel: SelectorViewModel
  public readonly selectedGraphId: SyncWritable<GraphId>
  public readonly selectedGraphViewModel: Readable<GraphViewModel>

  constructor(
    public readonly graphViewModels: GraphViewModel[],
    initialGraphId: GraphId
  ) {
    const graphOptions = graphViewModels.map(graph => ({
      value: graph.spec.id,
      stringKey: graph.spec.titleKey
    }))
    this.selectedGraphId = syncWritable(initialGraphId)
    this.selectorViewModel = {
      options: graphOptions,
      selectedValue: this.selectedGraphId
    }

    this.selectedGraphViewModel = derived(this.selectedGraphId, $selectedGraphId => {
      return this.graphViewModels.find(graph => graph.spec.id === $selectedGraphId)
    })
  }
}
