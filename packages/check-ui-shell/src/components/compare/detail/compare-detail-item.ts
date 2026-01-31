// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type {
  ComparisonConfig,
  ComparisonReportDetailItem,
  ComparisonReportDetailRow,
  ComparisonSortMode,
  ComparisonTestSummary
} from '@sdeverywhere/check-core'

export function groupItemsByTitle(
  comparisonConfig: ComparisonConfig,
  testSummaries: ComparisonTestSummary[],
  itemKind: 'dataset' | 'scenario',
  sortMode: ComparisonSortMode
): ComparisonReportDetailRow[] {
  // Group by title
  const rowsByTitle: Map<string, ComparisonReportDetailRow> = new Map()
  for (const testSummary of testSummaries) {
    const scenario = comparisonConfig.scenarios.getScenario(testSummary.s)
    if (scenario === undefined) {
      continue
    }

    let itemTitle: string
    let itemSubtitle: string
    switch (itemKind) {
      case 'dataset': {
        const dataset = comparisonConfig.datasets.getDataset(testSummary.d)
        if (dataset === undefined) {
          continue
        }
        // TODO: Show renamed variables in red+blue
        const outputVar = dataset.outputVarR || dataset.outputVarL
        itemTitle = outputVar.varName
        itemSubtitle = outputVar.sourceName
        break
      }
      case 'scenario': {
        itemTitle = scenario.title
        itemSubtitle = scenario.subtitle
        break
      }
      default:
        assertNever(itemKind)
    }

    let group = rowsByTitle.get(itemTitle)
    if (group === undefined) {
      group = {
        title: itemTitle,
        score: 0,
        items: []
      }
      rowsByTitle.set(itemTitle, group)
    }

    const item: ComparisonReportDetailItem = {
      title: itemTitle,
      subtitle: itemSubtitle,
      scenario,
      testSummary
    }
    group.items.push(item)

    // Get score based on sort mode
    const score = scoreForSortMode(item.testSummary, sortMode)
    group.score += score || 0
  }

  // Sort the groups by score, with highest scores at the top
  const unsortedGroups = [...rowsByTitle.values()]
  return unsortedGroups.sort((a, b) => {
    return a.score > b.score ? -1 : a.score < b.score ? 1 : 0
  })
}

export function scoreForSortMode(testSummary: ComparisonTestSummary, sortMode: ComparisonSortMode): number | undefined {
  switch (sortMode) {
    case 'max-diff':
      return testSummary.md
    case 'avg-diff':
      return testSummary.ad
    case 'max-diff-relative':
      return testSummary.mdb
    case 'avg-diff-relative':
      return testSummary.adb
    default:
      assertNever(sortMode)
  }
}
