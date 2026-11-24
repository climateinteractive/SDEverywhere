// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { DatasetKey } from '../../_shared/types'
import type { BundleGraphSpec, BundleModel, LoadedBundle, ModelSpec } from '../../bundle/bundle-types'
import type { OutputVar } from '../../bundle/var-types'

import type { ComparisonConfig } from '../config/comparison-config'
import { getComparisonDatasets } from '../config/comparison-datasets'
import { getComparisonScenarios } from '../config/comparison-scenarios'
import {
  allAtPos,
  inputVar,
  scenarioWithInputVar,
  unresolvedViewForScenarioId,
  viewBox,
  viewGroup,
  viewRow,
  viewWithRows,
  viewWithScenario
} from '../_shared/_mocks/mock-resolved-types'

import { categorizeComparisonTestSummaries } from './comparison-grouping'
import type { ComparisonTestSummary } from './comparison-report-types'
import { summarizeComparisonViews } from './comparison-view-summaries'

function outputVar(varName: string): [DatasetKey, OutputVar] {
  const varId = `_${varName.toLowerCase()}`
  const datasetKey = `Model${varId}`
  return [datasetKey, { datasetKey, varId, varName }]
}

function graph(id: string, datasetKey: DatasetKey, units: string): BundleGraphSpec {
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
    inputVars: new Map([inputVar('1', 'a')]),
    outputVars: new Map([outputVar('X'), outputVar('Y')]),
    implVars: new Map(),
    graphSpecs
  }
  const model: BundleModel = { modelSpec, getDatasetsForScenario: async () => ({ datasetMap: new Map() }) }
  return { name, version: 1, modelSpec, models: [model] }
}

function testSummary(scenarioKey: string, datasetKey: DatasetKey, maxDiff: number): ComparisonTestSummary {
  return { s: scenarioKey, d: datasetKey, md: maxDiff, ad: maxDiff / 2 }
}

describe('summarizeComparisonViews', () => {
  const x = 'Model_x'
  const y = 'Model_y'
  const a = inputVar('1', 'a')[1]
  const baseline = allAtPos('1', 'at-default')
  const aAtMax = scenarioWithInputVar('2', a, 'at-maximum')

  // Graph 1 has metadata and dataset changes, graph 2 has metadata changes only, and graph 3 is unchanged
  const bundleL = mockBundle('L', [graph('1', x, 'C'), graph('2', y, 'm'), graph('3', y, 's')])
  const bundleR = mockBundle('R', [graph('1', x, 'K'), graph('2', y, 'km'), graph('3', y, 's')])
  const datasets = getComparisonDatasets(bundleL.modelSpec, bundleR.modelSpec, undefined)

  const graphsView = viewWithScenario('Baseline graphs', undefined, baseline, ['1', '2', '3'], 'grouped-by-diffs')
  const scenarioView = viewWithScenario('A at max', undefined, aAtMax, ['1'])
  const rowsView = viewWithRows('Freeform', undefined, [
    viewRow('Row', undefined, [viewBox('Box', undefined, datasets.getDataset(x), baseline)])
  ])
  const unresolvedView = unresolvedViewForScenarioId('Missing', 'missing_id')
  const groupA = viewGroup('Group A', [graphsView, scenarioView])
  const groupB = viewGroup('Group B', [rowsView, unresolvedView])

  const comparisonConfig: ComparisonConfig = {
    bundleL,
    bundleR,
    thresholds: [1, 5, 10],
    ratioThresholds: [1, 2, 3],
    scenarios: getComparisonScenarios([baseline, aAtMax]),
    datasets,
    viewGroups: [groupA, groupB]
  }

  // The baseline scenario has a difference in X; the "a at max" scenario has no differences
  const testSummaries = [testSummary('1', x, 2), testSummary('1', y, 0), testSummary('2', x, 0), testSummary('2', y, 0)]
  const categorized = categorizeComparisonTestSummaries(comparisonConfig, testSummaries, 'max-diff')
  const summaries = summarizeComparisonViews(comparisonConfig, categorized)

  it('should return a summary for each view in each view group', () => {
    expect(summaries.map(g => [g.viewGroup.title, g.viewSummaries.map(s => s.view.title)])).toEqual([
      ['Group A', ['Baseline graphs', 'A at max']],
      ['Group B', ['Freeform', 'Missing']]
    ])
  })

  it('should use the graph differences for a view that shows graphs grouped by diffs', () => {
    const s = summaries[0].viewSummaries[0]
    expect(s.groupSummary).toBe(categorized.byScenario.allGroupSummaries.get('1'))
    expect(s.changedGraphCount).toBe(2)
    expect(s.diffPercentByBucket).toEqual([1, 1, 1, 0, 0, 0].map(count => (count / 3) * 100))
    expect(s.hasDiffs).toBe(true)
  })

  it('should use the dataset differences for a single-scenario view that shows graphs in the default order', () => {
    const s = summaries[0].viewSummaries[1]
    expect(s.groupSummary).toBe(categorized.byScenario.allGroupSummaries.get('2'))
    expect(s.changedGraphCount).toBeUndefined()
    expect(s.diffPercentByBucket).toEqual([100, 0, 0, 0, 0, 0])
    expect(s.hasDiffs).toBe(false)
  })

  it('should use the differences of the boxes for a freeform view', () => {
    const s = summaries[1].viewSummaries[0]
    expect(s.groupSummary).toBeUndefined()
    expect(s.diffPercentByBucket).toEqual([0, 0, 100, 0, 0, 0])
    expect(s.hasDiffs).toBe(true)
  })

  it('should treat an unresolved view as a view with diffs', () => {
    const s = summaries[1].viewSummaries[1]
    expect(s.diffPercentByBucket).toBeUndefined()
    expect(s.hasDiffs).toBe(true)
  })
})
