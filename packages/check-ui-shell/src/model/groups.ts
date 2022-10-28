// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type {
  CompareConfig,
  CompareDatasetSummary,
  CompareGroup,
  CompareGroupInfo,
  CompareItem,
  ScenarioGroupKey
} from '@sdeverywhere/check-core'

interface CompareSummaryGroup {
  groupKey: ScenarioGroupKey
  info: CompareGroupInfo
  totalMaxDiff: number
  itemMap: Map<number, CompareItem>
}

/**
 * Organize the given comparison results by grouping items in the same scenario group.
 *
 * @param compareConfig The compare configuration.
 * @param datasetSummaries The comparison summaries.
 */
export function getScenarioGroups(
  compareConfig: CompareConfig,
  datasetSummaries: CompareDatasetSummary[]
): CompareGroup[] {
  // Group the comparison summaries by their associated group key
  const unorderedGroups: Map<ScenarioGroupKey, CompareSummaryGroup> = new Map()
  for (const datasetSummary of datasetSummaries) {
    const scenarioKey = datasetSummary.s
    const scenario = compareConfig.scenarios.getScenario(scenarioKey)
    if (scenario === undefined) {
      continue
    }
    const groupKey = scenario.groupKey
    const scenarioInfo = compareConfig.scenarios.getScenarioInfo(scenario, groupKey)
    if (scenarioInfo === undefined) {
      continue
    }

    let group = unorderedGroups.get(groupKey)
    if (!group) {
      const groupInfo = compareConfig.scenarios.getScenarioGroupInfo(groupKey)
      if (groupInfo === undefined) {
        continue
      }
      group = {
        groupKey,
        info: groupInfo,
        totalMaxDiff: 0,
        itemMap: new Map()
      }
      unorderedGroups.set(groupKey, group)
    }
    group.totalMaxDiff += datasetSummary.md

    const compareItem: CompareItem = {
      title: scenarioInfo.title,
      subtitle: scenarioInfo.subtitle,
      scenario: scenario,
      datasetKey: datasetSummary.d
    }
    group.itemMap.set(scenarioInfo.position, compareItem)
  }

  // Pull out the primary "All Inputs" group
  const primaryGroup = unorderedGroups.get('all_inputs')
  unorderedGroups.delete('all_inputs')

  // Following that, one row for each input that has significant differences,
  // sorted so that scenarios with the most differences are at top
  const unorderedGroupsArray = Array.from(unorderedGroups.values())
  const orderedGroups = unorderedGroupsArray.sort((a, b) => (a.totalMaxDiff > b.totalMaxDiff ? -1 : 1))

  // Always show the "All Inputs" group as the first row
  orderedGroups.unshift(primaryGroup)

  // Get the "all inputs at default" item
  // TODO: This assumes that we always run the "all inputs at default" scenario;
  // should try to remove this assumption
  const allAtDefaultItem = primaryGroup.itemMap.get(0)

  // Convert each `CompareSummaryGroup` to a `CompareGroup`; this will insert
  // the "all inputs at default" item as the first item in each row, if needed
  const compareGroups: CompareGroup[] = []
  for (const summaryGroup of orderedGroups) {
    if (!summaryGroup.itemMap.has(0)) {
      // Add the "at default" scenario on the left (only if there wasn't already
      // an item defined for that position).  Note that the chart and data for
      // the `at-default` scenario for the input rows is the same as the primary
      // "All Inputs" row since there is no difference between the two.  We
      // duplicate it in each row so that it can be used for reference when
      // viewing the other scenarios in the row.
      const groupKey = summaryGroup.groupKey
      const atDefaultInfo = compareConfig.scenarios.getScenarioInfo(allAtDefaultItem.scenario, groupKey)
      summaryGroup.itemMap.set(0, {
        title: atDefaultInfo.title,
        subtitle: atDefaultInfo.subtitle,
        scenario: allAtDefaultItem.scenario,
        datasetKey: allAtDefaultItem.datasetKey
      })
    }

    // Add the group
    compareGroups.push(createCompareGroupFromSummaryGroup(summaryGroup))
  }

  return compareGroups
}

/**
 * Convert the summary group into a `CompareGroup` with the "all inputs at default"
 * item as the first item, followed by the other items ordered according to their
 * `position` value.
 */
function createCompareGroupFromSummaryGroup(summaryGroup: CompareSummaryGroup): CompareGroup {
  const items: CompareItem[] = []

  function addItem(item: CompareItem | undefined): void {
    // Note that if a scenario wasn't run for this position, we will add
    // `undefined` to the array, which will leave an empty box
    items.push(item)
  }

  // TODO: Generalize this to allow for layouts with a different number of items
  // (instead of assuming 3 items per row)
  addItem(summaryGroup.itemMap.get(0))
  addItem(summaryGroup.itemMap.get(1))
  addItem(summaryGroup.itemMap.get(2))

  return {
    info: summaryGroup.info,
    items
  }
}
