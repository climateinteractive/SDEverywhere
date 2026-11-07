// Copyright (c) 2026 Climate Interactive / New Venture Fund

//
// The statuses of the summary tabs of the model-check report (for example, "2 failed" in red, or
// "3 scenarios with diffs" in yellow).  These are used by the report UI and by the exported
// report, so that they always agree.
//

import type { CheckReport } from '../check/check-report'
import type { ComparisonGroupSummariesByCategory } from '../comparison/report/comparison-group-types'
import type { ComparisonViewGroupSummary } from '../comparison/report/comparison-view-summaries'

/** The status of a summary tab, which determines its color. */
export type SuiteTabStatusKind = 'passed' | 'warning' | 'failed' | 'none'

/** The status of a summary tab, with the text that is shown under its title. */
export interface SuiteTabStatus {
  /** The status of the tab. */
  status: SuiteTabStatusKind
  /** The text that is shown under the title of the tab (for example, "2 failed"). */
  subtitle: string
}

/** The numbers of check predicates with each status (as shown on the "Checks" tab). */
export interface CheckPredicateCounts {
  /** The total number of predicates (including the errors and skipped tests). */
  total: number
  /** The number of predicates that passed. */
  passed: number
  /** The number of predicates that failed. */
  failed: number
  /** The number of predicates that had an error (including scenarios and datasets that could not be resolved). */
  errors: number
  /** The number of predicates that were skipped (including tests that have no scenarios). */
  skipped: number
}

/** The kind and number of items that have differences on a comparison tab. */
export interface ComparisonTabDiffCount {
  /** The number of items (for example, scenarios) that have differences. */
  count: number
  /** The kind of item, in the singular (for example, "scenario"). */
  kind: string
}

/**
 * Count the check predicates by status.  A scenario or dataset with no predicates (because it could
 * not be resolved) counts as an error, and a test with no scenarios counts as skipped.
 *
 * @param checkReport The check report.
 * @returns The counts.
 */
export function countCheckPredicates(checkReport: CheckReport): CheckPredicateCounts {
  let passed = 0
  let failed = 0
  let errors = 0
  let skipped = 0

  for (const group of checkReport.groups) {
    for (const test of group.tests) {
      // Check if this test was skipped (has no scenarios)
      if (test.scenarios.length === 0) {
        skipped++
        continue
      }

      for (const scenario of test.scenarios) {
        if (scenario.datasets.length === 0) {
          errors++
          continue
        }
        for (const dataset of scenario.datasets) {
          if (dataset.predicates.length === 0) {
            errors++
            continue
          }
          for (const predicate of dataset.predicates) {
            switch (predicate.result.status) {
              case 'passed':
                passed++
                break
              case 'failed':
                failed++
                break
              case 'error':
                errors++
                break
              case 'skipped':
                skipped++
                break
              default:
                break
            }
          }
        }
      }
    }
  }

  return { total: passed + failed + errors + skipped, passed, failed, errors, skipped }
}

/**
 * Return the status of the "Checks" tab.
 *
 * @param counts The numbers of check predicates with each status.
 * @returns The status of the tab.
 */
export function getChecksTabStatus(counts: CheckPredicateCounts): SuiteTabStatus {
  if (counts.total === 0) {
    return {
      status: 'none',
      subtitle: 'no checks'
    }
  }

  if (counts.failed > 0 || counts.errors > 0) {
    const parts: string[] = []
    if (counts.failed > 0) {
      parts.push(`${counts.failed} failed`)
    }
    if (counts.errors > 0) {
      parts.push(counts.errors === 1 ? `${counts.errors} error` : `${counts.errors} errors`)
    }
    return {
      status: 'failed',
      subtitle: parts.join(', ')
    }
  }

  // Show the passed count, and the skipped count if there are any
  const parts: string[] = []
  let status: SuiteTabStatusKind = 'passed'
  if (counts.passed > 0) {
    parts.push(`${counts.passed} passed`)
  }
  if (counts.skipped > 0) {
    parts.push(`${counts.skipped} skipped`)
    status = 'warning'
  }
  return {
    status,
    subtitle: parts.join(', ')
  }
}

/**
 * Return the status of a comparison tab (for example, "Comparisons by scenario").
 *
 * @param diffCount The kind and number of items that have differences.
 * @param skippedScenarioCount The number of scenarios that were skipped.
 * @returns The status of the tab.
 */
export function getComparisonTabStatus(
  diffCount: ComparisonTabDiffCount,
  skippedScenarioCount: number
): SuiteTabStatus {
  if (diffCount.count === 0) {
    if (skippedScenarioCount === 0) {
      // There are no diffs and no skipped scenarios
      return {
        status: 'passed',
        subtitle: 'all clear'
      }
    } else {
      // There are no diffs, but there are skipped scenarios
      const kindPart = skippedScenarioCount === 1 ? 'scenario' : 'scenarios'
      return {
        status: 'warning',
        subtitle: `no diffs, but ${skippedScenarioCount} skipped ${kindPart}`
      }
    }
  }

  // There are diffs
  // TODO: For now we say "diffs" even though some might be errors
  const kindPart = diffCount.count === 1 ? diffCount.kind : `${diffCount.kind}s`
  return {
    status: 'warning',
    subtitle: `${diffCount.count} ${kindPart} with diffs`
  }
}

/**
 * Return the number of comparison groups (for example, scenarios) that have differences, which
 * are all the groups that are not in the "without diffs" category (including the groups with
 * errors and the groups that are only in one of the bundles).
 *
 * @param groupSummaries The categorized group summaries.
 * @returns The number of groups with differences.
 */
export function countComparisonGroupsWithDiffs(groupSummaries: ComparisonGroupSummariesByCategory): number {
  const rowsWithoutDiffsCount = groupSummaries.withoutDiffs?.length || 0
  return groupSummaries.allGroupSummaries.size - rowsWithoutDiffsCount
}

/**
 * Return the kind and number of items that have differences on the "Comparison views" tab.  If one
 * or more views show graphs grouped by diffs and some of those graphs changed, this is the number of
 * changed graphs; otherwise it is the number of views with differences.
 *
 * @param viewGroupSummaries The summaries of the comparison views.
 * @returns The kind and number of items that have differences.
 */
export function getComparisonViewsTabDiffCount(
  viewGroupSummaries: ComparisonViewGroupSummary[]
): ComparisonTabDiffCount {
  let changedGraphCount = 0
  let viewsWithDiffsCount = 0
  for (const viewGroupSummary of viewGroupSummaries) {
    for (const viewSummary of viewGroupSummary.viewSummaries) {
      // TODO: We may end up counting the same graph here multiple times if there are multiple
      // views that use "grouped-by-diffs" mode and display the same subset of graphs in each.
      // Ideally we would get the number of unique graphs with changes here instead.
      const view = viewSummary.view
      if (view.kind === 'view' && view.graphOrder === 'grouped-by-diffs') {
        changedGraphCount += viewSummary.changedGraphCount || 0
      }
      if (viewSummary.hasDiffs) {
        viewsWithDiffsCount++
      }
    }
  }

  if (changedGraphCount > 0) {
    // Show "N graphs with diffs"
    return {
      count: changedGraphCount,
      kind: 'graph'
    }
  } else {
    // Show "N views with diffs"
    return {
      count: viewsWithDiffsCount,
      kind: 'view'
    }
  }
}
