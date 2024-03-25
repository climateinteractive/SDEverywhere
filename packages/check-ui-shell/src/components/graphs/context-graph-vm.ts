// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type {
  BundleGraphData,
  BundleGraphSpec,
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonScenario,
  LinkItem,
  ScenarioSpec
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
    comparisonConfig: ComparisonConfig,
    private readonly dataCoordinator: ComparisonDataCoordinator,
    public readonly bundle: 'left' | 'right',
    public readonly scenario: ComparisonScenario,
    public readonly graphSpec: BundleGraphSpec | undefined
  ) {
    const b = bundle === 'right' ? comparisonConfig.bundleR : comparisonConfig.bundleL
    this.bundleName = b.name
    this.datasetClass = `dataset-color-${bundle === 'right' ? '1' : '0'}`
    if (graphSpec) {
      const scenarioSpec = bundle === 'right' ? scenario.specR : scenario.specL
      if (scenarioSpec !== undefined) {
        this.linkItems = b.model.getGraphLinksForScenario(scenarioSpec, graphSpec.id)
        this.requestKey = `context-graph::${requestId++}::${bundle}::${graphSpec.id}::${scenario.key}`
      } else {
        this.linkItems = []
      }
      this.writableContent = writable(undefined)
      this.content = this.writableContent
    }
  }

  requestData(): void {
    if (this.requestKey === undefined) {
      // The request key is undefined when the scenario is invalid or unavailable for the
      // requested side; in this case, we can set the flags and return early
      this.dataRequested = true
      this.dataLoaded = true
      return
    }

    if (this.dataRequested) {
      return
    }
    this.dataRequested = true

    // TODO: We currently only fetch data for one side at a time; for the common case where we show
    // context graphs side-by-side, it would be better to load the data for both sides in parallel
    const specL: ScenarioSpec = this.bundle === 'left' ? this.scenario.specL : undefined
    const specR: ScenarioSpec = this.bundle === 'right' ? this.scenario.specR : undefined
    this.dataCoordinator.requestGraphData(
      this.requestKey,
      specL,
      specR,
      this.graphSpec.id,
      (graphDataL, graphDataR) => {
        if (!this.dataRequested) {
          return
        }

        const graphData = specR ? graphDataR : graphDataL
        this.writableContent.set({
          graphData
        })
        this.dataLoaded = true
      }
    )
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
