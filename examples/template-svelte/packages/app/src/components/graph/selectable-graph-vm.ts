import type { Readable, Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'

import type { GraphId } from '@core'

import type { GraphViewModel } from './graph-vm'

export class SelectableGraphViewModel {
  public readonly graphOptions: Array<{ value: GraphId; stringKey: string }>
  public readonly selectedGraphId: Writable<GraphId>
  public readonly selectedGraphViewModel: Readable<GraphViewModel>

  constructor(
    public readonly graphViewModels: GraphViewModel[],
    initialGraphId: GraphId
  ) {
    this.graphOptions = this.graphViewModels.map(graph => ({
      value: graph.spec.id,
      stringKey: graph.spec.titleKey
    }))

    this.selectedGraphId = writable(initialGraphId)
    this.selectedGraphViewModel = derived(this.selectedGraphId, $selectedGraphId => {
      return this.graphViewModels.find(graph => graph.spec.id === $selectedGraphId)
    })
  }
}
