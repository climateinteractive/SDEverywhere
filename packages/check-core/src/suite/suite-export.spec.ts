// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { DatasetKey } from '../_shared/types'
import type { BundleGraphSpec, BundleModel, LoadedBundle, ModelSpec } from '../bundle/bundle-types'
import type { OutputVar, SliderInputVar } from '../bundle/var-types'

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
import type { SuiteExport } from './suite-export'
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

  it('should explain how to look up scenario and dataset names', () => {
    expect(exp.notes.join(' ')).toMatch(/look up .* in `scenarios` and `datasets`/)
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

  it('should list only diffs that changed, referring to scenarios and datasets by key, sorted by max diff', () => {
    const diffs = exp.comparison.diffs
    expect(diffs.map(d => [d.scenarioKey, d.datasetKey])).toEqual([
      ['2', emis],
      ['1', temp],
      ['2', temp],
      ['1', newOut],
      ['1', oldOut]
    ])
    expect(diffs[0]).toEqual({
      scenarioKey: '2',
      datasetKey: emis,
      maxDiff: 22.95,
      avgDiff: 7.46,
      minDiff: 0,
      bucket: 4,
      maxDiffPoint: { time: 2036, valueL: 8.0515, valueR: 10.0611, change: 2.0096 }
    })
    expect(diffs[1].maxDiffPoint.change).toBe(-0.0609)
    expect(diffs[3].validity).toBe('right-only')
    expect(diffs[4].validity).toBe('left-only')
  })

  it('should include the key of the baseline scenario', () => {
    expect(exp.comparison.baselineScenarioKey).toBe('1')
  })

  it('should round diff values to 6 significant digits', () => {
    const noisyReport: SuiteReport = {
      checkReport,
      comparisonReport: {
        ...comparisonReport,
        testReports: [
          testRpt(
            aAtMax,
            temp,
            diff(50.448037676699734, 8.659383992928626, 2036, 0.5466984274204733, 0.28177259617798744)
          )
        ]
      }
    }
    const c = exportSuiteReport(config, noisyReport, exportOptions).comparison
    expect(c.diffs[0]).toEqual({
      scenarioKey: '2',
      datasetKey: temp,
      maxDiff: 50.448,
      avgDiff: 8.65938,
      minDiff: 0,
      bucket: 4,
      maxDiffPoint: { time: 2036, valueL: 0.546698, valueR: 0.281773, change: -0.264926 }
    })
    expect(c.datasets[0].maxDiff).toBe(50.448)
    expect(c.scenarios[0].maxDiff).toBe(50.448)
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

  it('should list the inputs and outputs that were added or removed, and the inputs whose settings changed', () => {
    const l = mockBundle('develop', 1000, ['Input A', 'Input B', 'Old input'], ['Temperature', 'Old output'])
    const r = mockBundle('my-branch', 1000, ['Input A', 'Input B', 'New input'], ['Temperature', 'New output'])
    const [varIdB, inputB] = [...r.modelSpec.inputVars.entries()].find(([, v]) => v.varName === 'Input B')
    r.modelSpec.inputVars.set(varIdB, { ...(inputB as SliderInputVar), defaultValue: 60, maxValue: 200 })
    const c = exportSuiteReport(
      { check: checkConfig, comparison: { ...comparisonConfig, bundleL: l, bundleR: r } },
      { checkReport, comparisonReport: { ...comparisonReport, testReports: [] } },
      exportOptions
    ).comparison
    expect(c.inputs).toEqual({
      added: ['New input'],
      removed: ['Old input'],
      changed: [
        {
          input: 'Input B',
          changes: [
            { field: 'defaultValue', valueL: 50, valueR: 60 },
            { field: 'maxValue', valueL: 100, valueR: 200 }
          ]
        }
      ]
    })
    expect(c.outputs).toEqual({ added: ['New output'], removed: ['Old output'] })
  })

  it('should have empty lists of input and output changes when the model specs match', () => {
    const same = mockBundle('develop', 1000, ['Input A'], ['Temperature'])
    const c = exportSuiteReport(
      { check: checkConfig, comparison: { ...comparisonConfig, bundleL: same, bundleR: same } },
      { checkReport, comparisonReport: { ...comparisonReport, testReports: [] } },
      exportOptions
    ).comparison
    expect(c.inputs).toEqual({ added: [], removed: [], changed: [] })
    expect(c.outputs).toEqual({ added: [], removed: [] })
  })

  it('should summarize the graphs that were added, removed, or changed (in their metadata or data)', () => {
    const graph = (id: string, title: string, datasetKey: DatasetKey, metadata: [string, string][] = []) => {
      const spec: BundleGraphSpec = {
        id,
        title,
        legendItems: [],
        datasets: [{ datasetKey, varName: title, color: 'red' }],
        metadata: new Map(metadata)
      }
      return spec
    }
    const l = mockBundle('develop', 1000, ['Input A'], ['Temperature', 'Emissions', 'Old output'])
    const r = mockBundle('my-branch', 1000, ['Input A'], ['Temperature', 'Emissions', 'New output'])
    l.modelSpec.graphSpecs = [
      graph('1', 'Temperature', temp, [['units', 'C']]),
      graph('2', 'Emissions', emis),
      graph('3', 'Old graph', oldOut),
      graph('4', 'Unchanged', 'Model_other', [['units', 'm']])
    ]
    r.modelSpec.graphSpecs = [
      graph('1', 'Temperature', temp, [['units', 'K']]),
      graph('2', 'Emissions', emis),
      graph('4', 'Unchanged', 'Model_other', [['units', 'm']]),
      graph('5', 'New graph', newOut)
    ]
    const c = exportSuiteReport(
      { check: checkConfig, comparison: { ...comparisonConfig, bundleL: l, bundleR: r } },
      suiteReport,
      exportOptions
    ).comparison
    // (a graph's max diff is the largest diff of its datasets in any scenario)
    expect(c.graphs).toEqual({
      counts: { total: 5, added: 1, removed: 1, metadataChanged: 1, datasetsChanged: 2 },
      changes: [
        {
          graphId: '1',
          title: 'Temperature',
          metadata: [{ key: 'units', valueL: 'C', valueR: 'K' }],
          maxDiff: 1.71
        },
        { graphId: '2', title: 'Emissions', maxDiff: 22.95 },
        { graphId: '5', title: 'New graph', inclusion: 'right-only' },
        { graphId: '3', title: 'Old graph', inclusion: 'left-only' }
      ]
    })
  })

  it('should have no graph changes when the bundles have no graphs', () => {
    expect(exp.comparison.graphs).toEqual({
      counts: { total: 0, added: 0, removed: 0, metadataChanged: 0, datasetsChanged: 0 },
      changes: []
    })
  })

  describe('status', () => {
    const passedCheckReport: CheckReport = { groups: [checkReport.groups[0]] }
    const sameTestReports = comparisonReport.testReports.slice(0, 2).map(t => ({ ...t, diffReport: noDiff() }))
    const same = mockBundle('develop', 1000, ['Input A'], ['Temperature', 'Emissions'])
    const sameConfig: Config = { check: checkConfig, comparison: { ...comparisonConfig, bundleL: same, bundleR: same } }
    const sameReport: SuiteReport = {
      checkReport: passedCheckReport,
      comparisonReport: { ...comparisonReport, testReports: sameTestReports }
    }

    it('should say whether checks failed and whether the comparisons found differences', () => {
      expect(exp.status).toEqual({ checks: 'failed', comparison: 'changed', differencesFound: true })
    })

    it('should say that nothing changed when the checks passed and the comparisons found no differences', () => {
      expect(exportSuiteReport(sameConfig, sameReport, exportOptions).status).toEqual({
        checks: 'passed',
        comparison: 'same',
        differencesFound: false
      })
    })

    it('should count a change to a graph or an input as a difference, even if no datasets differ', () => {
      const graph = (units: string): BundleGraphSpec => ({
        id: '1',
        title: 'Temperature',
        legendItems: [],
        datasets: [],
        metadata: new Map([['units', units]])
      })
      const l = mockBundle('develop', 1000, ['Input A'], ['Temperature', 'Emissions'])
      const r = mockBundle('my-branch', 1000, ['Input A'], ['Temperature', 'Emissions'])
      l.modelSpec.graphSpecs = [graph('C')]
      r.modelSpec.graphSpecs = [graph('K')]
      const graphConfig: Config = { check: checkConfig, comparison: { ...comparisonConfig, bundleL: l, bundleR: r } }
      expect(exportSuiteReport(graphConfig, sameReport, exportOptions).status.comparison).toBe('changed')

      const i = mockBundle('my-branch', 1000, ['Input A'], ['Temperature', 'Emissions'])
      const [varIdA, inputA] = [...i.modelSpec.inputVars.entries()][0]
      i.modelSpec.inputVars.set(varIdA, { ...(inputA as SliderInputVar), maxValue: 200 })
      const inputConfig: Config = { check: checkConfig, comparison: { ...comparisonConfig, bundleL: same, bundleR: i } }
      expect(exportSuiteReport(inputConfig, sameReport, exportOptions).status.comparison).toBe('changed')
    })

    it('should say that the comparisons were skipped when every comparison test was skipped', () => {
      const skippedReport: SuiteReport = {
        checkReport: passedCheckReport,
        comparisonReport: {
          ...comparisonReport,
          testReports: sameTestReports.map(t => ({ ...t, diffReport: undefined }))
        }
      }
      expect(exportSuiteReport(sameConfig, skippedReport, exportOptions).status).toEqual({
        checks: 'passed',
        comparison: 'skipped',
        differencesFound: false
      })
    })

    it('should say "none" when there are no checks or comparisons', () => {
      expect(exportSuiteReport({ check: checkConfig }, { checkReport: { groups: [] } }, exportOptions).status).toEqual({
        checks: 'none',
        comparison: 'none',
        differencesFound: false
      })
    })
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

  it('should include the overall status', () => {
    const md = formatSuiteExportAsMarkdown(exp)
    expect(md).toContain('**Status:** checks failed, differences found.')
    const same = { ...exp, status: { checks: 'passed', comparison: 'same', differencesFound: false } as const }
    expect(formatSuiteExportAsMarkdown(same)).toContain('**Status:** checks passed, no differences.')
  })

  it('should list the inputs and outputs that were added, removed, or changed', () => {
    const changed = {
      ...exp,
      comparison: {
        ...exp.comparison,
        inputs: {
          added: ['New input'],
          removed: ['Old input', 'Other input'],
          changed: [{ input: 'Input B', changes: [{ field: 'maxValue', valueL: 100, valueR: 200 }] }]
        }
      }
    }
    const md = formatSuiteExportAsMarkdown(changed)
    expect(md).toContain('## Inputs and outputs')
    expect(md).toContain('- Added inputs: `New input`')
    expect(md).toContain('- Removed inputs: `Old input`, `Other input`')
    expect(md).toContain('- Added outputs: `New output`')
    expect(md).toContain('- Removed outputs: `Old output`')
    expect(md).toContain('| Input | Setting | Left | Right |')
    expect(md).toContain('| Input B | maxValue | 100 | 200 |')
  })

  it('should say so when no inputs or outputs changed', () => {
    const none: SuiteExport = {
      ...exp,
      comparison: {
        ...exp.comparison,
        inputs: { added: [], removed: [], changed: [] },
        outputs: { added: [], removed: [] }
      }
    }
    expect(formatSuiteExportAsMarkdown(none)).toContain('No inputs or outputs were added, removed, or changed.')
  })

  it('should summarize the graphs that were added, removed, or changed', () => {
    const changed = {
      ...exp,
      comparison: {
        ...exp.comparison,
        graphs: {
          counts: { total: 5, added: 1, removed: 1, metadataChanged: 1, datasetsChanged: 2 },
          changes: [
            {
              graphId: '1',
              title: 'Temperature',
              metadata: [{ key: 'units', valueL: 'C', valueR: 'K|F' }],
              maxDiff: 1.71
            },
            { graphId: '2', title: 'Emissions', maxDiff: 22.95 },
            { graphId: '5', title: 'New graph', inclusion: 'right-only' as const },
            { graphId: '3', title: 'Old graph', inclusion: 'left-only' as const }
          ]
        }
      }
    }
    const md = formatSuiteExportAsMarkdown(changed)
    expect(md).toContain('## Graphs')
    expect(md).toContain('4 of 5 graphs changed: 1 added, 1 removed, 1 with metadata changes, 2 with dataset changes.')
    expect(md).toContain('| Graph | Change | Max diff |')
    // (the pipes in values are escaped, so that they don't break the table)
    expect(md).toContain('| 1: Temperature | metadata (units: C → K\\|F), datasets | 1.71% |')
    expect(md).toContain('| 2: Emissions | datasets | 22.95% |')
    expect(md).toContain('| 5: New graph | added | – |')
    expect(md).toContain('| 3: Old graph | removed | – |')
    expect(formatSuiteExportAsMarkdown(exp)).toContain('No graphs changed.')
  })

  it('should truncate long tables and point to the JSON file', () => {
    const md = formatSuiteExportAsMarkdown(exp, { maxRows: 1 })
    expect(md).toContain('| Emissions | 22.95% | 1 | Input A at maximum |')
    expect(md).not.toContain('| Temperature | 1.71% | 2 |')
    expect(md).toContain('Showing 1 of 4 datasets; see `report.json` for the full list.')
  })
})
