// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CompareConfig, OutputVar, Scenario } from '@sdeverywhere/check-core'

import type { CompareGroupReport, GroupedReports } from '../../../model/reports'
import type { CompareGraphsViewModel } from '../graphs/compare-graphs-vm'

import type { CompareSummaryRowViewModel } from './compare-summary-row-vm'

export interface CompareSummarySectionViewModel {
  header: string
  rows: CompareSummaryRowViewModel[]
}

export interface CompareSummaryViewModel {
  allRows: CompareSummaryRowViewModel[]
  allGraphs?: CompareSummarySectionViewModel
  datasetsAdded?: CompareSummarySectionViewModel
  datasetsRemoved?: CompareSummarySectionViewModel
  datasetsWithDiffs?: CompareSummarySectionViewModel
  datasetsWithoutDiffs?: CompareSummarySectionViewModel
  scenariosWithDiffs?: CompareSummarySectionViewModel
  scenariosWithoutDiffs?: CompareSummarySectionViewModel
}

export function createCompareSummaryViewModel(
  compareConfig: CompareConfig,
  groupedReports: GroupedReports,
  compareGraphsViewModel: CompareGraphsViewModel | undefined
): CompareSummaryViewModel {
  const modelSpecL = compareConfig.bundleL.model.modelSpec
  const modelSpecR = compareConfig.bundleR.model.modelSpec

  function rowForDataset(
    outputVar: OutputVar,
    report: CompareGroupReport,
    striped = false
  ): CompareSummaryRowViewModel {
    return {
      groupName: outputVar.varName,
      secondaryName: outputVar.sourceName,
      diffPercentByBucket: report.diffPercentByBucket,
      totalScore: report.totalScore,
      groupKey: report.key,
      striped
    }
  }

  // Put the reports into groups (by dataset)
  const datasetAddedRows: CompareSummaryRowViewModel[] = []
  const datasetRemovedRows: CompareSummaryRowViewModel[] = []
  const datasetWithDiffsRows: CompareSummaryRowViewModel[] = []
  const datasetWithoutDiffsRows: CompareSummaryRowViewModel[] = []
  for (const report of groupedReports.byDataset) {
    const datasetKeyL = report.key
    const datasetKeyR = compareConfig.datasets.renamedDatasetKeys?.get(datasetKeyL) || datasetKeyL
    const outputVarL = modelSpecL.outputVars.get(datasetKeyL)
    const outputVarR = modelSpecR.outputVars.get(datasetKeyR)
    if (outputVarL && outputVarR) {
      // The variable exists in both
      const noDiffs = report.diffCountByBucket[0] === report.totalDiffCount
      if (noDiffs) {
        datasetWithoutDiffsRows.push(rowForDataset(outputVarR, report))
      } else {
        datasetWithDiffsRows.push(rowForDataset(outputVarR, report))
      }
    } else if (outputVarL) {
      // The variable existed in the left, but was removed in the right
      datasetRemovedRows.push(rowForDataset(outputVarL, report, true))
    } else if (outputVarR) {
      // The variable was added in the right
      datasetAddedRows.push(rowForDataset(outputVarR, report, true))
    } else {
      // The variable is not in either; this should not happen in
      // practice so treat it as a (soft) error
      console.error(`ERROR: No variable information for ${datasetKeyL}`)
      continue
    }
  }

  function rowForScenario(scenario: Scenario, report: CompareGroupReport, striped = false): CompareSummaryRowViewModel {
    const groupInfo = compareConfig.scenarios.getScenarioGroupInfo(scenario.groupKey)
    const scenarioInfo = compareConfig.scenarios.getScenarioInfo(scenario, scenario.groupKey)
    return {
      groupName: groupInfo.title,
      secondaryName: scenarioInfo.title,
      diffPercentByBucket: report.diffPercentByBucket,
      totalScore: report.totalScore,
      groupKey: report.key,
      striped
    }
  }

  // Put the reports into groups (by scenario)
  const scenarioWithDiffsRows: CompareSummaryRowViewModel[] = []
  const scenarioWithoutDiffsRows: CompareSummaryRowViewModel[] = []
  for (const report of groupedReports.byScenario) {
    // TODO: Handle renames?
    const scenarioKey = report.key
    const scenario = compareConfig.scenarios.getScenario(scenarioKey)
    if (scenario) {
      const noDiffs = report.diffCountByBucket[0] === report.totalDiffCount
      if (noDiffs) {
        scenarioWithoutDiffsRows.push(rowForScenario(scenario, report))
      } else {
        scenarioWithDiffsRows.push(rowForScenario(scenario, report))
      }
    }
  }

  // Sort reports in each group so that the ones with the most differences
  // come first, then sort alphabetically
  function sortDatasetRows(rows: CompareSummaryRowViewModel[]): CompareSummaryRowViewModel[] {
    return rows.sort((a, b) => {
      const aScore = a.totalScore
      const bScore = b.totalScore
      if (aScore !== bScore) {
        // Sort by score first
        return aScore > bScore ? -1 : 1
      } else {
        // Sort by variable/source name alphabetically if scores match
        const aSource = a.secondaryName?.toLowerCase() || ''
        const bSource = b.secondaryName?.toLowerCase() || ''
        if (aSource !== bSource) {
          // Sort by source name (non-model variables follow model variables)
          return aSource.localeCompare(bSource)
        } else {
          // Sort by dataset name alphabetically
          const aName = a.groupName.toLowerCase()
          const bName = b.groupName.toLowerCase()
          return aName.localeCompare(bName)
        }
      }
    })
  }
  function sortScenarioRows(rows: CompareSummaryRowViewModel[]): CompareSummaryRowViewModel[] {
    return rows.sort((a, b) => {
      const aScore = a.totalScore
      const bScore = b.totalScore
      if (aScore !== bScore) {
        // Sort by score first
        return aScore > bScore ? -1 : 1
      } else {
        // Sort by scenario name alphabetically if scores match
        const aName = a.groupName.toLowerCase()
        const bName = b.groupName.toLowerCase()
        if (aName !== bName) {
          // Sort by scenario name
          return aName.localeCompare(bName)
        } else {
          // Sort by scenario position alphabetically
          const aPos = a.secondaryName?.toLowerCase() || ''
          const bPos = b.secondaryName?.toLowerCase() || ''
          return aPos.localeCompare(bPos)
        }
      }
    })
  }

  // Helper that prepends the given string with `count` and replaces `<replace>`
  // with `<replace>s` if count is not one
  function countString(count: number, s: string, replace: string): string {
    return `${count} ${count !== 1 ? s.replace(replace, `${replace}s`) : s}`
  }

  function section(
    rows: CompareSummaryRowViewModel[],
    header: string,
    count = true
  ): CompareSummarySectionViewModel | undefined {
    if (rows.length > 0) {
      let sortedRows: CompareSummaryRowViewModel[]
      let replace: string
      if (header.includes('output')) {
        sortedRows = sortDatasetRows(rows)
        replace = 'variable'
      } else {
        sortedRows = sortScenarioRows(rows)
        replace = 'scenario'
      }
      return {
        header: count ? countString(rows.length, header, replace) : header,
        rows: sortedRows
      }
    } else {
      return undefined
    }
  }

  // Build the special "All Graphs" section
  let allGraphs: CompareSummarySectionViewModel
  if (compareGraphsViewModel) {
    const hasDiffs = compareGraphsViewModel.hasDiffs
    const row: CompareSummaryRowViewModel = {
      groupName: 'All Graphs',
      diffPercentByBucket: compareGraphsViewModel.diffPercentByBucket,
      totalScore: 0,
      striped: false
    }
    allGraphs = {
      header: `${hasDiffs ? 'Some' : 'No'} differences detected in graphs…`,
      rows: [row]
    }
  }

  // Build the output/scenario comparison sections
  const datasetsAdded = section(datasetAddedRows, 'added output variable…')
  const datasetsRemoved = section(datasetRemovedRows, 'removed output variable…')
  const datasetsWithDiffs = section(datasetWithDiffsRows, 'output variable with differences…')
  const datasetsWithoutDiffs = section(
    datasetWithoutDiffsRows,
    'No differences detected for the following outputs…',
    false
  )
  const scenariosWithDiffs = section(scenarioWithDiffsRows, 'scenario producing differences…')
  const scenariosWithoutDiffs = section(
    scenarioWithoutDiffsRows,
    'No differences produced by the following scenarios…',
    false
  )

  // Create a flat array of all rows to make it easier to set up the navigation links
  const allRows: CompareSummaryRowViewModel[] = []
  function addRows(section?: CompareSummarySectionViewModel): void {
    if (section) {
      allRows.push(...section.rows)
    }
  }
  addRows(datasetsAdded)
  addRows(datasetsRemoved)
  addRows(datasetsWithDiffs)
  addRows(datasetsWithoutDiffs)
  addRows(scenariosWithDiffs)
  addRows(scenariosWithoutDiffs)

  // Build the summary view model
  return {
    allRows,
    allGraphs,
    datasetsAdded,
    datasetsRemoved,
    datasetsWithDiffs,
    datasetsWithoutDiffs,
    scenariosWithDiffs,
    scenariosWithoutDiffs
  }
}
