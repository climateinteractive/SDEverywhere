// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { DatasetKey } from '../_shared/types'
import type { BundleModel, LoadedBundle, ModelSpec } from '../bundle/bundle-types'
import type { OutputVar } from '../bundle/var-types'

import type { CheckConfig } from '../check/check-config'
import type { CheckReport } from '../check/check-report'
import {
  datasetReport,
  groupReport,
  opConstantRef,
  predicateReport,
  scenarioReport,
  testReport
} from '../check/_mocks/mock-check-report'
import { allAtPos as checkAllAtPos } from '../check/_mocks/mock-check-scenario'

import type { ComparisonScenario } from '../comparison/_shared/comparison-resolved-types'
import { allAtPos, inputVar, scenarioWithInputVar } from '../comparison/_shared/_mocks/mock-resolved-types'
import type { ComparisonConfig } from '../comparison/config/comparison-config'
import { getComparisonDatasets } from '../comparison/config/comparison-datasets'
import { getComparisonScenarios } from '../comparison/config/comparison-scenarios'
import type { DiffReport } from '../comparison/diff-datasets/diff-datasets'
import type { ComparisonTestReport } from '../comparison/report/comparison-report-types'

import type { Config } from '../config/config-types'
import type { PerfReport } from '../perf/perf-stats'

import type { SuiteReport } from './suite-report-types'
import { exportSuiteReport, formatSuiteExportAsMarkdown } from './suite-export'

//
// Test fixtures
//

function outputVar(varName: string, source?: string): [DatasetKey, OutputVar] {
  const varId = `_${varName.toLowerCase().replace(/\s/g, '_')}`
  const datasetKey = `${source || 'Model'}${varId}`
  return [datasetKey, { datasetKey, sourceName: source, varId, varName }]
}

function mockBundleModel(modelSpec: ModelSpec): BundleModel {
  return {
    modelSpec,
    getDatasetsForScenario: async () => ({ datasetMap: new Map() })
  }
}

function mockBundle(
  name: string,
  modelSizeInBytes: number,
  inputVarNames: string[],
  outputVarNames: string[]
): LoadedBundle {
  const modelSpec: ModelSpec = {
    modelSizeInBytes,
    dataSizeInBytes: 100,
    inputVars: new Map(inputVarNames.map((varName, i) => inputVar(`${i + 1}`, varName))),
    outputVars: new Map(outputVarNames.map(varName => outputVar(varName))),
    implVars: new Map()
  }
  return { name, version: 1, modelSpec, models: [mockBundleModel(modelSpec)] }
}

function perf(avgTime: number, minTime: number, maxTime: number): PerfReport {
  return { avgTime, minTime, maxTime, medianTime: avgTime, p95Time: maxTime, stdDev: 0, allTimes: [] }
}

function diff(maxDiff: number, avgDiff: number, time: number, valueL: number, valueR: number): DiffReport {
  return {
    validity: 'both',
    minValue: Math.min(valueL, valueR),
    maxValue: Math.max(valueL, valueR),
    avgDiff,
    minDiff: 0,
    maxDiff,
    maxDiffPoint: { time, valueL, valueR }
  }
}

function noDiff(): DiffReport {
  return diff(0, 0, 2000, 1, 1)
}

function testRpt(scenario: ComparisonScenario, datasetKey: DatasetKey, diffReport: DiffReport): ComparisonTestReport {
  return { scenarioKey: scenario.key, datasetKey, diffReport }
}

const bundleL = mockBundle('develop', 1000, ['Input A'], ['Temperature', 'Emissions', 'Old output'])
const bundleR = mockBundle('my-branch', 900, ['Input A'], ['Temperature', 'Emissions', 'New output'])
const a = [...bundleR.modelSpec.inputVars.values()][0]

const baseline = allAtPos('1', 'at-default', { title: 'All inputs', subtitle: 'at default' })
const aAtMax = scenarioWithInputVar('2', a, 'at-maximum')

const temp = 'Model_temperature'
const emis = 'Model_emissions'
const oldOut = 'Model_old_output'
const newOut = 'Model_new_output'

const comparisonConfig: ComparisonConfig = {
  bundleL,
  bundleR,
  thresholds: [1, 5, 10],
  ratioThresholds: [1, 2, 3],
  scenarios: getComparisonScenarios([baseline, aAtMax]),
  datasets: getComparisonDatasets(bundleL.modelSpec, bundleR.modelSpec, undefined),
  viewGroups: []
}

const checkConfig = {} as CheckConfig

const checkReport: CheckReport = {
  groups: [
    groupReport('Temperature', [
      testReport('should be positive', 'passed', [
        scenarioReport(checkAllAtPos('at-default'), 'passed', [
          datasetReport('Model', 'Temperature', 'passed', [predicateReport(1, [['gt', opConstantRef(0)]], ['> 0'])])
        ])
      ])
    ]),
    groupReport('Emissions', [
      testReport('should be below 50', 'failed', [
        scenarioReport(checkAllAtPos('at-default'), 'failed', [
          datasetReport('Model', 'Emissions', 'failed', [
            predicateReport(2, [['lt', opConstantRef(50)]], ['< 50'], {
              status: 'failed',
              failOp: 'lt',
              failValue: 61.5,
              failRefValue: 50,
              failTime: 2030
            })
          ])
        ])
      ])
    ])
  ]
}

const comparisonReport = {
  testReports: [
    // Baseline: temperature drops slightly, emissions unchanged
    testRpt(baseline, temp, diff(1.71, 0.37, 2100, 3.3361, 3.2752)),
    testRpt(baseline, emis, noDiff()),
    // Input A at max: emissions rise a lot, temperature rises a little
    testRpt(aAtMax, temp, diff(0.5, 0.1, 2080, 2.0, 2.01)),
    testRpt(aAtMax, emis, diff(22.95, 7.46, 2036, 8.0515, 10.0611)),
    // Removed and added outputs
    {
      scenarioKey: baseline.key,
      datasetKey: oldOut,
      diffReport: { ...noDiff(), validity: 'left-only' as const }
    },
    {
      scenarioKey: baseline.key,
      datasetKey: newOut,
      diffReport: { ...noDiff(), validity: 'right-only' as const }
    }
  ],
  perfReportL: perf(73.3, 72.6, 99.6),
  perfReportR: perf(45.1, 41.2, 99.1)
}

const config: Config = { check: checkConfig, comparison: comparisonConfig }
const suiteReport: SuiteReport = { checkReport, comparisonReport }
const exportOptions = { date: '2026-10-28T18:15:00.000Z', elapsedMillis: 8500 }

//
// Tests
//

describe('exportSuiteReport', () => {
  const exp = exportSuiteReport(config, suiteReport, exportOptions)

  it('should include the schema version, date, and elapsed time', () => {
    expect(exp.schemaVersion).toBe(1)
    expect(exp.date).toBe('2026-10-28T18:15:00.000Z')
    expect(exp.elapsedMillis).toBe(8500)
  })

  it('should explain how to interpret the diff values', () => {
    expect(exp.notes.join(' ')).toMatch(/percentage of the combined value range/)
  })

  it('should count check tests by status and flatten failures with fail values', () => {
    expect(exp.checks.counts).toEqual({ total: 2, passed: 1, failed: 1, error: 0, skipped: 0 })
    expect(exp.checks.tests).toEqual([
      { group: 'Temperature', name: 'should be positive', status: 'passed' },
      { group: 'Emissions', name: 'should be below 50', status: 'failed' }
    ])
    expect(exp.checks.failures).toEqual([
      {
        group: 'Emissions',
        test: 'should be below 50',
        status: 'failed',
        scenario: 'when all inputs are at default...',
        dataset: 'then Emissions...',
        predicate: 'should be < 50 but got 61.5 (expected < 50) in 2030',
        failValue: 61.5,
        failRefValue: 50,
        failTime: 2030
      }
    ])
  })

  it('should include the bundle metadata and perf stats', () => {
    const c = exp.comparison
    expect(c.bundleL).toEqual({ name: 'develop', modelSizeInBytes: 1000, dataSizeInBytes: 100, inputs: 1, outputs: 3 })
    expect(c.bundleR).toEqual({ name: 'my-branch', modelSizeInBytes: 900, dataSizeInBytes: 100, inputs: 1, outputs: 3 })
    expect(c.perfL).toEqual({ avgTime: 73.3, minTime: 72.6, maxTime: 99.6 })
    expect(c.perfR).toEqual({ avgTime: 45.1, minTime: 41.2, maxTime: 99.1 })
    expect(c.thresholds).toEqual([1, 5, 10])
  })

  it('should include counts of tests, scenarios, and datasets with diffs', () => {
    expect(exp.comparison.counts).toEqual({
      tests: 6,
      testsWithDiffs: 5,
      scenarios: 2,
      scenariosWithDiffs: 2,
      datasets: 4,
      datasetsWithDiffs: 4
    })
  })

  it('should list only diffs that changed, with resolved names and signed change, sorted by max diff', () => {
    const diffs = exp.comparison.diffs
    expect(diffs.map(d => [d.scenario, d.dataset])).toEqual([
      ['Input A at maximum', 'Emissions'],
      ['All inputs at default', 'Temperature'],
      ['Input A at maximum', 'Temperature'],
      ['All inputs at default', 'New output'],
      ['All inputs at default', 'Old output']
    ])
    expect(diffs[0]).toEqual({
      scenarioKey: '2',
      scenario: 'Input A at maximum',
      baseline: false,
      datasetKey: emis,
      dataset: 'Emissions',
      validity: 'both',
      maxDiff: 22.95,
      avgDiff: 7.46,
      minDiff: 0,
      bucket: 4,
      maxDiffPoint: { time: 2036, valueL: 8.0515, valueR: 10.0611, change: 2.0096 }
    })
    expect(diffs[1].baseline).toBe(true)
    expect(diffs[1].maxDiffPoint.change).toBeCloseTo(-0.0609, 6)
    expect(diffs[3].validity).toBe('right-only')
    expect(diffs[4].validity).toBe('left-only')
  })

  it('should summarize each dataset with diffs, including its baseline diff', () => {
    expect(exp.comparison.datasets).toEqual([
      {
        datasetKey: emis,
        dataset: 'Emissions',
        maxDiff: 22.95,
        scenariosWithDiffs: 1,
        worstScenario: 'Input A at maximum',
        baselineMaxDiff: 0
      },
      {
        datasetKey: temp,
        dataset: 'Temperature',
        maxDiff: 1.71,
        scenariosWithDiffs: 2,
        worstScenario: 'All inputs at default',
        baselineMaxDiff: 1.71
      },
      {
        datasetKey: newOut,
        dataset: 'New output',
        maxDiff: 0,
        scenariosWithDiffs: 1,
        worstScenario: 'All inputs at default',
        baselineMaxDiff: 0,
        validity: 'right-only'
      },
      {
        datasetKey: oldOut,
        dataset: 'Old output',
        maxDiff: 0,
        scenariosWithDiffs: 1,
        worstScenario: 'All inputs at default',
        baselineMaxDiff: 0,
        validity: 'left-only'
      }
    ])
  })

  it('should summarize each scenario with diffs, including its input settings', () => {
    expect(exp.comparison.scenarios).toEqual([
      {
        scenarioKey: '2',
        scenario: 'Input A at maximum',
        inputs: 'Input A at maximum (100)',
        maxDiff: 22.95,
        datasetsWithDiffs: 2,
        worstDataset: 'Emissions'
      },
      {
        scenarioKey: '1',
        scenario: 'All inputs at default',
        inputs: 'all inputs at default',
        maxDiff: 1.71,
        datasetsWithDiffs: 3,
        worstDataset: 'Temperature'
      }
    ])
  })

  it('should omit the comparison section when comparisons were not run', () => {
    const checksOnly = exportSuiteReport({ check: checkConfig }, { checkReport }, exportOptions)
    expect(checksOnly.comparison).toBeUndefined()
    expect(checksOnly.checks.counts.total).toBe(2)
  })
})

describe('formatSuiteExportAsMarkdown', () => {
  const exp = exportSuiteReport(config, suiteReport, exportOptions)

  it('should include a header with the compared bundles', () => {
    const md = formatSuiteExportAsMarkdown(exp)
    expect(md).toMatch(/^# Model check report\n/)
    expect(md).toContain('Comparing `develop` (left, baseline) to `my-branch` (right, current).')
  })

  it('should summarize checks and list each failure with its message', () => {
    const md = formatSuiteExportAsMarkdown(exp)
    expect(md).toContain('## Checks')
    expect(md).toContain('2 tests: 1 passed, 1 failed, 0 errors, 0 skipped.')
    expect(md).toContain(
      '- **Emissions > should be below 50** (failed): when all inputs are at default... then Emissions...' +
        ' should be < 50 but got 61.5 (expected < 50) in 2030'
    )
  })

  it('should include a performance table with the change', () => {
    const md = formatSuiteExportAsMarkdown(exp)
    expect(md).toContain('## Performance')
    expect(md).toContain('| develop | 1000 | 100 | 73.3 | 72.6 | 99.6 |')
    expect(md).toContain('| my-branch | 900 | 100 | 45.1 | 41.2 | 99.1 |')
  })

  it('should include the baseline scenario diffs with values and direction', () => {
    const md = formatSuiteExportAsMarkdown(exp)
    expect(md).toContain('## Baseline scenario (all inputs at default)')
    expect(md).toContain('| Temperature | 1.71% | 0.37% | 2100 | 3.3361 | 3.2752 | down |')
    expect(md).toContain('| New output | – | – | – | – | – | added |')
    expect(md).toContain('| Old output | – | – | – | – | – | removed |')
  })

  it('should include the dataset and scenario summary tables', () => {
    const md = formatSuiteExportAsMarkdown(exp)
    expect(md).toContain('## Datasets with differences')
    expect(md).toContain('| Emissions | 22.95% | 1 | Input A at maximum |')
    expect(md).toContain('## Scenarios with differences')
    expect(md).toContain('| Input A at maximum | 2 | 22.95% | Emissions |')
  })

  it('should truncate long tables and point to the JSON file', () => {
    const md = formatSuiteExportAsMarkdown(exp, { maxRows: 1 })
    expect(md).toContain('| Emissions | 22.95% | 1 | Input A at maximum |')
    expect(md).not.toContain('| Temperature | 1.71% | 2 |')
    expect(md).toContain('Showing 1 of 4 datasets; see `report.json` for the full list.')
  })
})
