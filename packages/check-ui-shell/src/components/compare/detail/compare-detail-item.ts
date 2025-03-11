// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type {
  ComparisonConfig,
  ComparisonReportDetailItem,
  ComparisonReportDetailRow,
  ComparisonTestSummary
} from '@sdeverywhere/check-core'

export function groupItemsByTitle(
  comparisonConfig: ComparisonConfig,
  testSummaries: ComparisonTestSummary[],
  itemKind: 'dataset' | 'scenario'
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
    group.score += item.testSummary.md
  }

  // Sort the groups by score, with highest scores at the top
  const unsortedGroups = [...rowsByTitle.values()]
  const sortedGroups = unsortedGroups.sort((a, b) => {
    return a.score > b.score ? -1 : a.score < b.score ? 1 : 0
  })

  return sortedGroups
}
