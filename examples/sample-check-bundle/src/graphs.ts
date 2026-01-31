// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  BundleGraphData,
  BundleGraphDatasetSpec,
  BundleGraphId,
  BundleGraphSpec,
  BundleGraphView,
  DatasetKey,
  DatasetMap,
  LegendItem,
  LinkItem,
  OutputVar,
  ScenarioSpec
} from '@sdeverywhere/check-core'
import { SampleGraphView } from './graph-view'

/**
 * Implementation of the `BundleGraphData` interface that prepares a graph
 * using mock data.
 */
class SampleGraphData implements BundleGraphData {
  constructor(
    readonly graphSpec: BundleGraphSpec,
    readonly datasetMap: DatasetMap
  ) {}

  createGraphView(parent: HTMLElement): BundleGraphView {
    return new SampleGraphView(parent, this.graphSpec, this.datasetMap)
  }
}

/**
 * Return a `BundleGraphData` instance for the given graph.
 */
export function getGraphDataForScenario(graphSpec: BundleGraphSpec, datasetMap: DatasetMap): BundleGraphData {
  return new SampleGraphData(graphSpec, datasetMap)
}

/**
 * Return the links for the given graph.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getGraphLinksForScenario(_scenarioSpec: ScenarioSpec, _graphId: BundleGraphId): LinkItem[] {
  return [
    {
      kind: 'url',
      text: 'Open in app',
      content: 'https://github.com/climateinteractive/SDEverywhere'
    },
    {
      kind: 'copy',
      text: 'Copy cin to clipboard',
      content: 'Input A=50\nInput B=50\n'
    }
  ]
}

/**
 * Return the set of specs for the graphs available in this bundle.
 */
export function getGraphSpecs(modelVersion: number, outputVars: Map<DatasetKey, OutputVar>): BundleGraphSpec[] {
  const legendItems: LegendItem[] = [
    {
      label: 'X',
      color: '#8FBC8F'
    },
    {
      label: 'Z',
      color: '#778899'
    },
    {
      label: 'W',
      color: '#777'
    }
  ]

  function datasetSpec(datasetKey: DatasetKey, legendItemIndex: number): BundleGraphDatasetSpec {
    const outputVar = outputVars.get(datasetKey)
    const legendItem = legendItems[legendItemIndex]
    return {
      datasetKey,
      varName: outputVar.varName,
      sourceName: outputVar.sourceName,
      label: legendItem.label,
      color: legendItem.color
    }
  }

  function graphSpec(graphId: BundleGraphId, title: string): BundleGraphSpec {
    // Add some output vars just for demonstration purposes
    const bundleDatasetSpecs: BundleGraphDatasetSpec[] = [
      datasetSpec('Model__output_x', 0),
      datasetSpec('Model__output_z', 1),
      datasetSpec(`Model__output_w_v${modelVersion}`, 2)
    ]

    const metadata: Map<string, string> = new Map()
    const addMeta = (key: string, value: string | number | undefined) => {
      if (value !== undefined) {
        metadata.set(key, value.toString())
      }
    }
    addMeta('kind', 'bar')
    addMeta('title', modelVersion === 1 ? title : `Updated ${title}`)
    addMeta('yMin', 0)
    addMeta('yMax', modelVersion === 1 ? 100 : 150)

    return {
      id: graphId,
      title: `Sample Graph ${graphId}`,
      legendItems,
      datasets: bundleDatasetSpecs,
      metadata
    }
  }

  const graphSpecs: BundleGraphSpec[] = []
  for (let i = 1; i <= 8; i++) {
    if (i === 1 && modelVersion === 1) {
      // Simulate the case where a graph is not included in version 1 but is added
      // in version 2
      continue
    } else if (i === 2 && modelVersion === 2) {
      // Simulate the case where a graph is included in version 1 but is removed
      // in version 2
      continue
    }
    graphSpecs.push(graphSpec(`${i}`, `Sample Graph ${i}`))
  }

  return graphSpecs
}
