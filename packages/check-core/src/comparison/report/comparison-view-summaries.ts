// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type {
  ComparisonUnresolvedView,
  ComparisonView,
  ComparisonViewGroup
} from '../_shared/comparison-resolved-types'
import type { ComparisonConfig } from '../config/comparison-config'

import { hasSignificantDiffs } from './buckets'
import { groupGraphsByDiffs } from './comparison-graph-grouping'
import { getScoresForTestSummaries } from './comparison-group-scores'
import type { ComparisonCategorizedResults, ComparisonGroupSummary } from './comparison-group-types'
import type { ComparisonTestSummary } from './comparison-report-types'

/** A summary of the differences in a comparison view (a row on the "Comparison views" tab). */
export interface ComparisonViewSummary {
  /** The view. */
  view: ComparisonView | ComparisonUnresolvedView
  /** The group summary for the scenario, if this is a single-scenario view. */
  groupSummary?: ComparisonGroupSummary
  /**
   * The percentage of differences in each bucket (of graphs for a view that shows graphs grouped
   * by diffs, or of datasets otherwise), or undefined if the view is unresolved or has issues.
   */
  diffPercentByBucket?: number[]
  /** The number of graphs with changes, if this is a view that shows graphs grouped by diffs. */
  changedGraphCount?: number
  /** True if the view has significant differences (or is unresolved or has issues). */
  hasDiffs: boolean
}

/** The summaries of the views in a view group (a section on the "Comparison views" tab). */
export interface ComparisonViewGroupSummary {
  /** The view group. */
  viewGroup: ComparisonViewGroup
  /** The summaries of the views in the group. */
  viewSummaries: ComparisonViewSummary[]
}

/**
 * Summarize the differences in each comparison view, as shown on the "Comparison views" tab of
 * the model-check report.
 *
 * @param comparisonConfig The comparison configuration.
 * @param categorizedResults The categorized comparison results.
 * @returns The summaries for each view group.
 */
export function summarizeComparisonViews(
  comparisonConfig: ComparisonConfig,
  categorizedResults: ComparisonCategorizedResults
): ComparisonViewGroupSummary[] {
  const groupsByScenario = categorizedResults.byScenario
  const allTestSummaries = categorizedResults.allTestSummaries

  return comparisonConfig.viewGroups.map(viewGroup => {
    const viewSummaries: ComparisonViewSummary[] = viewGroup.views.map(view => {
      switch (view.kind) {
        case 'view': {
          let summary: ComparisonViewSummary
          if (view.scenario) {
            const groupSummary = groupsByScenario.allGroupSummaries.get(view.scenario.key)
            summary = summarizeViewWithScenario(comparisonConfig, view, groupSummary)
          } else {
            summary = summarizeViewWithFreeformRows(comparisonConfig, view, allTestSummaries)
          }
          // If the scenario has issues or has non-zero differences, treat it as a view with diffs
          summary.hasDiffs = hasSignificantDiffs(summary.diffPercentByBucket)
          return summary
        }
        case 'unresolved-view':
          // If the view is unresolved, treat it as a view with diffs
          return { view, hasDiffs: true }
        default:
          assertNever(view)
      }
    })
    return { viewGroup, viewSummaries }
  })
}

/**
 * Summarize the differences in a single-scenario comparison view.
 *
 * @param comparisonConfig The comparison configuration.
 * @param view The view.
 * @param groupSummary The group summary for the scenario used in the view.
 */
function summarizeViewWithScenario(
  comparisonConfig: ComparisonConfig,
  view: ComparisonView,
  groupSummary: ComparisonGroupSummary
): ComparisonViewSummary {
  if (view.graphOrder === 'grouped-by-diffs') {
    // Use the graph differences (instead of the dataset differences) for the purposes of computing
    // bucket colors for the bar
    const testSummaries = groupSummary.group.testSummaries
    const grouped = groupGraphsByDiffs(comparisonConfig, view.scenario.key, testSummaries, view.graphIds)
    return {
      view,
      groupSummary,
      diffPercentByBucket: grouped.diffPercentByBucket,
      changedGraphCount: grouped.nonZeroDiffCount,
      hasDiffs: false
    }
  } else {
    // Otherwise, use the dataset differences
    // TODO: We should only look at datasets that appear in the specified graphs, not all datasets
    return {
      view,
      groupSummary,
      diffPercentByBucket: groupSummary.scores?.diffPercentByBucket,
      hasDiffs: false
    }
  }
}

/**
 * Summarize the differences in a comparison view that has freeform rows.
 *
 * @param comparisonConfig The comparison configuration.
 * @param view The view.
 * @param allTestSummaries All the comparison test summaries.
 */
function summarizeViewWithFreeformRows(
  comparisonConfig: ComparisonConfig,
  view: ComparisonView,
  allTestSummaries: ComparisonTestSummary[]
): ComparisonViewSummary {
  // Get the comparison test results for the boxes used in this view
  const testSummariesForView: ComparisonTestSummary[] = []
  for (const row of view.rows) {
    for (const box of row.boxes) {
      // TODO: For now we assume that we only show boxes that have a fully resolved dataset/scenario
      // pairing.  If we change that assumption, this code may need to change to only include the
      // results where both sides are valid/resolved.
      const testSummary = allTestSummaries.find(s => s.d === box.dataset.key && s.s === box.scenario.key)
      if (testSummary) {
        testSummariesForView.push(testSummary)
      }
    }
  }

  // Determine the number of differences per bucket
  // TODO: For now, we only sort by `maxDiff` here; this should be changed to use the active sort mode
  const scoresForView = getScoresForTestSummaries(testSummariesForView, comparisonConfig.thresholds, 'max-diff')
  return {
    view,
    diffPercentByBucket: scoresForView.diffPercentByBucket,
    hasDiffs: false
  }
}
