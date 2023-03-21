// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { CompareConfig } from '../config/compare-config'
import type { CompareDataset, CompareScenario } from '../_shared/compare-resolved-types'

import { getBucketIndex } from './buckets'
import type { CompareDatasetSummary } from './compare-summary'

export type ComparisonGroupKind = 'by-dataset' | 'by-scenario'
export type ComparisonGroupKey = string // DatasetKey | CompareScenarioKey

/**
 * A group of comparison summaries associated with a particular scenario or dataset.
 */
export interface ComparisonGroup {
  /** The kind of group, either 'by-dataset' or 'by-scenario'. */
  kind: ComparisonGroupKind
  /**
   * The unique key for this group (a `DatasetKey` if grouped by dataset, or a
   * `CompareScenarioKey` if grouped by scenario).
   */
  key: ComparisonGroupKey
  /** The comparison summaries for this group. */
  summaries: CompareDatasetSummary[]
}

/** Metadata for the dataset that is associated with the comparisons in this group. */
export interface ComparisonGroupDatasetRoot {
  kind: 'dataset-root'
  /** The resolved `CompareDataset` associated with the comparisons in this group. */
  dataset: CompareDataset
}

/** Metadata for the scenario that is associated with the comparisons in this group. */
export interface ComparisonGroupScenarioRoot {
  kind: 'scenario-root'
  /** The resolved `CompareScenario` associated with the comparisons in this group. */
  scenario: CompareScenario
}

/** Describes the "root" or primary item for a group of comparisons. */
export type ComparisonGroupRoot = ComparisonGroupDatasetRoot | ComparisonGroupScenarioRoot

/** A summary of scores for a group of comparisons. */
export interface ComparisonGroupScores {
  /** The total number of comparisons (sample size) for this group. */
  totalDiffCount: number
  /** The sum of the `maxDiff` values for each threshold bucket. */
  totalMaxDiffByBucket: number[]
  /** The number of comparisons that fall into each threshold bucket. */
  diffCountByBucket: number[]
  /** The percentage of comparisons that fall into each threshold bucket. */
  diffPercentByBucket: number[]
}

/**
 * A summary of a group of comparisons that includes the resolved scenario/dataset metadata
 * and score information for the group.
 */
export interface ComparisonGroupSummary {
  /** The metadata for the "root" or primary item for this group of comparisons. */
  root: ComparisonGroupRoot
  /** The group containing the comparison summaries. */
  group: ComparisonGroup
  /** The scores for this group, or undefined if comparisons were not performed for this group. */
  scores?: ComparisonGroupScores
}

export interface ComparisonGroupSummariesByCategory {
  /**
   * Groups with items that are only valid for the "left" model (for example, datasets that
   * were removed and no longer available in the "right" model).
   */
  onlyInLeft: ComparisonGroupSummary[]
  /**
   * Groups with items that are only valid for the "right" model (for example, scenarios
   * for inputs that were added in the "right" model).
   */
  onlyInRight: ComparisonGroupSummary[]
  /**
   * Groups with one or more comparisons that have non-zero `maxDiff` scores; the groups
   * will be sorted by `maxDiff`, with higher scores at the front of the array.
   */
  withDiffs: ComparisonGroupSummary[]
  /**
   * Groups where all comparisons have `maxDiff` scores of zero (no differences between
   * "left" and "right").
   */
  withoutDiffs: ComparisonGroupSummary[]
}

/**
 * Group the given comparison summaries, returning one `CompareGroupReport` for each group.
 */
export function groupComparisonSummaries(
  datasetSummaries: CompareDatasetSummary[],
  groupKind: ComparisonGroupKind
): Map<ComparisonGroupKey, ComparisonGroup> {
  const groups: Map<ComparisonGroupKey, ComparisonGroup> = new Map()

  for (const datasetSummary of datasetSummaries) {
    let groupKey: ComparisonGroupKey
    switch (groupKind) {
      case 'by-dataset':
        groupKey = datasetSummary.d
        break
      case 'by-scenario':
        groupKey = datasetSummary.s
        break
      default:
        assertNever(groupKind)
    }

    const group = groups.get(groupKey)
    if (group) {
      group.summaries.push(datasetSummary)
    } else {
      groups.set(groupKey, {
        kind: groupKind,
        key: groupKey,
        summaries: [datasetSummary]
      })
    }
  }

  return groups
}

/**
 * Given a set of `ComparisonGroup` instances, organize and sort the groups into the
 * following categories:
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
  compareConfig: CompareConfig,
  allGroups: ComparisonGroup[]
): ComparisonGroupSummariesByCategory {
  const onlyInLeft: ComparisonGroupSummary[] = []
  const onlyInRight: ComparisonGroupSummary[] = []
  let withDiffs: ComparisonGroupSummary[] = []
  const withoutDiffs: ComparisonGroupSummary[] = []

  for (const group of allGroups) {
    // Get root item for group
    switch (group.kind) {
      case 'by-dataset': {
        // Get the `CompareDataset` instance for this dataset key
        const dataset = compareConfig.datasets.getDataset(group.key)
        if (dataset?.outputVarL && dataset?.outputVarR) {
          // The variable exists in both; see if there were any diffs
          const scores = getScoresForGroup(group, compareConfig.thresholds)
          const groupSummary = getGroupSummaryForDataset(dataset, group, scores)
          if (scores.totalDiffCount !== scores.diffCountByBucket[0]) {
            withDiffs.push(groupSummary)
          } else {
            withoutDiffs.push(groupSummary)
          }
        } else if (dataset?.outputVarL) {
          // The variable existed in the left, but was removed in the right
          onlyInLeft.push(getGroupSummaryForDataset(dataset, group, undefined))
        } else if (dataset?.outputVarR) {
          // The variable was added in the right
          onlyInRight.push(getGroupSummaryForDataset(dataset, group, undefined))
        } else {
          // The variable is not in either; this should not happen in
          // practice so treat it as a (soft) error
          console.error(`ERROR: No dataset found in categorizeComparisonGroups for key=${group.key}`)
        }
        break
      }
      case 'by-scenario': {
        // TODO: This is almost identical to the case above; should merge them
        // Get the `CompareScenario` instance for this dataset key
        const scenario = compareConfig.scenarios.getScenario(group.key)
        if (scenario?.specL && scenario?.specR) {
          // The scenario is valid in both; see if there were any diffs
          const scores = getScoresForGroup(group, compareConfig.thresholds)
          const groupSummary = getGroupSummaryForScenario(scenario, group, scores)
          if (scores.totalDiffCount !== scores.diffCountByBucket[0]) {
            withDiffs.push(groupSummary)
          } else {
            withoutDiffs.push(groupSummary)
          }
        } else if (scenario?.specL) {
          // The scenario was valid in the left, but not in the right
          onlyInLeft.push(getGroupSummaryForScenario(scenario, group, undefined))
        } else if (scenario?.specR) {
          // The scenario is only valid in the right
          onlyInRight.push(getGroupSummaryForScenario(scenario, group, undefined))
        } else {
          // The scenario is not valid in either; this should not happen in
          // practice so treat it as a (soft) error
          console.error(`ERROR: No scenario found in categorizeComparisonGroups for key=${group.key}`)
        }
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
    onlyInLeft,
    onlyInRight,
    withDiffs,
    withoutDiffs
  }
}

function getGroupSummaryForDataset(
  dataset: CompareDataset,
  group: ComparisonGroup,
  scores: ComparisonGroupScores | undefined
): ComparisonGroupSummary {
  return {
    root: {
      kind: 'dataset-root',
      dataset
    },
    group,
    scores
  }
}

function getGroupSummaryForScenario(
  scenario: CompareScenario,
  group: ComparisonGroup,
  scores: ComparisonGroupScores | undefined
): ComparisonGroupSummary {
  return {
    root: {
      kind: 'scenario-root',
      scenario
    },
    group,
    scores
  }
}

function getScoresForGroup(group: ComparisonGroup, thresholds: number[]): ComparisonGroupScores {
  // Add up scores and group them into buckets
  const diffCountByBucket = Array(thresholds.length + 2).fill(0)
  const totalMaxDiffByBucket = Array(thresholds.length + 2).fill(0)
  let totalDiffCount = 0
  for (const summary of group.summaries) {
    const bucketIndex = getBucketIndex(summary.md, thresholds)
    diffCountByBucket[bucketIndex]++
    totalMaxDiffByBucket[bucketIndex] += summary.md
    totalDiffCount++
  }

  // Get the percentage of diffs for each bucket relative to the total number
  // of scenarios for this output variable
  let diffPercentByBucket: number[]
  if (totalDiffCount > 0) {
    diffPercentByBucket = diffCountByBucket.map(count => (count / totalDiffCount) * 100)
  } else {
    diffPercentByBucket = []
  }

  return {
    totalDiffCount,
    totalMaxDiffByBucket,
    diffCountByBucket,
    diffPercentByBucket
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
      const aVar = (a.root as ComparisonGroupDatasetRoot).dataset.outputVarL
      const bVar = (b.root as ComparisonGroupDatasetRoot).dataset.outputVarR
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
      const aScenario = (a.root as ComparisonGroupScenarioRoot).scenario
      const bScenario = (b.root as ComparisonGroupScenarioRoot).scenario
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
