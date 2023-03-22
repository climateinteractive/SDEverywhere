// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ComparisonConfig, ComparisonDataCoordinator } from '@sdeverywhere/check-core'

import type { ContextGraphViewModel } from '../../graphs/context-graph-vm'

import { CompareDetailBoxViewModel } from './compare-detail-box-vm'
import type { ComparisonDetailItem } from './compare-detail-item'

export interface CompareDetailContextGraphRowViewModel {
  graphL: ContextGraphViewModel
  graphR: ContextGraphViewModel
}

export interface CompareDetailRowViewModel {
  title?: string
  subtitle?: string
  showTitle: boolean
  boxes: CompareDetailBoxViewModel[]
}

export function createCompareDetailRowViewModel(
  comparisonConfig: ComparisonConfig,
  dataCoordinator: ComparisonDataCoordinator,
  kind: 'scenarios' | 'datasets',
  title: string | undefined,
  subtitle: string | undefined,
  items: ComparisonDetailItem[]
): CompareDetailRowViewModel {
  const boxes: CompareDetailBoxViewModel[] = []

  for (const item of items) {
    // If a scenario wasn't run for this position, add an undefined box view model
    // (the space will be left blank)
    if (item === undefined) {
      boxes.push(undefined)
      continue
    }

    // TODO
    const boxTitle = kind === 'scenarios' ? `…${item.subtitle}` : item.title

    boxes.push(
      new CompareDetailBoxViewModel(
        comparisonConfig,
        dataCoordinator,
        boxTitle,
        undefined, //item.subtitle,
        item.scenario,
        item.testSummary.d
      )
    )
  }

  return {
    title,
    subtitle,
    showTitle: kind === 'scenarios',
    boxes
  }
}

export function createContextGraphRows(box: CompareDetailBoxViewModel): CompareDetailContextGraphRowViewModel[] {
  // TODO
  return []

  // const compareConfig = box.compareConfig
  // const dataCoordinator = box.dataCoordinator

  // const contextGraph = (scenario: CompareScenario, graphSpec: BundleGraphSpec, bundle: 'left' | 'right') => {
  //   return new ContextGraphViewModel(compareConfig, dataCoordinator, bundle, scenario, graphSpec)
  // }

  // const bundleModelL = dataCoordinator.bundleModelL
  // const bundleModelR = dataCoordinator.bundleModelR

  // // Get the context graphs that are related to this output variable
  // const relatedGraphIds: Set<BundleGraphId> = new Set()
  // const addGraphs = (datasetKey: DatasetKey, bundleModel: BundleModel) => {
  //   if (bundleModel.getGraphsForDataset) {
  //     // Add the graphs that are explicitly defined by the bundle
  //     for (const graphId of bundleModel.getGraphsForDataset(datasetKey)) {
  //       relatedGraphIds.add(graphId)
  //     }
  //   } else {
  //     // Use the graph specs advertised by the bundle to determine which
  //     // graphs to display
  //     if (bundleModel.modelSpec.graphSpecs === undefined) {
  //       return
  //     }
  //     for (const graphSpec of bundleModel.modelSpec.graphSpecs) {
  //       for (const datasetSpec of graphSpec.datasets) {
  //         if (datasetSpec.datasetKey === datasetKey) {
  //           relatedGraphIds.add(graphSpec.id)
  //           break
  //         }
  //       }
  //     }
  //   }
  // }
  // const datasetKeyL = box.datasetKey
  // const datasetKeyR = compareConfig.datasets.renamedDatasetKeys?.get(datasetKeyL) || datasetKeyL
  // addGraphs(datasetKeyL, bundleModelL)
  // addGraphs(datasetKeyR, bundleModelR)

  // // Prepare context graphs for this box
  // const contextGraphRows: CompareDetailContextGraphRowViewModel[] = []
  // for (const graphId of relatedGraphIds) {
  //   const graphSpecL = bundleModelL.modelSpec.graphSpecs?.find(s => s.id === graphId)
  //   const graphSpecR = bundleModelR.modelSpec.graphSpecs?.find(s => s.id === graphId)
  //   contextGraphRows.push({
  //     graphL: contextGraph(box.scenario, graphSpecL, 'left'),
  //     graphR: contextGraph(box.scenario, graphSpecR, 'right')
  //   })
  // }

  // return contextGraphRows
}
