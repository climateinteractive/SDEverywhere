// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type {
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonScenario,
  ComparisonScenarioKey,
  ComparisonTestReport,
  DatasetKey,
  DatasetMap,
  DiffReport
} from '@sdeverywhere/check-core'
import { diffDatasets } from '@sdeverywhere/check-core'

import { getBucketIndex } from '../_shared/buckets'
import { datasetSpan } from '../_shared/spans'

import type {
  ComparisonGraphPlot,
  ComparisonGraphPlotStyle,
  ComparisonGraphViewModel,
  Point
} from '../../graphs/comparison-graph-vm'
import { pointsFromDataset } from '../../graphs/comparison-graph-vm'

let requestId = 1

export interface CompareDetailBoxContent {
  bucketClass: string
  message?: string
  diffReport: DiffReport
  comparisonGraphViewModel: ComparisonGraphViewModel
}

export interface AxisRange {
  min: number
  max: number
}

export class CompareDetailBoxViewModel {
  public readonly requestKey: string
  private localContent: CompareDetailBoxContent
  private readonly writableContent: Writable<CompareDetailBoxContent>
  public readonly content: Readable<CompareDetailBoxContent>

  private readonly writableYRange: Writable<AxisRange>
  public readonly yRange: Readable<AxisRange>
  private activeYMin: number
  private activeYMax: number

  public readonly pinned: Readable<boolean>

  private dataRequested = false
  private dataLoaded = false

  constructor(
    public readonly comparisonConfig: ComparisonConfig,
    public readonly dataCoordinator: ComparisonDataCoordinator,
    public readonly title: string,
    public readonly subtitle: string | undefined,
    public readonly scenario: ComparisonScenario,
    public readonly datasetKey: DatasetKey
  ) {
    this.requestKey = `detail-box::${requestId++}::${scenario.key}::${datasetKey}`

    this.writableContent = writable(undefined)
    this.content = this.writableContent

    this.writableYRange = writable(undefined)
    this.yRange = this.writableYRange

    this.pinned = writable(false) // TODO!!!!!
  }

  requestData(): void {
    if (this.dataRequested) {
      return
    }
    this.dataRequested = true

    const datasetKeys: DatasetKey[] = [this.datasetKey]
    const refPlots = this.comparisonConfig.datasets.getReferencePlotsForDataset(this.datasetKey, this.scenario)
    datasetKeys.push(...refPlots.map(plot => plot.datasetKey))

    this.dataCoordinator.requestDatasetMaps(
      this.requestKey,
      this.scenario.specL,
      this.scenario.specR,
      datasetKeys,
      (datasetMapL, datasetMapR) => {
        if (!this.dataRequested) {
          return
        }

        const datasetReport = compareDatasets(this.scenario.key, this.datasetKey, datasetMapL, datasetMapR)

        const dataOnlyDefinedIn = (side: 'left' | 'right') => {
          const c = this.comparisonConfig
          const name = side === 'left' ? c.bundleL.name : c.bundleR.name
          return `Data only defined in ${datasetSpan(name, side)}`
        }

        const diffReport = datasetReport.diffReport
        let bucketIndex: number
        let message: string
        switch (diffReport.validity) {
          case 'both':
            bucketIndex = getBucketIndex(diffReport.maxDiff, this.comparisonConfig.thresholds)
            if (diffReport.maxDiff === 0) {
              message = 'No differences'
            } else {
              message = undefined
            }
            break
          case 'left-only':
            bucketIndex = undefined
            message = dataOnlyDefinedIn('left')
            break
          case 'right-only':
            bucketIndex = undefined
            message = dataOnlyDefinedIn('right')
            break
          default:
            // TODO: This can happen in the case where, for example, we show a dataset that
            // only exists in "right" for a scenario that only exists in "left".  We should
            // trap this case earlier in the process so that we don't show a box for this
            // scenario/dataset pair.
            bucketIndex = undefined
            message = 'Dataset not defined for this scenario'
            break
        }

        const modelSpecL = this.dataCoordinator.bundleModelL.modelSpec
        const modelSpecR = this.dataCoordinator.bundleModelR.modelSpec
        const outputVarL = modelSpecL.outputVars.get(this.datasetKey)
        const outputVarR = modelSpecR.outputVars.get(this.datasetKey)
        const outputVar = outputVarR || outputVarL

        // Use a fixed x-axis range for model outputs, but leave it
        // undefined for non-model datasets so that we show all
        // available data points
        let xMin: number
        let xMax: number
        if (outputVar.sourceName === undefined) {
          if (modelSpecL.startTime !== undefined && modelSpecR.startTime !== undefined) {
            xMin = Math.min(modelSpecL.startTime, modelSpecR.startTime)
          }
          if (modelSpecL.endTime !== undefined && modelSpecR.endTime !== undefined) {
            xMax = Math.max(modelSpecL.endTime, modelSpecR.endTime)
          }
        }

        // Extract the data points
        const pointsL = pointsFromDataset(datasetMapL?.get(this.datasetKey))
        const pointsR = pointsFromDataset(datasetMapR?.get(this.datasetKey))

        const plots: ComparisonGraphPlot[] = []
        function addPlot(points: Point[], color: string, style?: ComparisonGraphPlotStyle, lineWidth?: number): void {
          plots.push({
            points,
            color,
            style: style || 'normal',
            lineWidth
          })
        }

        // Add the primary plots.  We add the right data points first so that they are drawn
        // on top of the left data points.
        // TODO: Use the colors defined in CSS (or make them configurable through other means);
        // these should not be hardcoded here
        addPlot(pointsR, 'deepskyblue')
        addPlot(pointsL, 'crimson')

        // Add the secondary/reference plots
        // TODO: Currently these are always shown behind the primary plots; might need to make
        // this configurable
        for (const refPlot of refPlots) {
          const points = pointsFromDataset(datasetMapR?.get(refPlot.datasetKey))
          addPlot(points, refPlot.color, refPlot.style, refPlot.lineWidth)
        }

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
        this.writableYRange.set({
          min: yMin,
          max: yMax
        })

        // Create the graph view model
        const comparisonGraphViewModel: ComparisonGraphViewModel = {
          key: this.requestKey,
          plots,
          xMin,
          xMax,
          yMin: this.activeYMin,
          yMax: this.activeYMax
        }

        this.localContent = {
          bucketClass: `bucket-border-${bucketIndex !== undefined ? bucketIndex : 'undefined'}`,
          message,
          diffReport,
          comparisonGraphViewModel
        }
        this.writableContent.set(this.localContent)
        this.dataLoaded = true
      }
    )
  }

  updateYAxisRange(yRange: AxisRange | undefined): void {
    this.activeYMin = yRange?.min
    this.activeYMax = yRange?.max
    if (this.localContent) {
      const graphViewModel = this.localContent.comparisonGraphViewModel
      graphViewModel.yMin = this.activeYMin
      graphViewModel.yMax = this.activeYMax
      graphViewModel.onUpdated?.()
    }
  }

  clearData(): void {
    if (this.dataRequested) {
      this.localContent = undefined
      this.writableContent.set(undefined)
      if (!this.dataLoaded) {
        this.dataCoordinator.cancelRequest(this.requestKey)
      }
      this.dataRequested = false
      this.dataLoaded = false
    }
  }
}

function compareDatasets(
  scenarioKey: ComparisonScenarioKey,
  datasetKey: DatasetKey,
  datasetMapL: DatasetMap | undefined,
  datasetMapR: DatasetMap | undefined
): ComparisonTestReport {
  const datasetL = datasetMapL?.get(datasetKey)
  const datasetR = datasetMapR?.get(datasetKey)
  const diffReport = diffDatasets(datasetL, datasetR)
  return {
    scenarioKey,
    datasetKey,
    diffReport
  }
}
