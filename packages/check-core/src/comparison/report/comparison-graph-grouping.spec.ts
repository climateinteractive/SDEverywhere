// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { DatasetKey } from '../../_shared/types'
import type { BundleGraphSpec, BundleModel, LoadedBundle, ModelSpec } from '../../bundle/bundle-types'

import type { ComparisonConfig } from '../config/comparison-config'
import { getComparisonDatasets } from '../config/comparison-datasets'
import { getComparisonScenarios } from '../config/comparison-scenarios'
import { allAtPos } from '../_shared/_mocks/mock-resolved-types'

import { groupGraphsByDiffs } from './comparison-graph-grouping'
import type { ComparisonTestSummary } from './comparison-report-types'

function graph(id: string, datasetKey: DatasetKey, units = 'C'): BundleGraphSpec {
  return {
    id,
    title: `Graph ${id}`,
    legendItems: [],
    datasets: [{ datasetKey, varName: datasetKey, color: 'red' }],
    metadata: new Map([['units', units]])
  }
}

function mockBundle(name: string, graphSpecs: BundleGraphSpec[]): LoadedBundle {
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map(),
    outputVars: new Map(),
    implVars: new Map(),
    graphSpecs
  }
  const model: BundleModel = { modelSpec, getDatasetsForScenario: async () => ({ datasetMap: new Map() }) }
  return { name, version: 1, modelSpec, models: [model] }
}

function testSummary(scenarioKey: string, datasetKey: DatasetKey, maxDiff: number): ComparisonTestSummary {
  return { s: scenarioKey, d: datasetKey, md: maxDiff, ad: maxDiff / 2 }
}

describe('groupGraphsByDiffs', () => {
  const baseline = allAtPos('1', 'at-default')

  // Graph 1 has metadata and dataset changes, 2 and 7 have dataset changes only, 3 was removed,
  // 4 is unchanged, 5 was added, and 6 has metadata changes only
  const bundleL = mockBundle('L', [
    graph('1', 'Model_a', 'C'),
    graph('2', 'Model_b'),
    graph('3', 'Model_c'),
    graph('4', 'Model_d'),
    graph('6', 'Model_e', 'm'),
    graph('7', 'Model_f')
  ])
  const bundleR = mockBundle('R', [
    graph('1', 'Model_a', 'K'),
    graph('2', 'Model_b'),
    graph('4', 'Model_d'),
    graph('5', 'Model_g'),
    graph('6', 'Model_e', 'km'),
    graph('7', 'Model_f')
  ])
  const comparisonConfig: ComparisonConfig = {
    bundleL,
    bundleR,
    thresholds: [1, 5, 10],
    ratioThresholds: [1, 2, 3],
    scenarios: getComparisonScenarios([baseline]),
    datasets: getComparisonDatasets(bundleL.modelSpec, bundleR.modelSpec, undefined),
    viewGroups: []
  }
  const testSummaries = [
    testSummary('1', 'Model_a', 1.71),
    testSummary('1', 'Model_b', 3),
    testSummary('1', 'Model_d', 0),
    testSummary('1', 'Model_e', 0),
    testSummary('1', 'Model_f', 22.95)
  ]

  it('should group the graphs by the kind of change, with the largest dataset changes first', () => {
    const grouped = groupGraphsByDiffs(comparisonConfig, baseline.key, testSummaries, [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7'
    ])
    expect(grouped.groups.map(g => [g.kind, g.title, g.items.map(item => item.graphId)])).toEqual([
      ['added', 'Added graphs', ['5']],
      ['removed', 'Removed graphs', ['3']],
      ['metadata-and-datasets', 'Graphs with metadata and dataset changes', ['1']],
      ['metadata-only', 'Graphs with metadata changes only', ['6']],
      ['datasets-only', 'Graphs with dataset changes only', ['7', '2']],
      ['unchanged', 'Unchanged graphs', ['4']]
    ])
    expect(grouped.groups[2].items[0]).toEqual({
      graphId: '1',
      graphReport: {
        inclusion: 'both',
        metadataReports: [{ key: 'units', valueL: 'C', valueR: 'K' }],
        datasetReports: [{ datasetKey: 'Model_a', maxDiff: 1.71 }]
      },
      maxDiffPct: 1.71
    })
  })

  it('should count the graphs with changes and the percentage of graphs in each bucket', () => {
    const grouped = groupGraphsByDiffs(comparisonConfig, baseline.key, testSummaries, [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7'
    ])
    // (added, removed, and metadata-only graphs go in the first "changed" bucket)
    expect(grouped.nonZeroDiffCount).toBe(6)
    expect(grouped.diffPercentByBucket).toEqual([1, 3, 2, 0, 1, 0].map(count => (count / 7) * 100))
  })

  it('should leave out empty groups, and treat a graph that is in neither bundle as unchanged', () => {
    const grouped = groupGraphsByDiffs(comparisonConfig, baseline.key, testSummaries, ['4', '99'])
    expect(grouped.groups.map(g => [g.kind, g.items.map(item => item.graphId)])).toEqual([['unchanged', ['4', '99']]])
    expect(grouped.nonZeroDiffCount).toBe(0)
  })
})
