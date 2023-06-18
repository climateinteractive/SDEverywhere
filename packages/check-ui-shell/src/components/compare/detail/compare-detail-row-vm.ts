// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  BundleGraphId,
  BundleGraphSpec,
  BundleModel,
  ComparisonConfig,
  ComparisonDataCoordinator,
  ComparisonScenario,
  OutputVar
} from '@sdeverywhere/check-core'

import { ContextGraphViewModel } from '../../graphs/context-graph-vm'

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
  const comparisonConfig = box.comparisonConfig
  const dataCoordinator = box.dataCoordinator
  const bundleModelL = dataCoordinator.bundleModelL
  const bundleModelR = dataCoordinator.bundleModelR

  const contextGraph = (scenario: ComparisonScenario, graphSpec: BundleGraphSpec, bundle: 'left' | 'right') => {
    return new ContextGraphViewModel(comparisonConfig, dataCoordinator, bundle, scenario, graphSpec)
  }

  // Get the context graphs that are related to this output variable
  const relatedGraphIds: Set<BundleGraphId> = new Set()
  const addGraphs = (outputVar: OutputVar, bundleModel: BundleModel) => {
    // Use the graph specs advertised by the bundle to determine which
    // graphs to display
    if (bundleModel.modelSpec.graphSpecs === undefined) {
      return
    }
    for (const graphSpec of bundleModel.modelSpec.graphSpecs) {
      for (const graphDatasetSpec of graphSpec.datasets) {
        if (graphDatasetSpec.datasetKey === outputVar.datasetKey) {
          relatedGraphIds.add(graphSpec.id)
          break
        }
      }
    }
  }
  const dataset = comparisonConfig.datasets.getDataset(box.datasetKey)
  addGraphs(dataset.outputVarL, bundleModelL)
  addGraphs(dataset.outputVarR, bundleModelR)

  // Prepare context graphs for this box
  const contextGraphRows: CompareDetailContextGraphRowViewModel[] = []
  for (const graphId of relatedGraphIds) {
    const graphSpecL = bundleModelL.modelSpec.graphSpecs?.find(s => s.id === graphId)
    const graphSpecR = bundleModelR.modelSpec.graphSpecs?.find(s => s.id === graphId)
    contextGraphRows.push({
      graphL: contextGraph(box.scenario, graphSpecL, 'left'),
      graphR: contextGraph(box.scenario, graphSpecR, 'right')
    })
  }

  return contextGraphRows
}
