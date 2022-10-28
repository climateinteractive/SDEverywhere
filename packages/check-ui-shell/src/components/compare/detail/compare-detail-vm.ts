// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type { CompareConfig, CompareDataCoordinator, CompareGroup, CompareItem } from '@sdeverywhere/check-core'

import { getScenarioGroups } from '../../../model/groups'
import type { CompareGroupReport } from '../../../model/reports'

import type { CompareDetailRowViewModel } from './compare-detail-row-vm'
import { createCompareDetailRowViewModel } from './compare-detail-row-vm'

export interface CompareDetailViewModel {
  /** The group name (either dataset name or scenario name). */
  groupName: string
  /** The new group name (used for renamed output variables, for example). */
  newGroupName?: string
  /** The secondary name (either dataset source name or scenario position). */
  secondaryName?: string
  /** The new secondary name (used for renamed dataset sources, for example). */
  newSecondaryName?: string
  /** The index of the row before this one. */
  previousRowIndex?: number
  /** The index of the row after this one. */
  nextRowIndex?: number
  /** The string displayed above the list of related items. */
  relatedListHeader: string
  /** The related items for the dataset or scenario. */
  relatedItems: string[]
  /** The rows in this group. */
  rows: CompareDetailRowViewModel[]
}

function createCompareDetailViewModelForDataset(
  compareConfig: CompareConfig,
  dataCoordinator: CompareDataCoordinator,
  groupReport: CompareGroupReport,
  previousRowIndex: number | undefined,
  nextRowIndex: number | undefined
): CompareDetailViewModel {
  // Get the output variable and source name
  const datasetKey = groupReport.key
  const datasetInfo = compareConfig.datasets.getDatasetInfo(datasetKey)

  // Get the related graphs, etc; we only show the information relative to the "right" model
  const relatedItems: string[] = []
  function addRelatedItem(parts: string[]): void {
    const relatedItem = parts.join('&nbsp;<span class="related-sep">&gt;</span>&nbsp;')
    relatedItems.push(relatedItem)
  }
  for (const relatedItem of datasetInfo.relatedItems) {
    addRelatedItem(relatedItem.locationPath)
  }

  // Put the scenarios into ordered groups
  const datasetSummaries = groupReport.datasetSummaries
  const scenarioGroups = getScenarioGroups(compareConfig, datasetSummaries)
  const rows: CompareDetailRowViewModel[] = scenarioGroups.map(group => {
    return createCompareDetailRowViewModel(compareConfig, dataCoordinator, group, false)
  })

  return {
    groupName: datasetInfo.varName,
    newGroupName: datasetInfo.newVarName,
    secondaryName: datasetInfo.sourceName,
    newSecondaryName: datasetInfo.newSourceName,
    previousRowIndex,
    nextRowIndex,
    relatedListHeader: 'Appears in:',
    relatedItems,
    rows
  }
}

function createCompareDetailViewModelForScenario(
  compareConfig: CompareConfig,
  dataCoordinator: CompareDataCoordinator,
  groupReport: CompareGroupReport,
  previousRowIndex: number | undefined,
  nextRowIndex: number | undefined
): CompareDetailViewModel {
  // Get the scenario for the report
  const scenario = compareConfig.scenarios.getScenario(groupReport.key)
  const groupInfo = compareConfig.scenarios.getScenarioGroupInfo(scenario.groupKey)
  const scenarioInfo = compareConfig.scenarios.getScenarioInfo(scenario, scenario.groupKey)

  // Configure the header
  const groupName = groupInfo.title
  let secondaryName: string
  if (scenarioInfo.subtitle) {
    secondaryName = `${scenarioInfo.title} ${scenarioInfo.subtitle}`
  } else {
    secondaryName = scenarioInfo.title
  }

  // Include the related sliders
  const relatedItems: string[] = []
  function addRelatedItem(parts: string[]): void {
    const relatedItem = parts.join('&nbsp;<span class="related-sep">&gt;</span>&nbsp;')
    relatedItems.push(relatedItem)
  }
  for (const relatedItem of groupInfo.relatedItems) {
    addRelatedItem(relatedItem.locationPath)
  }

  // Add one row/box for each dataset in the group
  const datasetSummaries = groupReport.datasetSummaries
  interface Row {
    viewModel: CompareDetailRowViewModel
    maxDiff: number
  }
  const rows: Row[] = []
  for (const datasetSummary of datasetSummaries) {
    const scenario = compareConfig.scenarios.getScenario(datasetSummary.s)
    if (scenario === undefined) {
      continue
    }

    const datasetKey = datasetSummary.d
    const datasetInfo = compareConfig.datasets.getDatasetInfo(datasetKey)
    // TODO: Include both old and new names here, if applicable
    const title = datasetInfo.newVarName || datasetInfo.varName
    const subtitle = datasetInfo.newSourceName || datasetInfo.sourceName
    const compareItem: CompareItem = {
      title,
      subtitle,
      scenario,
      datasetKey
    }
    const compareGroup: CompareGroup = {
      info: {
        title,
        subtitle,
        relatedItems: []
      },
      items: [compareItem]
    }

    rows.push({
      viewModel: createCompareDetailRowViewModel(compareConfig, dataCoordinator, compareGroup, true),
      maxDiff: datasetSummary.md
    })
  }

  // Sort rows by score (highest score at top), then alphabetically by dataset name
  const sortedRows = rows.sort((a, b) => {
    const aScore = a.maxDiff
    const bScore = b.maxDiff
    if (aScore !== bScore) {
      // Sort by score first
      return aScore > bScore ? -1 : 1
    } else {
      // Sort by dataset name alphabetically
      // TODO: Also sort by source name?
      const aDatasetName = a.viewModel.title.toLowerCase()
      const bDatasetName = b.viewModel.title.toLowerCase()
      return aDatasetName.localeCompare(bDatasetName)
    }
  })

  return {
    groupName,
    secondaryName,
    previousRowIndex,
    nextRowIndex,
    relatedListHeader: 'Related items:',
    relatedItems,
    rows: sortedRows.map(r => r.viewModel)
  }
}

export function createCompareDetailViewModel(
  compareConfig: CompareConfig,
  dataCoordinator: CompareDataCoordinator,
  groupReport: CompareGroupReport,
  previousRowIndex: number | undefined,
  nextRowIndex: number | undefined
): CompareDetailViewModel {
  switch (groupReport.grouping) {
    case 'dataset':
      return createCompareDetailViewModelForDataset(
        compareConfig,
        dataCoordinator,
        groupReport,
        previousRowIndex,
        nextRowIndex
      )
    case 'scenario':
      return createCompareDetailViewModelForScenario(
        compareConfig,
        dataCoordinator,
        groupReport,
        previousRowIndex,
        nextRowIndex
      )
    default:
      assertNever(groupReport.grouping)
  }
}
