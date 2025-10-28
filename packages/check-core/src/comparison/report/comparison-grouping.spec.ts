// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { DatasetKey } from '../../_shared/types'
import type {
  ComparisonResolverInvalidValueError,
  ComparisonResolverUnknownInputError,
  ComparisonScenario,
  ComparisonScenarioKey
} from '../_shared/comparison-resolved-types'
import { allAtPos, inputVar, scenarioWithInput, scenarioWithInputVar } from '../_shared/_mocks/mock-resolved-types'
import type { BundleModel, LoadedBundle, ModelSpec } from '../../bundle/bundle-types'
import type { OutputVar } from '../../bundle/var-types'

import type { ComparisonConfig, ComparisonDatasetOptions } from '../config/comparison-config'
import { getComparisonDatasets } from '../config/comparison-datasets'
import { getComparisonScenarios } from '../config/comparison-scenarios'

import type { ComparisonGroup, ComparisonGroupScores, ComparisonGroupSummary } from './comparison-group-types'
import {
  categorizeComparisonGroups,
  categorizeComparisonTestSummaries,
  groupComparisonTestSummaries
} from './comparison-grouping'
import type { ComparisonTestSummary } from './comparison-report-types'

function testSummary(
  scenario: ComparisonScenario,
  datasetKey: DatasetKey,
  maxDiff = 0,
  avgDiff = 0,
  maxDiffRelativeToBaselineMaxDiff = 0,
  avgDiffRelativeToBaselineAvgDiff = 0
): ComparisonTestSummary {
  return {
    s: scenario.key,
    d: datasetKey,
    md: maxDiff,
    ad: avgDiff,
    mdb: maxDiffRelativeToBaselineMaxDiff,
    adb: avgDiffRelativeToBaselineAvgDiff
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
    datasetKey,
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
    inputVars: new Map(inputVarNames.map((varName, i) => inputVar(`${i}`, varName))),
    outputVars: new Map(outputVarNames.map(varName => outputVar(varName))),
    implVars: new Map()
  }
  return {
    name,
    version: 1,
    modelSpec,
    models: [mockBundleModel(modelSpec)]
  }
}

function mockComparisonConfig(
  bundleL: LoadedBundle,
  bundleR: LoadedBundle,
  scenarios: ComparisonScenario[],
  renamedDatasetKeys?: Map<DatasetKey, DatasetKey>
): ComparisonConfig {
  const datasetOptions: ComparisonDatasetOptions = {
    renamedDatasetKeys
  }
  return {
    bundleL,
    bundleR,
    thresholds: [1, 5, 10],
    ratioThresholds: [1, 2, 3],
    scenarios: getComparisonScenarios(scenarios),
    datasets: getComparisonDatasets(bundleL.modelSpec, bundleR.modelSpec, datasetOptions),
    viewGroups: []
  }
}

describe('groupComparisonTestSummaries', () => {
  const x = 'Model_x'
  const y = 'Model_y'

  const a = inputVar('1', 'a')[1]
  const b = inputVar('2', 'b')[1]

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
    testSummary(baseline, x),
    testSummary(baseline, y),
    testSummary(aAtMin, x),
    testSummary(aAtMin, y, 20),
    testSummary(aAtMax, x),
    testSummary(aAtMax, y, 10),
    testSummary(bAtMin, x),
    testSummary(bAtMin, y, 5),
    testSummary(bAtMax, x),
    testSummary(bAtMax, y, 40),
    testSummary(bAt20, x),
    testSummary(bAt20, y)
  ]

  it('should group all test summaries by scenario', () => {
    function group(key: ComparisonScenarioKey, testSummaries: ComparisonTestSummary[]): ComparisonGroup {
      return {
        kind: 'by-scenario',
        key,
        testSummaries
      }
    }

    // group all comparisons by scenario:
    //   all inputs at default  ->  a group with 2 summaries where scenario is "baseline"
    //   input a at min         ->  a group with 2 summaries where scenario is "input A at min"
    //   input a at max         ->  ...
    //   input b at min
    //   input b at max
    //   ...
    const groups = groupComparisonTestSummaries(allSummaries, 'by-scenario')
    expect(groups.size).toBe(6)
    expect(groups.get('1')).toEqual(group('1', [testSummary(baseline, x), testSummary(baseline, y)]))
    expect(groups.get('2')).toEqual(group('2', [testSummary(aAtMin, x), testSummary(aAtMin, y, 20)]))
    expect(groups.get('3')).toEqual(group('3', [testSummary(aAtMax, x), testSummary(aAtMax, y, 10)]))
    expect(groups.get('4')).toEqual(group('4', [testSummary(bAtMin, x), testSummary(bAtMin, y, 5)]))
    expect(groups.get('5')).toEqual(group('5', [testSummary(bAtMax, x), testSummary(bAtMax, y, 40)]))
    expect(groups.get('6')).toEqual(group('6', [testSummary(bAt20, x), testSummary(bAt20, y)]))
  })

  it('should group all summaries by dataset', () => {
    function group(key: DatasetKey, testSummaries: ComparisonTestSummary[]): ComparisonGroup {
      return {
        kind: 'by-dataset',
        key,
        testSummaries
      }
    }

    // group all comparisons by dataset:
    //   output x  ->  a group with 6 summaries where dataset is "x"
    //   output y  ->  a group with 6 summaries where dataset is "y"
    const groups = groupComparisonTestSummaries(allSummaries, 'by-dataset')
    expect(groups.size).toBe(2)
    expect(groups.get('Model_x')).toEqual(
      group('Model_x', [
        testSummary(baseline, x),
        testSummary(aAtMin, x),
        testSummary(aAtMax, x),
        testSummary(bAtMin, x),
        testSummary(bAtMax, x),
        testSummary(bAt20, x)
      ])
    )
    expect(groups.get('Model_y')).toEqual(
      group('Model_y', [
        testSummary(baseline, y),
        testSummary(aAtMin, y, 20),
        testSummary(aAtMax, y, 10),
        testSummary(bAtMin, y, 5),
        testSummary(bAtMax, y, 40),
        testSummary(bAt20, y)
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

  // These inputs are all valid
  // TODO: Test added/removed/renamed inputs
  const a = inputVar('1', 'a')[1]
  const b = inputVar('2', 'b')[1]

  // These input scenarios are all valid
  const baseline = allAtPos('1', 'at-default')
  const aAtMin = scenarioWithInputVar('2', a, 'at-minimum')
  const aAtMax = scenarioWithInputVar('3', a, 'at-maximum')
  const bAtMin = scenarioWithInputVar('4', b, 'at-minimum')
  const bAtMax = scenarioWithInputVar('5', b, 'at-maximum')
  const bAt20 = scenarioWithInputVar('6', b, 20)

  // This input does not exist, so the scenario should be invalid for both sides
  const d: ComparisonResolverUnknownInputError = { kind: 'unknown-input' }
  const dAtMax = scenarioWithInput('7', 'd', 'at-maximum', d, d, undefined, undefined)

  // In this scenario, the input is valid, but the value is out of range, so the scenario should
  // be invalid for both sides
  const bInvalid: ComparisonResolverInvalidValueError = { kind: 'invalid-value' }
  const bAt666 = scenarioWithInput('8', 'b', 666, bInvalid, bInvalid, undefined, undefined)

  const scenarios = [baseline, aAtMin, aAtMax, bAtMin, bAtMax, bAt20, dAtMax, bAt666]

  const comparisonConfig = mockComparisonConfig(bundleL, bundleR, scenarios, renamedDatasetKeys)

  // For these tests, we assume:
  //   - a few output variables (x, y, z, v, w), see above
  //   - 2 input variables (a, b)
  //   - 6 valid scenarios:
  //       - all inputs at default (aka baseline)
  //       - a at {min,max}
  //       - b at {min,max}
  //       - b at 20
  //   - 2 invalid scenarios:
  //       - d at max (input is unknown for both sides)
  //       - b at 666 (value is invalid for both sides)
  const allSummaries = [
    testSummary(dAtMax, w),
    testSummary(dAtMax, x),
    testSummary(dAtMax, y),
    testSummary(dAtMax, z),
    testSummary(dAtMax, v),

    testSummary(bAt666, w),
    testSummary(bAt666, x),
    testSummary(bAt666, y),
    testSummary(bAt666, z),
    testSummary(bAt666, v),

    testSummary(baseline, w),
    testSummary(baseline, x),
    testSummary(baseline, y),
    testSummary(baseline, z),
    testSummary(baseline, v),

    // Note that we simulate maxDiff for w being less than for y to
    // verify that y is sorted ahead of w (since y has higher score)
    testSummary(aAtMin, w),
    testSummary(aAtMin, x),
    testSummary(aAtMin, y, 10),
    testSummary(aAtMin, z),
    testSummary(aAtMin, v),

    testSummary(aAtMax, w),
    testSummary(aAtMax, x),
    testSummary(aAtMax, y, 10),
    testSummary(aAtMax, z),
    testSummary(aAtMax, v),

    testSummary(bAtMin, w, 5),
    testSummary(bAtMin, x),
    testSummary(bAtMin, y, 5),
    testSummary(bAtMin, z),
    testSummary(bAtMin, v),

    testSummary(bAtMax, w),
    testSummary(bAtMax, x),
    testSummary(bAtMax, y, 40),
    testSummary(bAtMax, z),
    testSummary(bAtMax, v),

    testSummary(bAt20, w),
    testSummary(bAt20, x),
    testSummary(bAt20, y),
    testSummary(bAt20, z),
    testSummary(bAt20, v)
  ]

  it('should categorize by-scenario groups', () => {
    function groupSummary(
      scenarioKey: ComparisonScenarioKey,
      testSummaries: ComparisonTestSummary[],
      scores?: ComparisonGroupScores
    ): ComparisonGroupSummary {
      return {
        root: comparisonConfig.scenarios.getScenario(scenarioKey),
        group: {
          kind: 'by-scenario',
          key: scenarioKey,
          testSummaries
        },
        scores
      }
    }

    // Given by-scenario groups, sort comparisons for scenario:
    //   order comparisons by max diff (get percent of each bucket)
    //   put into sections (scenarios added, removed, diffs, no diffs)
    const groupsByScenario = groupComparisonTestSummaries(allSummaries, 'by-scenario')
    const groupSummaries = categorizeComparisonGroups(comparisonConfig, [...groupsByScenario.values()], 'max-diff')

    // Verify that scenarios with unknown inputs and invalid values get grouped into the "with errors" category
    expect(groupSummaries.withErrors).toEqual([
      groupSummary('7', [
        testSummary(dAtMax, w),
        testSummary(dAtMax, x),
        testSummary(dAtMax, y),
        testSummary(dAtMax, z),
        testSummary(dAtMax, v)
      ]),
      groupSummary('8', [
        testSummary(bAt666, w),
        testSummary(bAt666, x),
        testSummary(bAt666, y),
        testSummary(bAt666, z),
        testSummary(bAt666, v)
      ])
    ])

    // TODO: Test L/R-only scenarios
    expect(groupSummaries.onlyInLeft).toEqual([])
    expect(groupSummaries.onlyInRight).toEqual([])

    expect(groupSummaries.withDiffs).toEqual([
      groupSummary(
        '5',
        [
          testSummary(bAtMax, w),
          testSummary(bAtMax, x),
          testSummary(bAtMax, y, 40),
          testSummary(bAtMax, z),
          testSummary(bAtMax, v)
        ],
        {
          totalDiffCount: 5,
          totalDiffByBucket: [0, 0, 0, 0, 40, 0],
          diffCountByBucket: [4, 0, 0, 0, 1, 0],
          diffPercentByBucket: [80, 0, 0, 0, 20, 0]
        }
      ),
      groupSummary(
        '3',
        [
          testSummary(aAtMax, w),
          testSummary(aAtMax, x),
          testSummary(aAtMax, y, 10),
          testSummary(aAtMax, z),
          testSummary(aAtMax, v)
        ],
        {
          totalDiffCount: 5,
          totalDiffByBucket: [0, 0, 0, 0, 10, 0],
          diffCountByBucket: [4, 0, 0, 0, 1, 0],
          diffPercentByBucket: [80, 0, 0, 0, 20, 0]
        }
      ),
      groupSummary(
        '2',
        [
          testSummary(aAtMin, w),
          testSummary(aAtMin, x),
          testSummary(aAtMin, y, 10),
          testSummary(aAtMin, z),
          testSummary(aAtMin, v)
        ],
        {
          totalDiffCount: 5,
          totalDiffByBucket: [0, 0, 0, 0, 10, 0],
          diffCountByBucket: [4, 0, 0, 0, 1, 0],
          diffPercentByBucket: [80, 0, 0, 0, 20, 0]
        }
      ),
      groupSummary(
        '4',
        [
          testSummary(bAtMin, w, 5),
          testSummary(bAtMin, x),
          testSummary(bAtMin, y, 5),
          testSummary(bAtMin, z),
          testSummary(bAtMin, v)
        ],
        {
          totalDiffCount: 5,
          totalDiffByBucket: [0, 0, 0, 10, 0, 0],
          diffCountByBucket: [3, 0, 0, 2, 0, 0],
          diffPercentByBucket: [60, 0, 0, 40, 0, 0]
        }
      )
    ])

    expect(groupSummaries.withoutDiffs).toEqual([
      groupSummary(
        '1',
        [
          testSummary(baseline, w),
          testSummary(baseline, x),
          testSummary(baseline, y),
          testSummary(baseline, z),
          testSummary(baseline, v)
        ],
        {
          totalDiffCount: 5,
          totalDiffByBucket: [0, 0, 0, 0, 0, 0],
          diffCountByBucket: [5, 0, 0, 0, 0, 0],
          diffPercentByBucket: [100, 0, 0, 0, 0, 0]
        }
      ),
      groupSummary(
        '6',
        [
          testSummary(bAt20, w),
          testSummary(bAt20, x),
          testSummary(bAt20, y),
          testSummary(bAt20, z),
          testSummary(bAt20, v)
        ],
        {
          totalDiffCount: 5,
          totalDiffByBucket: [0, 0, 0, 0, 0, 0],
          diffCountByBucket: [5, 0, 0, 0, 0, 0],
          diffPercentByBucket: [100, 0, 0, 0, 0, 0]
        }
      )
    ])
  })

  it('should categorize by-dataset groups', () => {
    function groupSummary(
      datasetKey: DatasetKey,
      testSummaries: ComparisonTestSummary[],
      scores?: ComparisonGroupScores
    ): ComparisonGroupSummary {
      return {
        root: comparisonConfig.datasets.getDataset(datasetKey),
        group: {
          kind: 'by-dataset',
          key: datasetKey,
          testSummaries
        },
        scores
      }
    }

    // Given by-dataset groups, sort comparisons for dataset:
    //   order comparisons by max diff (get percent of each bucket)
    //   put into sections (datasets added, removed, diffs, no diffs)
    const groupsByDataset = groupComparisonTestSummaries(allSummaries, 'by-dataset')
    const groupSummaries = categorizeComparisonGroups(comparisonConfig, [...groupsByDataset.values()], 'max-diff')

    expect(groupSummaries.onlyInLeft).toEqual([
      groupSummary('Model_z', [
        testSummary(dAtMax, z),
        testSummary(bAt666, z),
        testSummary(baseline, z),
        testSummary(aAtMin, z),
        testSummary(aAtMax, z),
        testSummary(bAtMin, z),
        testSummary(bAtMax, z),
        testSummary(bAt20, z)
      ])
    ])

    expect(groupSummaries.onlyInRight).toEqual([
      groupSummary('Model_v', [
        testSummary(dAtMax, v),
        testSummary(bAt666, v),
        testSummary(baseline, v),
        testSummary(aAtMin, v),
        testSummary(aAtMax, v),
        testSummary(bAtMin, v),
        testSummary(bAtMax, v),
        testSummary(bAt20, v)
      ])
    ])

    expect(groupSummaries.withDiffs).toEqual([
      groupSummary(
        'Model_y',
        [
          testSummary(dAtMax, y),
          testSummary(bAt666, y),
          testSummary(baseline, y),
          testSummary(aAtMin, y, 10),
          testSummary(aAtMax, y, 10),
          testSummary(bAtMin, y, 5),
          testSummary(bAtMax, y, 40),
          testSummary(bAt20, y)
        ],
        {
          totalDiffCount: 8,
          totalDiffByBucket: [0, 0, 0, 5, 60, 0],
          diffCountByBucket: [4, 0, 0, 1, 3, 0],
          diffPercentByBucket: [50, 0, 0, 12.5, 37.5, 0]
        }
      ),
      groupSummary(
        'Model_w',
        [
          testSummary(dAtMax, w),
          testSummary(bAt666, w),
          testSummary(baseline, w),
          testSummary(aAtMin, w),
          testSummary(aAtMax, w),
          testSummary(bAtMin, w, 5),
          testSummary(bAtMax, w),
          testSummary(bAt20, w)
        ],
        {
          totalDiffCount: 8,
          totalDiffByBucket: [0, 0, 0, 5, 0, 0],
          diffCountByBucket: [7, 0, 0, 1, 0, 0],
          diffPercentByBucket: [87.5, 0, 0, 12.5, 0, 0]
        }
      )
    ])

    expect(groupSummaries.withoutDiffs).toEqual([
      groupSummary(
        'Model_x',
        [
          testSummary(dAtMax, x),
          testSummary(bAt666, x),
          testSummary(baseline, x),
          testSummary(aAtMin, x),
          testSummary(aAtMax, x),
          testSummary(bAtMin, x),
          testSummary(bAtMax, x),
          testSummary(bAt20, x)
        ],
        {
          totalDiffCount: 8,
          totalDiffByBucket: [0, 0, 0, 0, 0, 0],
          diffCountByBucket: [8, 0, 0, 0, 0, 0],
          diffPercentByBucket: [100, 0, 0, 0, 0, 0]
        }
      )
    ])
  })
})

describe('categorizeComparisonTestSummaries', () => {
  const inputVarNames = ['a']
  const bundleL = mockBundle('L', inputVarNames, ['x'])
  const bundleR = mockBundle('R', inputVarNames, ['x'])

  const a = inputVar('1', 'a')[1]
  const baseline = allAtPos('baseline', 'at-default', { title: 'Baseline', subtitle: 'at default' })
  const scenario1 = scenarioWithInputVar('s1', a, 'at-minimum')
  const scenario2 = scenarioWithInputVar('s2', a, 'at-maximum')
  const scenario3 = scenarioWithInputVar('s3', a, 25)

  const x = 'Model_x'

  // Create test data with baseline diffs and relative diffs
  // baseline: md=1%, ad=0.8%, mdb=1, adb=1 (the relative values are special for the baseline scenario)
  // scenario1: md=10%, ad=8%, mdb=10, adb=10
  // scenario2: md=5%, ad=4%, mdb=5, adb=5
  // scenario3: md=2%, ad=1.5%, mdb=2, adb=1.875
  const summaries: ComparisonTestSummary[] = [
    testSummary(baseline, x, 1.0, 0.8, 1.0, 1.0),
    testSummary(scenario1, x, 10.0, 8.0, 10.0, 10.0),
    testSummary(scenario2, x, 5.0, 4.0, 5.0, 5.0),
    testSummary(scenario3, x, 2.0, 1.5, 2.0, 1.875)
  ]

  const scenarios = [baseline, scenario1, scenario2, scenario3]
  const comparisonConfig = mockComparisonConfig(bundleL, bundleR, scenarios)

  it('should sort by max-diff with highest values first', () => {
    const result = categorizeComparisonTestSummaries(comparisonConfig, summaries, 'max-diff')

    // Expected order: scenario1 (10%), scenario2 (5%), scenario3 (2%), baseline (1%)
    expect(result.byScenario.withDiffs.length).toBe(4)
    expect(result.byScenario.withDiffs[0].group.testSummaries[0].md).toBe(10.0)
    expect(result.byScenario.withDiffs[1].group.testSummaries[0].md).toBe(5.0)
    expect(result.byScenario.withDiffs[2].group.testSummaries[0].md).toBe(2.0)
    expect(result.byScenario.withDiffs[3].group.testSummaries[0].md).toBe(1.0)
  })

  it('should sort by avg-diff with highest values first', () => {
    const result = categorizeComparisonTestSummaries(comparisonConfig, summaries, 'avg-diff')

    // Expected order: scenario1 (8%), scenario2 (4%), scenario3 (1.5%), baseline (0.8%)
    expect(result.byScenario.withDiffs.length).toBe(4)
    expect(result.byScenario.withDiffs[0].group.testSummaries[0].ad).toBe(8.0)
    expect(result.byScenario.withDiffs[1].group.testSummaries[0].ad).toBe(4.0)
    expect(result.byScenario.withDiffs[2].group.testSummaries[0].ad).toBe(1.5)
    expect(result.byScenario.withDiffs[3].group.testSummaries[0].ad).toBe(0.8)
  })

  it('should sort by max-diff-relative with highest values first', () => {
    const result = categorizeComparisonTestSummaries(comparisonConfig, summaries, 'max-diff-relative')

    // Expected order: scenario1 (10), scenario2 (5), scenario3 (2), baseline (1)
    expect(result.byScenario.withDiffs.length).toBe(4)
    expect(result.byScenario.withDiffs[0].group.testSummaries[0].mdb).toBe(10.0)
    expect(result.byScenario.withDiffs[1].group.testSummaries[0].mdb).toBe(5.0)
    expect(result.byScenario.withDiffs[2].group.testSummaries[0].mdb).toBe(2.0)
    expect(result.byScenario.withDiffs[3].group.testSummaries[0].mdb).toBe(1.0)
  })

  it('should sort by avg-diff-relative with highest values first', () => {
    const result = categorizeComparisonTestSummaries(comparisonConfig, summaries, 'avg-diff-relative')

    // Expected order: scenario1 (10), scenario2 (5), scenario3 (1.875), baseline (1)
    expect(result.byScenario.withDiffs.length).toBe(4)
    expect(result.byScenario.withDiffs[0].group.testSummaries[0].adb).toBe(10.0)
    expect(result.byScenario.withDiffs[1].group.testSummaries[0].adb).toBe(5.0)
    expect(result.byScenario.withDiffs[2].group.testSummaries[0].adb).toBe(1.875)
    expect(result.byScenario.withDiffs[3].group.testSummaries[0].adb).toBe(1.0)
  })
})
