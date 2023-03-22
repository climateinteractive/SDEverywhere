// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { writable } from 'svelte/store'

import type {
  BundleGraphId,
  BundleGraphSpec,
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonScenario,
  DatasetKey,
  GraphComparisonMetadataReport,
  GraphComparisonReport
} from '@sdeverywhere/check-core'

import { getBucketIndex } from '../../../_shared/buckets'

import { CompareDetailBoxViewModel } from '../detail/compare-detail-box-vm'
import { ContextGraphViewModel } from '../../graphs/context-graph-vm'

import type { CompareGraphsDatasetViewModel } from './compare-graphs-dataset-vm'

export interface CompareGraphsRowViewModel {
  graphId: BundleGraphId
  graphL: ContextGraphViewModel
  graphR: ContextGraphViewModel
  metadataRows: GraphComparisonMetadataReport[]
  datasetRows: CompareGraphsDatasetViewModel[]
  maxDiffPct: number
}

export function createCompareGraphsRowViewModel(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  scenario: ComparisonScenario,
  graphId: BundleGraphId,
  graphReport: GraphComparisonReport
): CompareGraphsRowViewModel {
  const contextGraph = (graphSpec: BundleGraphSpec, bundle: 'left' | 'right') => {
    return new ContextGraphViewModel(comparisonConfig, dataCoordinator, bundle, scenario, graphSpec)
  }

  // Create a view model for each graph
  const graphSpecL = comparisonConfig.bundleL.model.modelSpec.graphSpecs?.find(s => s.id === graphId)
  const graphSpecR = comparisonConfig.bundleR.model.modelSpec.graphSpecs?.find(s => s.id === graphId)
  const graphL = contextGraph(graphSpecL, 'left')
  const graphR = contextGraph(graphSpecR, 'right')

  // Compute the union of all dataset keys appearing in the graphs
  // TODO: Ideally this would handle renamed or reordered variables
  const datasetKeys: Set<DatasetKey> = new Set()
  if (graphSpecL) {
    for (const datasetSpec of graphSpecL.datasets) {
      datasetKeys.add(datasetSpec.datasetKey)
    }
  }
  if (graphSpecR) {
    for (const datasetSpec of graphSpecR.datasets) {
      datasetKeys.add(datasetSpec.datasetKey)
    }
  }

  // Get the diff/score for each dataset
  const datasetRows: CompareGraphsDatasetViewModel[] = []
  let graphMaxDiffPct = 0
  if (graphReport.inclusion === 'both') {
    for (const datasetKey of datasetKeys) {
      const datasetSpecL = graphSpecL?.datasets?.find(d => d.datasetKey === datasetKey)
      const datasetSpecR = graphSpecR?.datasets?.find(d => d.datasetKey === datasetKey)
      const nameL = datasetSpecL?.varName
      const nameR = datasetSpecR?.varName
      const legendColorL = datasetSpecL?.color || '#777'
      const legendColorR = datasetSpecR?.color || '#777'
      const legendLabelL = datasetSpecL?.label
      const legendLabelR = datasetSpecR?.label

      // TODO: Highlight added/removed datasets
      const datasetReport = graphReport.datasetReports.find(r => r.datasetKey === datasetKey)
      let maxDiff = 0
      if (datasetReport) {
        if (datasetReport.maxDiff === undefined || datasetReport.maxDiff === 0) {
          // Skip datasets that have no differences
          continue
        }
        maxDiff = datasetReport.maxDiff
        if (maxDiff > graphMaxDiffPct) {
          graphMaxDiffPct = maxDiff
        }
      }

      const bucketIndex = getBucketIndex(maxDiff, comparisonConfig.thresholds)
      const bucketClass = `bucket-color-${bucketIndex}`

      const detailBoxViewModel = new CompareDetailBoxViewModel(
        comparisonConfig,
        dataCoordinator,
        '',
        '',
        scenario,
        datasetKey
      )

      datasetRows.push({
        datasetKey,
        nameL,
        nameR,
        legendColorL,
        legendColorR,
        legendLabelL,
        legendLabelR,
        bucketClass,
        maxDiff,
        detailBoxViewModel,
        detailBoxVisible: writable(false)
      })
    }
  }

  return {
    graphId,
    graphL,
    graphR,
    metadataRows: graphReport.metadataReports,
    datasetRows,
    maxDiffPct: graphMaxDiffPct
  }
}
