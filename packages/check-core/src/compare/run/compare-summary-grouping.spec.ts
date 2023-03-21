// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { DatasetKey } from '../../_shared/types'
import type { CompareScenario, CompareScenarioKey } from '../_shared/compare-resolved-types'
import { allAtPos, inputVar, scenarioWithInputVar } from '../_shared/_mocks/mock-resolved-types'
import type { BundleModel, LoadedBundle, ModelSpec } from '../../bundle/bundle-types'
import type { OutputVar } from '../../bundle/var-types'

import type { CompareConfig } from '../config/compare-config'
import { getCompareDatasets } from '../config/compare-datasets'
import { CompareScenarios } from '../config/compare-scenarios'

import type { ComparisonGroup, ComparisonGroupScores, ComparisonGroupSummary } from './compare-summary-grouping'
import { categorizeComparisonGroups, groupComparisonSummaries } from './compare-summary-grouping'
import type { CompareDatasetSummary } from './compare-summary'

function summary(scenario: CompareScenario, datasetKey: DatasetKey, maxDiff = 0): CompareDatasetSummary {
  return {
    s: scenario.key,
    d: datasetKey,
    md: maxDiff
  }
}

function mockBundleModel(modelSpec: ModelSpec): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async () => {
      return {
        datasetMap: new Map()
      }
    },
    getGraphDataForScenario: async () => {
      return undefined
    },
    getGraphLinksForScenario: () => {
      return []
    }
  }
}

function outputVar(varName: string, source?: string): [DatasetKey, OutputVar] {
  const varId = `_${varName.toLowerCase().replace(/\s/g, '_')}`
  const datasetKey = `${source || 'Model'}${varId}`
  const v: OutputVar = {
    sourceName: source,
    varId,
    varName
  }
  return [datasetKey, v]
}

function mockBundle(name: string, inputVarNames: string[], outputVarNames: string[]): LoadedBundle {
  const modelSpec: ModelSpec = {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars: new Map(inputVarNames.map(varName => inputVar(varName))),
    outputVars: new Map(outputVarNames.map(varName => outputVar(varName))),
    implVars: new Map()
  }
  return {
    name,
    version: 1,
    model: mockBundleModel(modelSpec)
  }
}

function mockCompareConfig(
  bundleL: LoadedBundle,
  bundleR: LoadedBundle,
  scenarios: CompareScenario[],
  renamedDatasetKeys?: Map<DatasetKey, DatasetKey>
): CompareConfig {
  return {
    bundleL,
    bundleR,
    thresholds: [1, 5, 10],
    scenarios: new CompareScenarios(scenarios),
    viewGroups: [],
    datasets: getCompareDatasets(bundleL.model.modelSpec, bundleR.model.modelSpec, renamedDatasetKeys)
  }
}

describe('groupComparisonSummaries', () => {
  const x = 'Model_x'
  const y = 'Model_y'

  const a = inputVar('a', '1')[1]
  const b = inputVar('b', '2')[1]

  const baseline = allAtPos('1', 'at-default')
  const aAtMin = scenarioWithInputVar('2', a, 'at-minimum')
  const aAtMax = scenarioWithInputVar('3', a, 'at-maximum')
  const bAtMin = scenarioWithInputVar('4', b, 'at-minimum')
  const bAtMax = scenarioWithInputVar('5', b, 'at-maximum')
  const bAt20 = scenarioWithInputVar('6', b, 20)

  // For these tests, we assume:
  //   - 2 output variables (x, y)
  //   - 2 input variables (a, b)
  //   - 6 scenarios:
  //       - all inputs at default (aka baseline)
  //       - a at {min,max}
  //       - b at {min,max}
  //       - b at 20
  const allSummaries = [
    summary(baseline, x),
    summary(baseline, y),
    summary(aAtMin, x),
    summary(aAtMin, y, 20),
    summary(aAtMax, x),
    summary(aAtMax, y, 10),
    summary(bAtMin, x),
    summary(bAtMin, y, 5),
    summary(bAtMax, x),
    summary(bAtMax, y, 40),
    summary(bAt20, x),
    summary(bAt20, y)
  ]

  it('should group all summaries by scenario', () => {
    function group(key: CompareScenarioKey, summaries: CompareDatasetSummary[]): ComparisonGroup {
      return {
        kind: 'by-scenario',
        key,
        summaries
      }
    }

    // group all comparisons by scenario:
    //   all inputs at default  ->  a group with 2 summaries where scenario is "baseline"
    //   input a at min         ->  a group with 2 summaries where scenario is "input A at min"
    //   input a at max         ->  ...
    //   input b at min
    //   input b at max
    //   ...
    const groups = groupComparisonSummaries(allSummaries, 'by-scenario')
    expect(groups.size).toBe(6)
    expect(groups.get('1')).toEqual(group('1', [summary(baseline, x), summary(baseline, y)]))
    expect(groups.get('2')).toEqual(group('2', [summary(aAtMin, x), summary(aAtMin, y, 20)]))
    expect(groups.get('3')).toEqual(group('3', [summary(aAtMax, x), summary(aAtMax, y, 10)]))
    expect(groups.get('4')).toEqual(group('4', [summary(bAtMin, x), summary(bAtMin, y, 5)]))
    expect(groups.get('5')).toEqual(group('5', [summary(bAtMax, x), summary(bAtMax, y, 40)]))
    expect(groups.get('6')).toEqual(group('6', [summary(bAt20, x), summary(bAt20, y)]))
  })

  it('should group all summaries by dataset', () => {
    function group(key: DatasetKey, summaries: CompareDatasetSummary[]): ComparisonGroup {
      return {
        kind: 'by-dataset',
        key,
        summaries
      }
    }

    // group all comparisons by dataset:
    //   output x  ->  a group with 6 summaries where dataset is "x"
    //   output y  ->  a group with 6 summaries where dataset is "y"
    const groups = groupComparisonSummaries(allSummaries, 'by-dataset')
    expect(groups.size).toBe(2)
    expect(groups.get('Model_x')).toEqual(
      group('Model_x', [
        summary(baseline, x),
        summary(aAtMin, x),
        summary(aAtMax, x),
        summary(bAtMin, x),
        summary(bAtMax, x),
        summary(bAt20, x)
      ])
    )
    expect(groups.get('Model_y')).toEqual(
      group('Model_y', [
        summary(baseline, y),
        summary(aAtMin, y, 20),
        summary(aAtMax, y, 10),
        summary(bAtMin, y, 5),
        summary(bAtMax, y, 40),
        summary(bAt20, y)
      ])
    )
  })
})

describe('categorizeComparisonGroups', () => {
  const inputVarNames = ['a', 'b']
  const bundleL = mockBundle('L', inputVarNames, ['w', 'x', 'y', 'z'])
  const bundleR = mockBundle('R', inputVarNames, ['w', 'x', 'y renamed', 'v'])

  const renamedDatasetKeys: Map<DatasetKey, DatasetKey> = new Map()

  // In both L and R
  const w = 'Model_w'
  const x = 'Model_x'

  // Renamed from "y" to "y renamed"
  const y = 'Model_y'
  const yRenamed = 'Model_y_renamed'
  renamedDatasetKeys.set(y, yRenamed)

  // In L only
  const z = 'Model_z'

  // In R only
  const v = 'Model_v'

  // TODO: Test added/removed/renamed inputs
  const a = inputVar('a', '1')[1]
  const b = inputVar('b', '2')[1]

  const baseline = allAtPos('1', 'at-default')
  const aAtMin = scenarioWithInputVar('2', a, 'at-minimum')
  const aAtMax = scenarioWithInputVar('3', a, 'at-maximum')
  const bAtMin = scenarioWithInputVar('4', b, 'at-minimum')
  const bAtMax = scenarioWithInputVar('5', b, 'at-maximum')
  const bAt20 = scenarioWithInputVar('6', b, 20)

  const scenarios = [baseline, aAtMin, aAtMax, bAtMin, bAtMax, bAt20]

  const compareConfig = mockCompareConfig(bundleL, bundleR, scenarios, renamedDatasetKeys)

  // For these tests, we assume:
  //   - a few output variables (x, y, z, v, w), see above
  //   - 2 input variables (a, b)
  //   - 6 scenarios:
  //       - all inputs at default (aka baseline)
  //       - a at {min,max}
  //       - b at {min,max}
  //       - b at 20
  const allSummaries = [
    summary(baseline, w),
    summary(baseline, x),
    summary(baseline, y),
    summary(baseline, z),
    summary(baseline, v),

    // Note that we simulate maxDiff for w being less than for y to
    // verify that y is sorted ahead of w (since y has higher score)
    summary(aAtMin, w),
    summary(aAtMin, x),
    summary(aAtMin, y, 10),
    summary(aAtMin, z),
    summary(aAtMin, v),

    summary(aAtMax, w),
    summary(aAtMax, x),
    summary(aAtMax, y, 10),
    summary(aAtMax, z),
    summary(aAtMax, v),

    summary(bAtMin, w, 5),
    summary(bAtMin, x),
    summary(bAtMin, y, 5),
    summary(bAtMin, z),
    summary(bAtMin, v),

    summary(bAtMax, w),
    summary(bAtMax, x),
    summary(bAtMax, y, 40),
    summary(bAtMax, z),
    summary(bAtMax, v),

    summary(bAt20, w),
    summary(bAt20, x),
    summary(bAt20, y),
    summary(bAt20, z),
    summary(bAt20, v)
  ]

  it.only('should categorize by-scenario groups', () => {
    function groupSummary(
      scenarioKey: CompareScenarioKey,
      summaries: CompareDatasetSummary[],
      scores?: ComparisonGroupScores
    ): ComparisonGroupSummary {
      return {
        root: {
          kind: 'scenario-root',
          scenario: compareConfig.scenarios.getScenario(scenarioKey)
        },
        group: {
          kind: 'by-scenario',
          key: scenarioKey,
          summaries
        },
        scores
      }
    }

    // given by-scenario groups, sort comparisons for scenario:
    //   order comparisons by max diff (get percent of each bucket)
    //   put into sections (scenarios added, removed, diffs, no diffs)
    const groupsByScenario = groupComparisonSummaries(allSummaries, 'by-scenario')
    const groupSummaries = categorizeComparisonGroups(compareConfig, [...groupsByScenario.values()])

    // TODO: Test L/R-only scenarios
    expect(groupSummaries.onlyInLeft).toEqual([])
    expect(groupSummaries.onlyInRight).toEqual([])

    expect(groupSummaries.withDiffs).toEqual([
      groupSummary(
        '5',
        [summary(bAtMax, w), summary(bAtMax, x), summary(bAtMax, y, 40), summary(bAtMax, z), summary(bAtMax, v)],
        {
          totalDiffCount: 5,
          totalMaxDiffByBucket: [0, 0, 0, 0, 40],
          diffCountByBucket: [4, 0, 0, 0, 1],
          diffPercentByBucket: [80, 0, 0, 0, 20]
        }
      ),
      groupSummary(
        '3',
        [summary(aAtMax, w), summary(aAtMax, x), summary(aAtMax, y, 10), summary(aAtMax, z), summary(aAtMax, v)],
        {
          totalDiffCount: 5,
          totalMaxDiffByBucket: [0, 0, 0, 0, 10],
          diffCountByBucket: [4, 0, 0, 0, 1],
          diffPercentByBucket: [80, 0, 0, 0, 20]
        }
      ),
      groupSummary(
        '2',
        [summary(aAtMin, w), summary(aAtMin, x), summary(aAtMin, y, 10), summary(aAtMin, z), summary(aAtMin, v)],
        {
          totalDiffCount: 5,
          totalMaxDiffByBucket: [0, 0, 0, 0, 10],
          diffCountByBucket: [4, 0, 0, 0, 1],
          diffPercentByBucket: [80, 0, 0, 0, 20]
        }
      ),
      groupSummary(
        '4',
        [summary(bAtMin, w, 5), summary(bAtMin, x), summary(bAtMin, y, 5), summary(bAtMin, z), summary(bAtMin, v)],
        {
          totalDiffCount: 5,
          totalMaxDiffByBucket: [0, 0, 0, 10, 0],
          diffCountByBucket: [3, 0, 0, 2, 0],
          diffPercentByBucket: [60, 0, 0, 40, 0]
        }
      )
    ])

    expect(groupSummaries.withoutDiffs).toEqual([
      groupSummary(
        '1',
        [summary(baseline, w), summary(baseline, x), summary(baseline, y), summary(baseline, z), summary(baseline, v)],
        {
          totalDiffCount: 5,
          totalMaxDiffByBucket: [0, 0, 0, 0, 0],
          diffCountByBucket: [5, 0, 0, 0, 0],
          diffPercentByBucket: [100, 0, 0, 0, 0]
        }
      ),
      groupSummary(
        '6',
        [summary(bAt20, w), summary(bAt20, x), summary(bAt20, y), summary(bAt20, z), summary(bAt20, v)],
        {
          totalDiffCount: 5,
          totalMaxDiffByBucket: [0, 0, 0, 0, 0],
          diffCountByBucket: [5, 0, 0, 0, 0],
          diffPercentByBucket: [100, 0, 0, 0, 0]
        }
      )
    ])
  })

  it('should categorize by-dataset groups', () => {
    function groupSummary(
      datasetKey: DatasetKey,
      summaries: CompareDatasetSummary[],
      scores?: ComparisonGroupScores
    ): ComparisonGroupSummary {
      return {
        root: {
          kind: 'dataset-root',
          dataset: compareConfig.datasets.getDataset(datasetKey)
        },
        group: {
          kind: 'by-dataset',
          key: datasetKey,
          summaries
        },
        scores
      }
    }

    // given by-dataset groups, sort comparisons for dataset:
    //   order comparisons by max diff (get percent of each bucket)
    //   put into sections (datasets added, removed, diffs, no diffs)
    const groupsByDataset = groupComparisonSummaries(allSummaries, 'by-dataset')
    const groupSummaries = categorizeComparisonGroups(compareConfig, [...groupsByDataset.values()])

    expect(groupSummaries.onlyInLeft).toEqual([
      groupSummary('Model_z', [
        summary(baseline, z),
        summary(aAtMin, z),
        summary(aAtMax, z),
        summary(bAtMin, z),
        summary(bAtMax, z),
        summary(bAt20, z)
      ])
    ])

    expect(groupSummaries.onlyInRight).toEqual([
      groupSummary('Model_v', [
        summary(baseline, v),
        summary(aAtMin, v),
        summary(aAtMax, v),
        summary(bAtMin, v),
        summary(bAtMax, v),
        summary(bAt20, v)
      ])
    ])

    expect(groupSummaries.withDiffs).toEqual([
      groupSummary(
        'Model_y',
        [
          summary(baseline, y),
          summary(aAtMin, y, 10),
          summary(aAtMax, y, 10),
          summary(bAtMin, y, 5),
          summary(bAtMax, y, 40),
          summary(bAt20, y)
        ],
        {
          totalDiffCount: 6,
          totalMaxDiffByBucket: [0, 0, 0, 5, 60],
          diffCountByBucket: [2, 0, 0, 1, 3],
          diffPercentByBucket: [33.33333333333333, 0, 0, 16.666666666666664, 50]
        }
      ),
      groupSummary(
        'Model_w',
        [
          summary(baseline, w),
          summary(aAtMin, w),
          summary(aAtMax, w),
          summary(bAtMin, w, 5),
          summary(bAtMax, w),
          summary(bAt20, w)
        ],
        {
          totalDiffCount: 6,
          totalMaxDiffByBucket: [0, 0, 0, 5, 0],
          diffCountByBucket: [5, 0, 0, 1, 0],
          diffPercentByBucket: [83.33333333333334, 0, 0, 16.666666666666664, 0]
        }
      )
    ])

    expect(groupSummaries.withoutDiffs).toEqual([
      groupSummary(
        'Model_x',
        [
          summary(baseline, x),
          summary(aAtMin, x),
          summary(aAtMax, x),
          summary(bAtMin, x),
          summary(bAtMax, x),
          summary(bAt20, x)
        ],
        {
          totalDiffCount: 6,
          totalMaxDiffByBucket: [0, 0, 0, 0, 0],
          diffCountByBucket: [6, 0, 0, 0, 0],
          diffPercentByBucket: [100, 0, 0, 0, 0]
        }
      )
    ])
  })
})
