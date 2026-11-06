// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { CheckReport, CheckStatus } from '../check/check-report'
import { datasetMessage, predicateMessage, scenarioMessage } from '../check/check-report'
import type { ComparisonScenario } from '../comparison/_shared/comparison-resolved-types'
import type { ComparisonConfig } from '../comparison/config/comparison-config'
import type { DiffValidity } from '../comparison/diff-datasets/diff-datasets'
import type { ComparisonReport } from '../comparison/report/comparison-report-types'
import { getBucketIndex } from '../comparison/report/buckets'
import type { Config } from '../config/config-types'
import type { PerfReport } from '../perf/perf-stats'

import type { SuiteReport } from './suite-report-types'

/**
 * Options for `exportSuiteReport`.
 */
export interface SuiteExportOptions {
  /** The date and time the suite was run (in ISO 8601 format); defaults to now. */
  date?: string
  /** The time in milliseconds that it took to run the suite. */
  elapsedMillis?: number
}

/**
 * Options for `formatSuiteExportAsMarkdown`.
 */
export interface SuiteExportMarkdownOptions {
  /** The maximum number of rows to include in each table (defaults to 50). */
  maxRows?: number
}

/** The number of check tests with each status. */
export interface ExportedCheckCounts {
  /** The total number of check tests. */
  total: number
  /** The number of tests that passed. */
  passed: number
  /** The number of tests that failed. */
  failed: number
  /** The number of tests that had an error. */
  error: number
  /** The number of tests that were skipped. */
  skipped: number
}

/** The status of a single check test. */
export interface ExportedCheckTest {
  /** The name of the group that contains the test. */
  group: string
  /** The name of the test. */
  name: string
  /** The status of the test. */
  status: CheckStatus
}

/** A single failed or errored check predicate, with plain-text messages. */
export interface ExportedCheckFailure {
  /** The name of the group that contains the test. */
  group: string
  /** The name of the test. */
  test: string
  /** The status of the predicate. */
  status: CheckStatus
  /** The description of the scenario (for example, "when all inputs are at default..."). */
  scenario: string
  /** The description of the dataset (for example, "then Temperature..."). */
  dataset: string
  /** The description of the predicate (for example, "should be > 0"). */
  predicate: string
  /** The value that caused the check to fail, if available. */
  failValue?: number
  /** The reference value that the failing value was compared to, if available. */
  failRefValue?: number
  /** The time at which the check failed, if available. */
  failTime?: number
}

/** The exported check results. */
export interface ExportedChecks {
  /** The number of check tests with each status. */
  counts: ExportedCheckCounts
  /** The status of every check test. */
  tests: ExportedCheckTest[]
  /** Every failed or errored check predicate. */
  failures: ExportedCheckFailure[]
}

/** Metadata for one of the bundles being compared. */
export interface ExportedBundle {
  /** The name of the bundle. */
  name: string
  /** The size of the generated model, in bytes. */
  modelSizeInBytes: number
  /** The size of the model data, in bytes. */
  dataSizeInBytes: number
  /** The number of input variables. */
  inputs: number
  /** The number of output variables. */
  outputs: number
}

/** The run time statistics for one of the bundles being compared. */
export interface ExportedPerf {
  /** The average (trimmed mean) run time, in milliseconds. */
  avgTime: number
  /** The minimum run time, in milliseconds. */
  minTime: number
  /** The maximum run time, in milliseconds. */
  maxTime: number
}

/** The point in time at which the largest difference occurred. */
export interface ExportedDiffPoint {
  /** The time of the largest difference. */
  time: number
  /** The value in the left ("baseline") model. */
  valueL: number
  /** The value in the right ("current") model. */
  valueR: number
  /** The signed change (`valueR - valueL`). */
  change: number
}

/**
 * The result of a single comparison (one dataset under one scenario) that has a difference.
 * The scenario and dataset are referred to by key; their names are in the scenario and
 * dataset summaries.
 */
export interface ExportedDiff {
  /** The key of the scenario (see `ExportedComparison.scenarios`). */
  scenarioKey: string
  /** The key of the dataset (see `ExportedComparison.datasets`). */
  datasetKey: string
  /** Set only when the dataset exists in just one of the models. */
  validity?: DiffValidity
  /** The largest difference, as a percentage of the combined value range. */
  maxDiff: number
  /** The average difference, as a percentage of the combined value range. */
  avgDiff: number
  /** The smallest difference, as a percentage of the combined value range. */
  minDiff: number
  /** The index of the threshold bucket that the max difference falls into (0 means no difference). */
  bucket: number
  /** The point in time at which the largest difference occurred. */
  maxDiffPoint?: ExportedDiffPoint
}

/** A summary of the differences for one dataset across all scenarios. */
export interface ExportedDatasetSummary {
  /** The key of the dataset. */
  datasetKey: string
  /** The name of the dataset. */
  dataset: string
  /** The largest difference across all scenarios. */
  maxDiff: number
  /** The number of scenarios in which this dataset has a difference. */
  scenariosWithDiffs: number
  /** The scenario with the largest difference. */
  worstScenario: string
  /** The largest difference in the baseline scenario (or undefined if not compared there). */
  baselineMaxDiff?: number
  /** Set only when the dataset exists in just one of the models. */
  validity?: DiffValidity
}

/** A summary of the differences for one scenario across all datasets. */
export interface ExportedScenarioSummary {
  /** The key of the scenario. */
  scenarioKey: string
  /** The scenario title and subtitle. */
  scenario: string
  /** A plain-text description of the input settings. */
  inputs: string
  /** The largest difference across all datasets. */
  maxDiff: number
  /** The number of datasets that have a difference in this scenario. */
  datasetsWithDiffs: number
  /** The dataset with the largest difference. */
  worstDataset: string
}

/** The counts of comparison tests, scenarios, and datasets. */
export interface ExportedComparisonCounts {
  /** The total number of comparison tests. */
  tests: number
  /** The number of comparison tests with a difference. */
  testsWithDiffs: number
  /** The total number of scenarios. */
  scenarios: number
  /** The number of scenarios with at least one difference. */
  scenariosWithDiffs: number
  /** The total number of datasets. */
  datasets: number
  /** The number of datasets with a difference in at least one scenario. */
  datasetsWithDiffs: number
}

/** The exported comparison results. */
export interface ExportedComparison {
  /** Metadata for the left ("baseline") bundle. */
  bundleL: ExportedBundle
  /** Metadata for the right ("current") bundle. */
  bundleR: ExportedBundle
  /** The run time statistics for the left bundle. */
  perfL: ExportedPerf
  /** The run time statistics for the right bundle. */
  perfR: ExportedPerf
  /** The thresholds (in percent) used to bucket differences. */
  thresholds: number[]
  /** The counts of comparison tests, scenarios, and datasets. */
  counts: ExportedComparisonCounts
  /** The key of the baseline scenario (all inputs at default), if there is one. */
  baselineScenarioKey?: string
  /** Every comparison that has a difference, sorted by largest difference first. */
  diffs: ExportedDiff[]
  /** A summary (including the name) for each dataset with differences, sorted by largest difference first. */
  datasets: ExportedDatasetSummary[]
  /** A summary (including the name) for each scenario with differences, sorted by largest difference first. */
  scenarios: ExportedScenarioSummary[]
}

/**
 * A self-contained, machine-readable version of a `SuiteReport`.  This is intended
 * to be written to a JSON file so that the results can be read by tools (including
 * LLMs) without running the model-check web app.
 */
export interface SuiteExport {
  /** The version of this export format. */
  schemaVersion: 1
  /** The date and time the suite was run (in ISO 8601 format). */
  date: string
  /** The time in milliseconds that it took to run the suite. */
  elapsedMillis: number
  /** Notes that explain how to interpret the values. */
  notes: string[]
  /** The check results. */
  checks: ExportedChecks
  /** The comparison results (only defined if comparisons were run). */
  comparison?: ExportedComparison
}

/** The notes that explain how to interpret the exported values. */
const notes = [
  'Diff values (maxDiff, avgDiff, minDiff) are not relative changes: each is the absolute difference between the left and right values, expressed as a percentage of the combined value range of both datasets (or as a relative change when both datasets are constant).',
  'The left bundle is the baseline and the right bundle is the current version; `change` is `valueR - valueL` at the time of the largest difference.',
  'Only comparisons with a nonzero difference, or with a dataset that exists in just one of the models, are included in `diffs`.',
  'To keep the file small, each entry in `diffs` refers to its scenario and dataset by key; look up the names (and scenario input settings) in `scenarios` and `datasets`, for example with jq: `(.comparison.scenarios | INDEX(.scenarioKey)) as $s | .comparison.diffs[] | .scenario = $s[.scenarioKey].scenario`.',
  'Diff values and model values are rounded to 6 significant digits.'
]

/**
 * Convert a full `SuiteReport` to a `SuiteExport`.
 *
 * @param config The configuration that was used to run the suite.
 * @param suiteReport The full suite report.
 * @param options The export options.
 * @returns The exported report.
 */
export function exportSuiteReport(config: Config, suiteReport: SuiteReport, options?: SuiteExportOptions): SuiteExport {
  let comparison: ExportedComparison
  if (config.comparison && suiteReport.comparisonReport) {
    comparison = exportComparison(config.comparison, suiteReport.comparisonReport)
  }

  return {
    schemaVersion: 1,
    date: options?.date || new Date().toISOString(),
    elapsedMillis: options?.elapsedMillis || 0,
    notes,
    checks: exportChecks(suiteReport.checkReport),
    comparison
  }
}

/**
 * Convert a `CheckReport` to plain-text check results.
 *
 * @param checkReport The check report.
 * @returns The exported check results.
 */
function exportChecks(checkReport: CheckReport): ExportedChecks {
  const plain = (s: string) => s
  const counts: ExportedCheckCounts = { total: 0, passed: 0, failed: 0, error: 0, skipped: 0 }
  const tests: ExportedCheckTest[] = []
  const failures: ExportedCheckFailure[] = []

  for (const group of checkReport.groups) {
    for (const test of group.tests) {
      counts.total++
      counts[test.status]++
      tests.push({ group: group.name, name: test.name, status: test.status })
      if (test.status === 'passed') {
        continue
      }

      for (const scenario of test.scenarios) {
        const scenarioMsg = scenarioMessage(scenario, plain)
        if (scenario.status !== 'passed' && scenario.datasets.length === 0) {
          failures.push(failure(group.name, test.name, scenario.status, scenarioMsg, '', ''))
        }
        for (const dataset of scenario.datasets) {
          const datasetMsg = datasetMessage(dataset, plain)
          if (dataset.status !== 'passed' && dataset.predicates.length === 0) {
            failures.push(failure(group.name, test.name, dataset.status, scenarioMsg, datasetMsg, ''))
          }
          for (const predicate of dataset.predicates) {
            const result = predicate.result
            if (result.status === 'passed') {
              continue
            }
            const f = failure(
              group.name,
              test.name,
              result.status,
              scenarioMsg,
              datasetMsg,
              predicateMessage(predicate, plain)
            )
            if (result.failValue !== undefined) f.failValue = result.failValue
            if (result.failRefValue !== undefined) f.failRefValue = result.failRefValue
            if (result.failTime !== undefined) f.failTime = result.failTime
            failures.push(f)
          }
        }
      }
    }
  }

  return { counts, tests, failures }
}

/**
 * Create an `ExportedCheckFailure` with the given messages.
 *
 * @param group The name of the group that contains the test.
 * @param test The name of the test.
 * @param status The status of the failed item.
 * @param scenario The scenario message.
 * @param dataset The dataset message.
 * @param predicate The predicate message.
 */
function failure(
  group: string,
  test: string,
  status: CheckStatus,
  scenario: string,
  dataset: string,
  predicate: string
): ExportedCheckFailure {
  return { group, test, status, scenario, dataset, predicate }
}

/**
 * Return the title and subtitle of the given scenario as a single label.
 *
 * @param scenario The scenario, or undefined if the key could not be resolved.
 * @param key The scenario key, used as a fallback label.
 */
function scenarioLabel(scenario: ComparisonScenario | undefined, key: string): string {
  if (scenario === undefined) {
    return key
  }
  const title = scenario.title || key
  return scenario.subtitle ? `${title} ${scenario.subtitle}` : title
}

/**
 * Return a plain-text description of the input settings for the given scenario.
 *
 * @param scenario The scenario.
 */
function scenarioInputs(scenario: ComparisonScenario | undefined): string {
  if (scenario === undefined) {
    return ''
  }
  const settings = scenario.settings
  if (settings.kind === 'all-inputs-settings') {
    return `all inputs ${settings.position.replace('-', ' ')}`
  }
  return settings.inputs
    .map(input => {
      const state = input.stateR.inputVar ? input.stateR : input.stateL
      const name = input.requestedName
      if (state.error) {
        return `${name} (error: ${state.error.kind})`
      } else if (state.position) {
        const value = state.value !== undefined ? ` (${state.value})` : ''
        return `${name} ${state.position.replace('-', ' ')}${value}`
      } else {
        return `${name} = ${state.value}`
      }
    })
    .join(', ')
}

/**
 * Return true if the given scenario is the baseline scenario (all inputs at default).
 *
 * @param scenario The scenario.
 */
function isBaseline(scenario: ComparisonScenario | undefined): boolean {
  return scenario?.settings.kind === 'all-inputs-settings' && scenario.settings.position === 'at-default'
}

/**
 * Round the given number to 6 significant digits to remove floating point noise
 * and keep the exported file small.
 *
 * @param x The number to round.
 */
function round(x: number): number {
  return Number(x.toPrecision(6))
}

/**
 * Convert a `PerfReport` to the exported perf stats.
 *
 * @param perf The perf report.
 */
function exportPerf(perf: PerfReport): ExportedPerf {
  return { avgTime: perf.avgTime, minTime: perf.minTime, maxTime: perf.maxTime }
}

/**
 * Sort the given items (in place) by largest `maxDiff` first, then alphabetically by label.
 *
 * @param items The items to sort.
 * @param label A function that returns the label used as a tie-breaker.
 * @returns The sorted items.
 */
function sortByDiff<T extends { maxDiff: number }>(items: T[], label: (item: T) => string): T[] {
  return items.sort((a, b) => b.maxDiff - a.maxDiff || label(a).localeCompare(label(b)))
}

/**
 * Convert a `ComparisonReport` to the exported comparison results.
 *
 * @param comparisonConfig The comparison configuration.
 * @param comparisonReport The comparison report.
 */
function exportComparison(comparisonConfig: ComparisonConfig, comparisonReport: ComparisonReport): ExportedComparison {
  const { bundleL, bundleR, scenarios, datasets, thresholds } = comparisonConfig

  /**
   * Return the exported metadata for the given bundle.
   *
   * @param bundle The loaded bundle.
   */
  function exportBundle(bundle: typeof bundleL): ExportedBundle {
    const spec = bundle.modelSpec
    return {
      name: bundle.name,
      modelSizeInBytes: spec.modelSizeInBytes,
      dataSizeInBytes: spec.dataSizeInBytes,
      inputs: spec.inputVars.size,
      outputs: spec.outputVars.size
    }
  }

  /**
   * Return the variable name for the given dataset key (preferring the right model's name).
   *
   * @param datasetKey The dataset key.
   */
  function datasetName(datasetKey: string): string {
    const dataset = datasets.getDataset(datasetKey)
    return dataset?.outputVarR?.varName || dataset?.outputVarL?.varName || datasetKey
  }

  /**
   * Return the label for the given scenario key.
   *
   * @param scenarioKey The scenario key.
   */
  function scenarioName(scenarioKey: string): string {
    return scenarioLabel(scenarios.getScenario(scenarioKey), scenarioKey)
  }

  // Convert each comparison test that has a difference
  const diffs: ExportedDiff[] = []
  const baselineMaxDiffs = new Map<string, number>()
  let baselineScenarioKey: string
  for (const testReport of comparisonReport.testReports) {
    const diffReport = testReport.diffReport
    if (diffReport === undefined) {
      continue
    }
    if (isBaseline(scenarios.getScenario(testReport.scenarioKey))) {
      baselineScenarioKey = testReport.scenarioKey
      baselineMaxDiffs.set(testReport.datasetKey, round(diffReport.maxDiff))
    }
    if (diffReport.maxDiff === 0 && diffReport.validity === 'both') {
      continue
    }
    const diff: ExportedDiff = {
      scenarioKey: testReport.scenarioKey,
      datasetKey: testReport.datasetKey,
      maxDiff: round(diffReport.maxDiff),
      avgDiff: round(diffReport.avgDiff),
      minDiff: round(diffReport.minDiff),
      bucket: getBucketIndex(diffReport.maxDiff, thresholds)
    }
    if (diffReport.validity !== 'both') {
      diff.validity = diffReport.validity
    }
    const point = diffReport.maxDiffPoint
    if (diffReport.validity === 'both' && point !== undefined) {
      diff.maxDiffPoint = {
        time: point.time,
        valueL: round(point.valueL),
        valueR: round(point.valueR),
        change: round(point.valueR - point.valueL)
      }
    }
    diffs.push(diff)
  }
  sortByDiff(diffs, d => `${datasetName(d.datasetKey)} ${scenarioName(d.scenarioKey)}`)

  // Summarize the diffs for each dataset and scenario (the diffs are already
  // sorted, so the first diff seen for each dataset or scenario is the worst)
  const datasetSummaries = new Map<string, ExportedDatasetSummary>()
  const scenarioSummaries = new Map<string, ExportedScenarioSummary>()
  for (const diff of diffs) {
    let ds = datasetSummaries.get(diff.datasetKey)
    if (ds === undefined) {
      ds = {
        datasetKey: diff.datasetKey,
        dataset: datasetName(diff.datasetKey),
        maxDiff: diff.maxDiff,
        scenariosWithDiffs: 0,
        worstScenario: scenarioName(diff.scenarioKey),
        baselineMaxDiff: baselineMaxDiffs.get(diff.datasetKey)
      }
      if (diff.validity !== undefined) {
        ds.validity = diff.validity
      }
      datasetSummaries.set(diff.datasetKey, ds)
    }
    ds.scenariosWithDiffs++

    let ss = scenarioSummaries.get(diff.scenarioKey)
    if (ss === undefined) {
      ss = {
        scenarioKey: diff.scenarioKey,
        scenario: scenarioName(diff.scenarioKey),
        inputs: scenarioInputs(scenarios.getScenario(diff.scenarioKey)),
        maxDiff: diff.maxDiff,
        datasetsWithDiffs: 0,
        worstDataset: datasetName(diff.datasetKey)
      }
      scenarioSummaries.set(diff.scenarioKey, ss)
    }
    ss.datasetsWithDiffs++
  }

  return {
    bundleL: exportBundle(bundleL),
    bundleR: exportBundle(bundleR),
    perfL: exportPerf(comparisonReport.perfReportL),
    perfR: exportPerf(comparisonReport.perfReportR),
    thresholds,
    counts: {
      tests: comparisonReport.testReports.length,
      testsWithDiffs: diffs.length,
      scenarios: [...scenarios.getAllScenarios()].length,
      scenariosWithDiffs: scenarioSummaries.size,
      datasets: [...datasets.getAllDatasets()].length,
      datasetsWithDiffs: datasetSummaries.size
    },
    baselineScenarioKey,
    diffs,
    datasets: sortByDiff([...datasetSummaries.values()], d => d.dataset),
    scenarios: sortByDiff([...scenarioSummaries.values()], s => s.scenario)
  }
}

/**
 * Format a number for display in a Markdown table.
 *
 * @param x The number to format.
 */
function num(x: number): string {
  return String(Number(x.toPrecision(6)))
}

/**
 * Format a diff percentage for display in a Markdown table.
 *
 * @param x The diff percentage.
 */
function pct(x: number): string {
  return `${x.toFixed(2)}%`
}

/**
 * Format a Markdown table with the given header and rows, truncated to `maxRows`.
 *
 * @param header The column headings.
 * @param rows The table rows.
 * @param maxRows The maximum number of rows to include.
 * @param noun The plural noun used in the truncation note (for example, "datasets").
 * @returns The lines of the table.
 */
function table(header: string[], rows: string[][], maxRows: number, noun: string): string[] {
  const lines = [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`]
  for (const row of rows.slice(0, maxRows)) {
    lines.push(`| ${row.join(' | ')} |`)
  }
  if (rows.length > maxRows) {
    lines.push('', `Showing ${maxRows} of ${rows.length} ${noun}; see \`report.json\` for the full list.`)
  }
  return lines
}

/**
 * Format a `SuiteExport` as a Markdown summary.
 *
 * @param suiteExport The exported report.
 * @param options The formatting options.
 * @returns The Markdown summary.
 */
export function formatSuiteExportAsMarkdown(suiteExport: SuiteExport, options?: SuiteExportMarkdownOptions): string {
  const maxRows = options?.maxRows || 50
  const c = suiteExport.comparison
  const lines: string[] = ['# Model check report', '']

  if (c) {
    lines.push(`Comparing \`${c.bundleL.name}\` (left, baseline) to \`${c.bundleR.name}\` (right, current).`)
  }
  lines.push(`Generated ${suiteExport.date} in ${(suiteExport.elapsedMillis / 1000).toFixed(1)} s.`, '')
  for (const note of suiteExport.notes) {
    lines.push(`- ${note}`)
  }

  // Checks
  const counts = suiteExport.checks.counts
  lines.push(
    '',
    '## Checks',
    '',
    `${counts.total} tests: ${counts.passed} passed, ${counts.failed} failed, ${counts.error} errors, ${counts.skipped} skipped.`
  )
  if (suiteExport.checks.failures.length > 0) {
    lines.push('')
    for (const f of suiteExport.checks.failures) {
      const desc = [f.scenario, f.dataset, f.predicate].filter(s => s.length > 0).join(' ')
      lines.push(`- **${f.group} > ${f.test}** (${f.status}): ${desc}`)
    }
  }

  if (c === undefined) {
    lines.push('', 'Comparisons were not run.', '')
    return lines.join('\n')
  }

  // Performance
  lines.push(
    '',
    '## Performance',
    '',
    ...table(
      ['Bundle', 'Model size (bytes)', 'Data size (bytes)', 'Avg time (ms)', 'Min time (ms)', 'Max time (ms)'],
      [
        [c.bundleL, c.perfL],
        [c.bundleR, c.perfR]
      ].map(([b, p]: [ExportedBundle, ExportedPerf]) => [
        b.name,
        String(b.modelSizeInBytes),
        String(b.dataSizeInBytes),
        p.avgTime.toFixed(1),
        p.minTime.toFixed(1),
        p.maxTime.toFixed(1)
      ]),
      maxRows,
      'bundles'
    )
  )

  // Comparison counts
  const cc = c.counts
  lines.push(
    '',
    '## Comparisons',
    '',
    `${cc.testsWithDiffs} of ${cc.tests} comparisons have differences, across ${cc.scenariosWithDiffs} of ${cc.scenarios} scenarios and ${cc.datasetsWithDiffs} of ${cc.datasets} datasets.`
  )

  // Baseline scenario
  const datasetNames = new Map(c.datasets.map(d => [d.datasetKey, d.dataset]))
  const baselineRows = c.diffs
    .filter(d => d.scenarioKey === c.baselineScenarioKey)
    .map(d => {
      const dataset = datasetNames.get(d.datasetKey) || d.datasetKey
      if (d.validity !== undefined || d.maxDiffPoint === undefined) {
        const status = d.validity === 'right-only' ? 'added' : d.validity === 'left-only' ? 'removed' : d.validity
        return [dataset, '–', '–', '–', '–', '–', status]
      }
      const p = d.maxDiffPoint
      const direction = p.change > 0 ? 'up' : p.change < 0 ? 'down' : 'same'
      return [dataset, pct(d.maxDiff), pct(d.avgDiff), String(p.time), num(p.valueL), num(p.valueR), direction]
    })
  lines.push('', '## Baseline scenario (all inputs at default)', '')
  if (baselineRows.length > 0) {
    lines.push(
      ...table(
        ['Dataset', 'Max diff', 'Avg diff', 'Time of max diff', 'Left', 'Right', 'Change'],
        baselineRows,
        maxRows,
        'baseline diffs'
      )
    )
  } else {
    lines.push('No differences.')
  }

  // Datasets
  lines.push(
    '',
    '## Datasets with differences',
    '',
    ...table(
      ['Dataset', 'Max diff', 'Scenarios with diffs', 'Worst scenario'],
      c.datasets.map(d => [d.dataset, pct(d.maxDiff), String(d.scenariosWithDiffs), d.worstScenario]),
      maxRows,
      'datasets'
    )
  )

  // Scenarios
  lines.push(
    '',
    '## Scenarios with differences',
    '',
    ...table(
      ['Scenario', 'Datasets with diffs', 'Max diff', 'Worst dataset'],
      c.scenarios.map(s => [s.scenario, String(s.datasetsWithDiffs), pct(s.maxDiff), s.worstDataset]),
      maxRows,
      'scenarios'
    ),
    ''
  )

  return lines.join('\n')
}
