// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { ModelSpec } from '../bundle/bundle-types'
import type { CheckReport, CheckStatus } from '../check/check-report'
import { datasetMessage, predicateMessage, scenarioMessage } from '../check/check-report'
import type { ComparisonResolverError, ComparisonScenario } from '../comparison/_shared/comparison-resolved-types'
import type { ComparisonConfig } from '../comparison/config/comparison-config'
import type { DiffValidity } from '../comparison/diff-datasets/diff-datasets'
import type { GraphComparisonMetadataReport } from '../comparison/diff-graphs/diff-graphs'
import { diffGraphs } from '../comparison/diff-graphs/diff-graphs'
import { categorizeComparisonTestSummaries } from '../comparison/report/comparison-grouping'
import type { ComparisonReport } from '../comparison/report/comparison-report-types'
import { comparisonSummaryFromReport } from '../comparison/report/comparison-reporting'
import { getBucketIndex } from '../comparison/report/buckets'
import type { Config } from '../config/config-types'
import type { PerfReport } from '../perf/perf-stats'

import type { SuiteReport } from './suite-report-types'
import type { SuiteTabStatus } from './suite-tab-status'
import {
  countCheckPredicates,
  countComparisonGroupsWithDiffs,
  getChecksTabStatus,
  getComparisonTabStatus
} from './suite-tab-status'

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

/** A setting of an input variable that differs between the two bundles. */
export interface ExportedInputFieldChange {
  /** The name of the setting (for example, `defaultValue` or `maxValue`). */
  field: string
  /** The value in the left ("baseline") bundle. */
  valueL: number | string
  /** The value in the right ("current") bundle. */
  valueR: number | string
}

/** An input variable whose settings differ between the two bundles. */
export interface ExportedInputChange {
  /** The name of the input variable (in the right bundle). */
  input: string
  /** The settings that differ. */
  changes: ExportedInputFieldChange[]
}

/** The input variables that differ between the two bundles. */
export interface ExportedInputChanges {
  /** The names of the input variables that are only in the right ("current") bundle. */
  added: string[]
  /** The names of the input variables that are only in the left ("baseline") bundle. */
  removed: string[]
  /** The input variables whose settings differ. */
  changed: ExportedInputChange[]
}

/** The output variables that differ between the two bundles. */
export interface ExportedOutputChanges {
  /** The names of the output variables that are only in the right ("current") bundle. */
  added: string[]
  /** The names of the output variables that are only in the left ("baseline") bundle. */
  removed: string[]
}

/** A graph that was added, removed, or changed between the two bundles. */
export interface ExportedGraphChange {
  /** The ID of the graph. */
  graphId: string
  /** The title of the graph (in the right bundle, if it is there). */
  title: string
  /** Set only when the graph is in just one of the bundles. */
  inclusion?: 'left-only' | 'right-only'
  /** The metadata fields whose values differ (omitted if none). */
  metadata?: GraphComparisonMetadataReport[]
  /** The largest difference among the datasets of the graph, in any scenario (omitted if none). */
  maxDiff?: number
}

/** The counts of graphs that were added, removed, or changed. */
export interface ExportedGraphCounts {
  /** The total number of graphs (in either bundle). */
  total: number
  /** The number of graphs that are only in the right ("current") bundle. */
  added: number
  /** The number of graphs that are only in the left ("baseline") bundle. */
  removed: number
  /** The number of graphs (in both bundles) whose metadata differs. */
  metadataChanged: number
  /** The number of graphs (in both bundles) that have a dataset with a difference in any scenario. */
  datasetsChanged: number
}

/** The graphs that differ between the two bundles. */
export interface ExportedGraphChanges {
  /** The counts of graphs that were added, removed, or changed. */
  counts: ExportedGraphCounts
  /** The graphs that were added, removed, or changed, in the order of the right bundle, then the removed graphs. */
  changes: ExportedGraphChange[]
}

/** Which of the bundles something applies to. */
export type ExportedSide = 'left' | 'right' | 'both'

/** An input (or input setting group) of a scenario that could not be resolved. */
export interface ExportedScenarioInputError {
  /** The requested name of the input (or the ID of the input setting group). */
  input: string
  /** The bundles in which it could not be resolved. */
  side: ExportedSide
  /** The kind of error. */
  kind: ComparisonResolverError['kind']
}

/** A scenario that could not be run for one or both bundles, so its datasets were not compared. */
export interface ExportedInvalidScenario {
  /** The key of the scenario. */
  scenarioKey: string
  /** The scenario title and subtitle. */
  scenario: string
  /** The bundles for which the scenario could not be run. */
  side: ExportedSide
  /** The inputs that could not be resolved. */
  errors: ExportedScenarioInputError[]
}

/** A scenario whose comparisons were all skipped (for example, because it was filtered out). */
export interface ExportedSkippedScenario {
  /** The key of the scenario. */
  scenarioKey: string
  /** The scenario title and subtitle. */
  scenario: string
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
  /** The input variables that were added, removed, or changed (matched by variable ID). */
  inputs: ExportedInputChanges
  /** The output variables that were added or removed (matched by dataset key). */
  outputs: ExportedOutputChanges
  /** The graphs that were added, removed, or changed (matched by graph ID). */
  graphs: ExportedGraphChanges
  /** The scenarios that could not be run for one or both bundles (their datasets are not in `diffs`). */
  invalidScenarios: ExportedInvalidScenario[]
  /** The scenarios whose comparisons were all skipped. */
  skippedScenarios: ExportedSkippedScenario[]
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
 * The overall status of a suite run, for tools (for example, CI jobs) that only need to know
 * whether the report is worth looking at.
 */
export interface ExportedStatus {
  /** `failed` if any check test failed or had an error, `passed` if not, or `none` if there are no check tests. */
  checks: 'passed' | 'failed' | 'none'
  /**
   * `changed` if any dataset, input, output, or graph differs between the two bundles (or a
   * scenario could not be run for one of them), `same` if not, `skipped` if every comparison test
   * was skipped, or `none` if comparisons were not run.
   */
  comparison: 'same' | 'changed' | 'skipped' | 'none'
  /** True if the comparison status is `changed`. */
  differencesFound: boolean
}

/**
 * The statuses of the summary tabs of the model-check report, as the report shows them (computed
 * with the same functions as the report UI).
 */
export interface ExportedSummaryTabs {
  /** The status of the "Checks" tab (which counts check predicates rather than tests). */
  checks: SuiteTabStatus
  /** The status of the "Comparisons by scenario" tab (only defined if comparisons were run). */
  comparisonsByScenario?: SuiteTabStatus
  /** The status of the "Comparisons by dataset" tab (only defined if comparisons were run). */
  comparisonsByDataset?: SuiteTabStatus
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
  /** The overall status of the checks and comparisons. */
  status: ExportedStatus
  /** The statuses of the summary tabs of the report. */
  summaryTabs: ExportedSummaryTabs
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
  'Diff values and model values are rounded to 6 significant digits.',
  '`status` summarizes the results: `status.differencesFound` is true if any dataset, input, output, or graph differs between the two bundles (see `comparison.inputs`, `comparison.outputs`, and `comparison.graphs`), and `summaryTabs` has the status and subtitle of each summary tab, as the report shows them.'
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

  const checks = exportChecks(suiteReport.checkReport)
  return {
    schemaVersion: 1,
    date: options?.date || new Date().toISOString(),
    elapsedMillis: options?.elapsedMillis || 0,
    notes,
    status: exportStatus(checks, comparison, suiteReport.comparisonReport),
    summaryTabs: exportSummaryTabs(config, suiteReport, comparison),
    checks,
    comparison
  }
}

/**
 * Return the statuses of the summary tabs of the report, as the report UI shows them.
 *
 * @param config The configuration that was used to run the suite.
 * @param suiteReport The full suite report.
 * @param comparison The exported comparison results, if comparisons were run.
 * @returns The statuses of the tabs.
 */
function exportSummaryTabs(
  config: Config,
  suiteReport: SuiteReport,
  comparison: ExportedComparison | undefined
): ExportedSummaryTabs {
  const tabs: ExportedSummaryTabs = {
    checks: getChecksTabStatus(countCheckPredicates(suiteReport.checkReport))
  }
  if (config.comparison && suiteReport.comparisonReport && comparison) {
    // (the UI categorizes the terse test summaries in the same way; the sort mode does not
    // affect the counts)
    const testSummaries = comparisonSummaryFromReport(suiteReport.comparisonReport).testSummaries
    const groups = categorizeComparisonTestSummaries(config.comparison, testSummaries, 'max-diff')
    const skippedScenarioCount = comparison.skippedScenarios.length
    tabs.comparisonsByScenario = getComparisonTabStatus(
      { count: countComparisonGroupsWithDiffs(groups.byScenario), kind: 'scenario' },
      skippedScenarioCount
    )
    tabs.comparisonsByDataset = getComparisonTabStatus(
      { count: countComparisonGroupsWithDiffs(groups.byDataset), kind: 'dataset' },
      skippedScenarioCount
    )
  }
  return tabs
}

/**
 * Return the overall status of the checks and comparisons.
 *
 * @param checks The exported check results.
 * @param comparison The exported comparison results, if comparisons were run.
 * @param comparisonReport The comparison report, if comparisons were run.
 * @returns The status.
 */
function exportStatus(
  checks: ExportedChecks,
  comparison: ExportedComparison | undefined,
  comparisonReport: ComparisonReport | undefined
): ExportedStatus {
  let checksStatus: ExportedStatus['checks']
  if (checks.counts.total === 0) {
    checksStatus = 'none'
  } else if (checks.counts.failed > 0 || checks.counts.error > 0) {
    checksStatus = 'failed'
  } else {
    checksStatus = 'passed'
  }

  let comparisonStatus: ExportedStatus['comparison']
  const testReports = comparisonReport?.testReports || []
  if (comparison === undefined) {
    comparisonStatus = 'none'
  } else if (testReports.length > 0 && testReports.every(t => t.diffReport === undefined)) {
    comparisonStatus = 'skipped'
  } else {
    const { inputs, outputs, graphs } = comparison
    const changed =
      comparison.diffs.length > 0 ||
      inputs.added.length + inputs.removed.length + inputs.changed.length > 0 ||
      outputs.added.length + outputs.removed.length > 0 ||
      graphs.changes.length > 0 ||
      comparison.invalidScenarios.length > 0
    comparisonStatus = changed ? 'changed' : 'same'
  }

  return { checks: checksStatus, comparison: comparisonStatus, differencesFound: comparisonStatus === 'changed' }
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

  // Find the scenarios that could not be run for one or both bundles, and the ones whose
  // comparisons were all skipped
  const invalidScenarios: ExportedInvalidScenario[] = []
  const skippedScenarios: ExportedSkippedScenario[] = []
  for (const scenario of scenarios.getAllScenarios()) {
    const invalid = exportInvalidScenario(scenario)
    if (invalid !== undefined) {
      invalidScenarios.push(invalid)
      continue
    }
    const scenarioTests = comparisonReport.testReports.filter(t => t.scenarioKey === scenario.key)
    if (scenarioTests.length > 0 && scenarioTests.every(t => t.diffReport === undefined)) {
      skippedScenarios.push({ scenarioKey: scenario.key, scenario: scenarioName(scenario.key) })
    }
  }
  const invalidScenarioKeys = new Set(invalidScenarios.map(s => s.scenarioKey))

  // Convert each comparison test that has a difference (the datasets of a scenario that could not
  // be run only exist on one side, which is not a difference between the bundles)
  const diffs: ExportedDiff[] = []
  const baselineMaxDiffs = new Map<string, number>()
  let baselineScenarioKey: string
  for (const testReport of comparisonReport.testReports) {
    const diffReport = testReport.diffReport
    if (diffReport === undefined || invalidScenarioKeys.has(testReport.scenarioKey)) {
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
    inputs: exportInputChanges(bundleL.modelSpec, bundleR.modelSpec),
    outputs: exportOutputChanges(bundleL.modelSpec, bundleR.modelSpec),
    graphs: exportGraphChanges(bundleL.modelSpec, bundleR.modelSpec, diffs),
    invalidScenarios,
    skippedScenarios,
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
 * Return the given scenario as an invalid scenario if it could not be run for one or both bundles
 * (because an input or input setting group could not be resolved), or undefined if it can be run.
 *
 * @param scenario The scenario.
 */
function exportInvalidScenario(scenario: ComparisonScenario): ExportedInvalidScenario | undefined {
  const side = (left: boolean, right: boolean): ExportedSide | undefined =>
    left && right ? 'both' : left ? 'left' : right ? 'right' : undefined
  const scenarioSide = side(scenario.specL === undefined, scenario.specR === undefined)
  if (scenarioSide === undefined) {
    return undefined
  }
  const errors: ExportedScenarioInputError[] = []
  if (scenario.settings.kind === 'input-settings') {
    for (const input of scenario.settings.inputs) {
      const errorSide = side(input.stateL.error !== undefined, input.stateR.error !== undefined)
      if (errorSide !== undefined) {
        const kind = (input.stateL.error || input.stateR.error).kind
        errors.push({ input: input.requestedName, side: errorSide, kind })
      }
    }
  }
  return {
    scenarioKey: scenario.key,
    scenario: scenarioLabel(scenario, scenario.key),
    side: scenarioSide,
    errors
  }
}

/** The settings of an input variable that are compared between the two bundles. */
const inputFields = ['kind', 'defaultValue', 'minValue', 'maxValue', 'offValue', 'onValue'] as const

/**
 * Return the input variables that were added, removed, or changed between the two model specs.
 *
 * @param specL The model spec of the left ("baseline") bundle.
 * @param specR The model spec of the right ("current") bundle.
 * @returns The input changes.
 */
function exportInputChanges(specL: ModelSpec, specR: ModelSpec): ExportedInputChanges {
  const added: string[] = []
  const changed: ExportedInputChange[] = []
  for (const [varId, inputR] of specR.inputVars) {
    const inputL = specL.inputVars.get(varId)
    if (inputL === undefined) {
      added.push(inputR.varName)
      continue
    }
    const changes: ExportedInputFieldChange[] = []
    for (const field of inputFields) {
      const valueL = (inputL as unknown as Record<string, number | string>)[field]
      const valueR = (inputR as unknown as Record<string, number | string>)[field]
      if (valueL !== valueR) {
        changes.push({ field, valueL, valueR })
      }
    }
    if (changes.length > 0) {
      changed.push({ input: inputR.varName, changes })
    }
  }
  const removed = [...specL.inputVars].filter(([varId]) => !specR.inputVars.has(varId)).map(([, v]) => v.varName)
  return { added, removed, changed }
}

/**
 * Return the output variables that were added or removed between the two model specs.
 *
 * @param specL The model spec of the left ("baseline") bundle.
 * @param specR The model spec of the right ("current") bundle.
 * @returns The output changes.
 */
function exportOutputChanges(specL: ModelSpec, specR: ModelSpec): ExportedOutputChanges {
  const only = (a: ModelSpec, b: ModelSpec) =>
    [...a.outputVars].filter(([datasetKey]) => !b.outputVars.has(datasetKey)).map(([, v]) => v.varName)
  return { added: only(specR, specL), removed: only(specL, specR) }
}

/**
 * Return the graphs that were added, removed, or changed between the two model specs.
 *
 * @param specL The model spec of the left ("baseline") bundle.
 * @param specR The model spec of the right ("current") bundle.
 * @param diffs The comparisons that have a difference.
 * @returns The graph changes.
 */
function exportGraphChanges(specL: ModelSpec, specR: ModelSpec, diffs: ExportedDiff[]): ExportedGraphChanges {
  // Find the largest difference for each dataset (in any scenario)
  const maxDiffs = new Map<string, number>()
  for (const diff of diffs) {
    if (diff.validity === undefined) {
      maxDiffs.set(diff.datasetKey, Math.max(maxDiffs.get(diff.datasetKey) ?? 0, diff.maxDiff))
    }
  }

  // Compare the graphs in the order of the right bundle, then the graphs that were removed
  const graphsL = specL.graphSpecs || []
  const graphsR = specR.graphSpecs || []
  const graphIds = [...new Set([...graphsR.map(g => g.id), ...graphsL.map(g => g.id)])]
  const counts: ExportedGraphCounts = {
    total: graphIds.length,
    added: 0,
    removed: 0,
    metadataChanged: 0,
    datasetsChanged: 0
  }
  const changes: ExportedGraphChange[] = []
  for (const graphId of graphIds) {
    const graphL = graphsL.find(g => g.id === graphId)
    const graphR = graphsR.find(g => g.id === graphId)
    const change: ExportedGraphChange = { graphId, title: (graphR || graphL).title }
    // (the dataset diffs are found below, from the diffs in all scenarios, so no scenario is given here)
    const report = diffGraphs(graphL, graphR, undefined, [])
    if (report.inclusion === 'left-only' || report.inclusion === 'right-only') {
      change.inclusion = report.inclusion
      counts[report.inclusion === 'right-only' ? 'added' : 'removed']++
      changes.push(change)
      continue
    }
    if (report.metadataReports.length > 0) {
      change.metadata = report.metadataReports
      counts.metadataChanged++
    }
    const datasetKeys = [...graphL.datasets, ...graphR.datasets].map(d => d.datasetKey)
    const maxDiff = Math.max(0, ...datasetKeys.map(key => maxDiffs.get(key) ?? 0))
    if (maxDiff > 0) {
      change.maxDiff = maxDiff
      counts.datasetsChanged++
    }
    if (change.metadata || change.maxDiff) {
      changes.push(change)
    }
  }
  return { counts, changes }
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
    // (escape the pipes in the cells, so that they don't break the table)
    lines.push(`| ${row.map(cell => cell.replace(/\|/g, '\\|')).join(' | ')} |`)
  }
  if (rows.length > maxRows) {
    lines.push('', `Showing ${maxRows} of ${rows.length} ${noun}; see \`report.json\` for the full list.`)
  }
  return lines
}

/** The descriptions of the check statuses. */
const checksStatusText: Record<ExportedStatus['checks'], string> = {
  passed: 'checks passed',
  failed: 'checks failed',
  none: 'no checks'
}

/** The descriptions of the comparison statuses. */
const comparisonStatusText: Record<ExportedStatus['comparison'], string> = {
  same: 'no differences',
  changed: 'differences found',
  skipped: 'comparisons skipped',
  none: 'comparisons not run'
}

/**
 * Return a short description of the overall status (for example, "checks passed, no differences").
 *
 * @param status The status.
 */
function statusText(status: ExportedStatus): string {
  return `${checksStatusText[status.checks]}, ${comparisonStatusText[status.comparison]}`
}

/**
 * Return the lines of the Markdown section that lists the inputs and outputs that were added,
 * removed, or changed.
 *
 * @param c The exported comparison results.
 * @param maxRows The maximum number of rows to include in the table.
 */
function inputsAndOutputsSection(c: ExportedComparison, maxRows: number): string[] {
  const lines = ['', '## Inputs and outputs', '']
  const names = (list: string[]) => list.map(name => `\`${name}\``).join(', ')
  const lists: [string, string[]][] = [
    ['Added inputs', c.inputs.added],
    ['Removed inputs', c.inputs.removed],
    ['Added outputs', c.outputs.added],
    ['Removed outputs', c.outputs.removed]
  ]
  for (const [label, list] of lists) {
    if (list.length > 0) {
      lines.push(`- ${label}: ${names(list)}`)
    }
  }
  const rows = c.inputs.changed.flatMap(i => i.changes.map(f => [i.input, f.field, String(f.valueL), String(f.valueR)]))
  if (rows.length > 0) {
    if (lines.length > 3) {
      lines.push('')
    }
    lines.push(...table(['Input', 'Setting', 'Left', 'Right'], rows, maxRows, 'input settings'))
  }
  if (lines.length === 3) {
    lines.push('No inputs or outputs were added, removed, or changed.')
  }
  return lines
}

/**
 * Return the lines of the Markdown section that summarizes the graphs that were added, removed,
 * or changed.
 *
 * @param c The exported comparison results.
 * @param maxRows The maximum number of rows to include in the table.
 */
function graphsSection(c: ExportedComparison, maxRows: number): string[] {
  const lines = ['', '## Graphs', '']
  const { counts, changes } = c.graphs
  if (changes.length === 0) {
    lines.push('No graphs changed.')
    return lines
  }
  lines.push(
    `${changes.length} of ${counts.total} graphs changed: ${counts.added} added, ${counts.removed} removed, ` +
      `${counts.metadataChanged} with metadata changes, ${counts.datasetsChanged} with dataset changes.`,
    ''
  )
  const rows = changes.map(g => {
    let change: string
    if (g.inclusion !== undefined) {
      change = g.inclusion === 'right-only' ? 'added' : 'removed'
    } else {
      const parts: string[] = []
      if (g.metadata) {
        const fields = g.metadata.map(m => `${m.key}: ${m.valueL ?? '(none)'} → ${m.valueR ?? '(none)'}`)
        parts.push(`metadata (${fields.join(', ')})`)
      }
      if (g.maxDiff) {
        parts.push('datasets')
      }
      change = parts.join(', ')
    }
    return [`${g.graphId}: ${g.title}`, change, g.maxDiff ? pct(g.maxDiff) : '–']
  })
  lines.push(...table(['Graph', 'Change', 'Max diff'], rows, maxRows, 'graphs'))
  return lines
}

/** The descriptions of the kinds of scenario input errors. */
const inputErrorText: Record<ComparisonResolverError['kind'], string> = {
  'unknown-input': 'unknown input',
  'unknown-input-setting-group': 'unknown input setting group'
}

/**
 * Return the lines of the Markdown section that lists the scenarios that could not be run or were
 * skipped (or no lines if there are none).
 *
 * @param c The exported comparison results.
 */
function notComparedSection(c: ExportedComparison): string[] {
  if (c.invalidScenarios.length === 0 && c.skippedScenarios.length === 0) {
    return []
  }
  const lines = ['', '## Scenarios that were not compared', '']
  for (const s of c.invalidScenarios) {
    const bundles = s.side === 'both' ? 'left and right bundles' : `${s.side} bundle`
    const errors = s.errors.map(e => `${inputErrorText[e.kind]} \`${e.input}\``).join(', ')
    lines.push(`- ${s.scenario}: could not be run for the ${bundles}${errors ? ` (${errors})` : ''}`)
  }
  for (const s of c.skippedScenarios) {
    lines.push(`- ${s.scenario}: skipped`)
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
  lines.push(`**Status:** ${statusText(suiteExport.status)}.`, '')
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

  lines.push(...inputsAndOutputsSection(c, maxRows), ...graphsSection(c, maxRows), ...notComparedSection(c))

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
