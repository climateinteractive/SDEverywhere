// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type {
  ComparisonConfig,
  ComparisonDataCoordinator,
  DatasetKey,
  DatasetMap,
  DiffPoint,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import type { ComparisonGraphPlot, ComparisonGraphViewModel, Point } from '../graphs/comparison-graph-vm'
import { pointsFromDataset } from '../graphs/comparison-graph-vm'

let requestId = 1

export interface TraceTooltipContent {
  comparisonGraphViewModel: ComparisonGraphViewModel
  loading: boolean
  error?: string
}

export class TraceTooltipViewModel {
  public readonly requestKey: string
  private readonly writableContent: Writable<TraceTooltipContent>
  public readonly content: Readable<TraceTooltipContent>

  private dataRequested = false
  private dataLoaded = false

  constructor(
    public readonly comparisonConfig: ComparisonConfig,
    public readonly dataCoordinator: ComparisonDataCoordinator,
    public readonly datasetKey: DatasetKey,
    public readonly varName: string,
    public readonly datDatasets: DatasetMap | undefined,
    public readonly sourceL: 'left' | 'right' | 'dat',
    public readonly scenarioSpecL: ScenarioSpec | undefined,
    public readonly sourceR: 'left' | 'right',
    public readonly scenarioSpecR: ScenarioSpec | undefined,
    public readonly diffPoint: DiffPoint
  ) {
    this.requestKey = `trace-tooltip::${requestId++}::${datasetKey}`

    this.writableContent = writable(undefined)
    this.content = this.writableContent
  }

  requestData(): void {
    if (this.dataRequested) {
      return
    }
    this.dataRequested = true

    // Set loading state
    this.writableContent.set({
      comparisonGraphViewModel: undefined,
      loading: true,
      error: undefined
    })

    const sourceL = this.sourceL === 'dat' ? undefined : this.sourceL
    const sourceR = this.sourceR
    const datasetKeys: DatasetKey[] = [this.datasetKey]

    this.dataCoordinator.requestDatasetMaps(
      this.requestKey,
      sourceL,
      this.scenarioSpecL,
      sourceR,
      this.scenarioSpecR,
      datasetKeys,
      (datasetMapL, datasetMapR) => {
        if (!this.dataRequested) {
          return
        }

        // Extract the data points
        if (this.sourceL === 'dat') {
          datasetMapL = this.datDatasets
        }
        const pointsL = pointsFromDataset(datasetMapL?.get(this.datasetKey))
        const pointsR = pointsFromDataset(datasetMapR?.get(this.datasetKey))

        const plots: ComparisonGraphPlot[] = []
        function addPlot(points: Point[], color: string): void {
          plots.push({
            points,
            color,
            style: 'normal'
          })
        }

        // Add the primary plots.  We add the right data points first so that they are drawn
        // on top of the left data points.
        // TODO: Use the colors defined in CSS (or make them configurable through other means);
        // these should not be hardcoded here
        addPlot(pointsR, 'deepskyblue')
        addPlot(pointsL, 'crimson')

        // Find the min and max y values for all datasets
        let yMin = Number.POSITIVE_INFINITY
        let yMax = Number.NEGATIVE_INFINITY
        function setExtents(points: Point[]): void {
          for (const p of points) {
            if (p.y < yMin) {
              yMin = p.y
            }
            if (p.y > yMax) {
              yMax = p.y
            }
          }
        }
        for (const plot of plots) {
          setExtents(plot.points)
        }

        // Create the graph view model
        const comparisonGraphViewModel: ComparisonGraphViewModel = {
          key: this.requestKey,
          plots,
          yMin,
          yMax
        }

        this.writableContent.set({
          comparisonGraphViewModel,
          loading: false,
          error: undefined
        })
        this.dataLoaded = true
      }
    )
  }

  clearData(): void {
    if (this.dataRequested) {
      this.writableContent.set({
        comparisonGraphViewModel: undefined,
        loading: false,
        error: undefined
      })
      if (!this.dataLoaded) {
        this.dataCoordinator.cancelRequest(this.requestKey)
      }
      this.dataRequested = false
      this.dataLoaded = false
    }
  }
}
