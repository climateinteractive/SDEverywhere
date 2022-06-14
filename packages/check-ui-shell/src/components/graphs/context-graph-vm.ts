// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type {
  BundleGraphData,
  BundleGraphSpec,
  CompareConfig,
  CompareDataCoordinator,
  LinkItem,
  Scenario
} from '@sdeverywhere/check-core'

let requestId = 1

export interface ContextGraphContent {
  graphData: BundleGraphData
}

export class ContextGraphViewModel {
  public readonly bundleName: string
  public readonly datasetClass: string
  public readonly linkItems: LinkItem[]
  public readonly requestKey: string
  private readonly writableContent: Writable<ContextGraphContent>
  public readonly content: Readable<ContextGraphContent>
  private dataRequested = false
  private dataLoaded = false

  constructor(
    compareConfig: CompareConfig,
    private readonly dataCoordinator: CompareDataCoordinator,
    public readonly bundle: 'left' | 'right',
    public readonly scenario: Scenario,
    public readonly graphSpec: BundleGraphSpec | undefined
  ) {
    const b = bundle === 'right' ? compareConfig.bundleR : compareConfig.bundleL
    this.bundleName = b.name
    this.datasetClass = `dataset-color-${bundle === 'right' ? '1' : '0'}`
    if (graphSpec) {
      this.linkItems = b.model.getGraphLinksForScenario(scenario, graphSpec.id)
      this.requestKey = `context-graph::${requestId++}::${bundle}::${graphSpec.id}::${scenario.key}`
      this.writableContent = writable(undefined)
      this.content = this.writableContent
    }
  }

  requestData(): void {
    if (this.dataRequested) {
      return
    }
    this.dataRequested = true

    this.dataCoordinator.requestGraphData(this.requestKey, this.bundle, this.scenario, this.graphSpec.id, graphData => {
      if (!this.dataRequested) {
        return
      }

      this.writableContent.set({
        graphData
      })
      this.dataLoaded = true
    })
  }

  clearData(): void {
    if (this.dataRequested) {
      this.writableContent.set(undefined)
      if (!this.dataLoaded) {
        this.dataCoordinator.cancelRequest(this.requestKey)
      }
      this.dataRequested = false
      this.dataLoaded = false
    }
  }
}
