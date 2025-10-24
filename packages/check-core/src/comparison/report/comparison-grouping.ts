// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { ComparisonConfig } from '../config/comparison-config'
import type { ComparisonDataset, ComparisonScenario } from '../_shared/comparison-resolved-types'

import type {
  ComparisonCategorizedResults,
  ComparisonGroup,
  ComparisonGroupKey,
  ComparisonGroupKind,
  ComparisonGroupScores,
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary
} from './comparison-group-types'
import type { ComparisonTestSummary } from './comparison-report-types'
import { restoreFromTerseSummaries } from './comparison-reporting'
import { getScoresForTestSummaries } from './comparison-group-scores'

/**
 * Given a set of terse test summaries (which only includes summaries for tests with non-zero `maxDiff`
 * scores), restore the full set of summaries and then categorize them.
 *
 * @param comparisonConfig The comparison configuration.
 * @param terseSummaries The set of terse test summaries.
 */
export function categorizeComparisonTestSummaries(
  comparisonConfig: ComparisonConfig,
  terseSummaries: ComparisonTestSummary[]
): ComparisonCategorizedResults {
  // Restore the full set of test results
  const allTestSummaries = restoreFromTerseSummaries(comparisonConfig, terseSummaries)

  // Categorize the results by scenario
  const groupsByScenario = groupComparisonTestSummaries(allTestSummaries, 'by-scenario')
  const byScenario = categorizeComparisonGroups(comparisonConfig, [...groupsByScenario.values()])

  // Categorize the results by dataset
  const groupsByDataset = groupComparisonTestSummaries(allTestSummaries, 'by-dataset')
  const byDataset = categorizeComparisonGroups(comparisonConfig, [...groupsByDataset.values()])

  return {
    allTestSummaries,
    byScenario,
    byDataset
  }
}

/**
 * Group the given comparison test summaries, returning one `ComparisonGroup` for each group.
 */
export function groupComparisonTestSummaries(
  testSummaries: ComparisonTestSummary[],
  groupKind: ComparisonGroupKind
): Map<ComparisonGroupKey, ComparisonGroup> {
  const groups: Map<ComparisonGroupKey, ComparisonGroup> = new Map()

  for (const testSummary of testSummaries) {
    let groupKey: ComparisonGroupKey
    switch (groupKind) {
      case 'by-dataset':
        groupKey = testSummary.d
        break
      case 'by-scenario':
        groupKey = testSummary.s
        break
      default:
        assertNever(groupKind)
    }

    const group = groups.get(groupKey)
    if (group) {
      group.testSummaries.push(testSummary)
    } else {
      groups.set(groupKey, {
        kind: groupKind,
        key: groupKey,
        testSummaries: [testSummary]
      })
    }
  }

  return groups
}

/**
 * Given a set of `ComparisonGroup` instances, organize and sort the groups into the
 * following categories:
 *
 * withErrors
 *   groups with items that have errors (are not valid) for both "left" and "right" models
 *
 * onlyInLeft
 *   groups with items that are only valid for the "left" model (for example, datasets that
 *   were removed and no longer available in the "right" model)
 *
 * onlyInRight
 *   groups with items that are only valid for the "right" model (for example, scenarios
 *   for inputs that were added in the "right" model)
 *
 * withDiffs
 *   groups with one or more comparisons that have non-zero `maxDiff` scores; the groups
 *   will be sorted by `maxDiff`, with higher scores at the front of the array
 *
 * withoutDiffs
 *   groups where all comparisons have `maxDiff` scores of zero (no differences between
 *   "left" and "right")
 */
export function categorizeComparisonGroups(
  comparisonConfig: ComparisonConfig,
  allGroups: ComparisonGroup[]
): ComparisonGroupSummariesByCategory {
  const allGroupSummaries: Map<ComparisonGroupKey, ComparisonGroupSummary> = new Map()
  const withErrors: ComparisonGroupSummary[] = []
  const onlyInLeft: ComparisonGroupSummary[] = []
  const onlyInRight: ComparisonGroupSummary[] = []
  let withDiffs: ComparisonGroupSummary[] = []
  const withoutDiffs: ComparisonGroupSummary[] = []

  function addSummaryForGroup(
    group: ComparisonGroup,
    root: ComparisonDataset | ComparisonScenario,
    validInL: boolean,
    validInR: boolean
  ): void {
    // Compute the scores if the dataset/scenario is valid in both
    let scores: ComparisonGroupScores
    if (validInL && validInR) {
      scores = getScoresForTestSummaries(group.testSummaries, comparisonConfig.thresholds)
    }

    // Create the group summary
    const groupSummary: ComparisonGroupSummary = {
      root,
      group,
      scores
    }

    // Add to the map of all summaries
    allGroupSummaries.set(group.key, groupSummary)

    // Categorize the group
    if (validInL && validInR) {
      // The dataset/scenario is valid in both; see if there were any diffs
      const noDiffCount = scores.diffCountByBucket[0]
      const skippedCount = scores.diffCountByBucket[5]
      if (scores.totalDiffCount !== noDiffCount + skippedCount) {
        withDiffs.push(groupSummary)
      } else {
        withoutDiffs.push(groupSummary)
      }
    } else if (validInL) {
      // The dataset/scenario is valid in "left" only
      onlyInLeft.push(groupSummary)
    } else if (validInR) {
      // The dataset/scenario is valid in "right" only
      onlyInRight.push(groupSummary)
    } else {
      // The dataset/scenario is not valid in either "left" or "right"
      withErrors.push(groupSummary)
    }
  }

  // Add a summary for each group
  for (const group of allGroups.values()) {
    switch (group.kind) {
      case 'by-dataset': {
        // Get the `ComparisonDataset` instance for this dataset key
        const dataset = comparisonConfig.datasets.getDataset(group.key)
        const validInL = dataset?.outputVarL !== undefined
        const validInR = dataset?.outputVarR !== undefined
        addSummaryForGroup(group, dataset, validInL, validInR)
        break
      }
      case 'by-scenario': {
        // Get the `ComparisonScenario` instance for this scenario key
        const scenario = comparisonConfig.scenarios.getScenario(group.key)
        const validInL = scenario?.specL !== undefined
        const validInR = scenario?.specR !== undefined
        addSummaryForGroup(group, scenario, validInL, validInR)
        break
      }
      default:
        assertNever(group.kind)
    }
  }

  if (withDiffs.length > 1) {
    // Sort the `withDiffs` summaries by score and name/title
    if (withDiffs[0].group.kind === 'by-dataset') {
      withDiffs = sortDatasetGroupSummaries(withDiffs)
    } else if (withDiffs[0].group.kind === 'by-scenario') {
      withDiffs = sortScenarioGroupSummaries(withDiffs)
    }
  }

  // TODO: Sort the `withoutDiffs` summaries according to the order that they were defined
  // in the config

  return {
    allGroupSummaries,
    withErrors,
    onlyInLeft,
    onlyInRight,
    withDiffs,
    withoutDiffs
  }
}

/**
 * NOTE: This currently can only be used in cases where the dataset/variable is
 * defined in both "left" and "right".
 */
function sortDatasetGroupSummaries(summaries: ComparisonGroupSummary[]): ComparisonGroupSummary[] {
  return summaries.sort((a, b) => {
    const scoreResult = compareScores(a.scores, b.scores)
    if (scoreResult !== 0) {
      // Sort by score first (higher scores followed by lower scores)
      return -scoreResult
    } else {
      // Sort by variable/source name alphabetically if scores match.  Note
      // that we use the "left" name for sorting purposes for now, in the case
      // where a variable was renamed
      const aVar = (a.root as ComparisonDataset).outputVarL
      const bVar = (b.root as ComparisonDataset).outputVarR
      const aSource = aVar.sourceName?.toLowerCase() || ''
      const bSource = bVar.sourceName?.toLowerCase() || ''
      if (aSource !== bSource) {
        // Sort by source name (non-model variables follow model variables)
        return aSource.localeCompare(bSource)
      } else {
        // Sort by dataset name alphabetically
        const aName = aVar.varName.toLowerCase()
        const bName = bVar.varName.toLowerCase()
        return aName.localeCompare(bName)
      }
    }
  })
}

/**
 * NOTE: This currently can only be used in cases where the scenario is
 * defined in both "left" and "right".
 */
function sortScenarioGroupSummaries(summaries: ComparisonGroupSummary[]): ComparisonGroupSummary[] {
  return summaries.sort((a, b) => {
    const scoreResult = compareScores(a.scores, b.scores)
    if (scoreResult !== 0) {
      // Sort by score first (higher scores followed by lower scores)
      return -scoreResult
    } else {
      // Sort by scenario title alphabetically if scores match
      const aScenario = a.root as ComparisonScenario
      const bScenario = b.root as ComparisonScenario
      const aTitle = aScenario.title.toLowerCase()
      const bTitle = bScenario.title.toLowerCase()
      if (aTitle !== bTitle) {
        // Sort by scenario name
        return aTitle.localeCompare(bTitle)
      } else {
        // Sort by scenario subtitle alphabetically
        const aSubtitle = aScenario.subtitle?.toLowerCase() || ''
        const bSubtitle = bScenario.subtitle?.toLowerCase() || ''
        return aSubtitle.localeCompare(bSubtitle)
      }
    }
  })
}

/**
 * Return 1 if the most significant score in `a` is higher than that of `b`, -1 if `b` is higher than `a`,
 * or 0 if they are the same.
 */
function compareScores(a: ComparisonGroupScores, b: ComparisonGroupScores): 1 | 0 | -1 {
  if (a.totalMaxDiffByBucket.length !== b.totalMaxDiffByBucket.length) {
    return 0
  }

  // Start with the highest threshold bucket (i.e., comparisons with the biggest differences),
  // and then work backwards
  const len = a.totalMaxDiffByBucket.length
  for (let i = len - 1; i >= 0; i--) {
    const aTotal = a.totalMaxDiffByBucket[i]
    const bTotal = b.totalMaxDiffByBucket[i]
    if (aTotal > bTotal) {
      return 1
    } else if (aTotal < bTotal) {
      return -1
    }
  }

  // No differences
  return 0
}
