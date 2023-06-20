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

import type { ComparisonGraphViewModel } from '../../graphs/comparison-graph-vm'
import { pointsFromDataset } from '../../graphs/comparison-graph-vm'

let requestId = 1

export interface CompareDetailBoxContent {
  bucketClass: string
  message?: string
  diffReport: DiffReport
  comparisonGraphViewModel: ComparisonGraphViewModel
}

export class CompareDetailBoxViewModel {
  public readonly requestKey: string
  private readonly writableContent: Writable<CompareDetailBoxContent>
  public readonly content: Readable<CompareDetailBoxContent>
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
  }

  requestData(): void {
    if (this.dataRequested) {
      return
    }
    this.dataRequested = true

    this.dataCoordinator.requestDatasetMaps(
      this.requestKey,
      this.scenario.specL,
      this.scenario.specR,
      [this.datasetKey],
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

        const comparisonGraphViewModel: ComparisonGraphViewModel = {
          key: this.requestKey,
          refPlots: [],
          pointsL: pointsFromDataset(datasetMapL?.get(this.datasetKey)),
          pointsR: pointsFromDataset(datasetMapR?.get(this.datasetKey)),
          xMin,
          xMax
        }

        this.writableContent.set({
          bucketClass: `bucket-border-${bucketIndex !== undefined ? bucketIndex : 'undefined'}`,
          message,
          diffReport,
          comparisonGraphViewModel
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
