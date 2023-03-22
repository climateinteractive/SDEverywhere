// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'

import type { ComparisonConfig, ComparisonScenario, ComparisonTestSummary } from '@sdeverywhere/check-core'

export interface ComparisonDetailItem {
  title: string
  subtitle?: string
  scenario: ComparisonScenario
  testSummary: ComparisonTestSummary
}

export interface ComparisonDetailItemGroup {
  /** The title for the group. */
  title: string
  /** The sum of the `maxDiff` score for all items in the group. */
  totalMaxDiff: number
  /** The items in this group (one item per box). */
  items: ComparisonDetailItem[]
}

export function groupItemsByTitle(
  comparisonConfig: ComparisonConfig,
  testSummaries: ComparisonTestSummary[],
  itemKind: 'dataset' | 'scenario'
): ComparisonDetailItemGroup[] {
  // Group by title
  const groupsByTitle: Map<string, ComparisonDetailItemGroup> = new Map()
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

    let group = groupsByTitle.get(itemTitle)
    if (group === undefined) {
      group = {
        title: itemTitle,
        totalMaxDiff: 0,
        items: []
      }
      groupsByTitle.set(itemTitle, group)
    }

    const item: ComparisonDetailItem = {
      title: itemTitle,
      subtitle: itemSubtitle,
      scenario,
      testSummary
    }
    group.items.push(item)
    group.totalMaxDiff += item.testSummary.md
  }

  // Sort the groups by score, with highest scores at the top
  const unsortedGroups = [...groupsByTitle.values()]
  const sortedGroups = unsortedGroups.sort((a, b) => {
    return a.totalMaxDiff > b.totalMaxDiff ? 1 : a.totalMaxDiff < b.totalMaxDiff ? -1 : 0
  })

  return sortedGroups
}
