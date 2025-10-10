// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type { CheckDataCoordinator, CheckStatus, CheckTestReport } from '@sdeverywhere/check-core'
// import { scenarioMessage, datasetMessage, predicateMessage } from '@sdeverywhere/check-core'

// import { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'
import { row } from './check-summary-row-vm'

export interface CheckSummaryTestViewModel {
  testRow: CheckSummaryRowViewModel
  childRows: Readable<CheckSummaryRowViewModel[]>
  childrenVisible: Writable<boolean>
  // Store the original test data for lazy expansion
  // testData: {
  //   dataCoordinator: CheckDataCoordinator
  //   test: CheckTestReport
  // }
}

// function bold(s: string | number): string {
//   return `<span class="bold">${s}</span>`
// }

export function createCheckSummaryTestViewModel(
  dataCoordinator: CheckDataCoordinator,
  test: CheckTestReport
): CheckSummaryTestViewModel {
  const testRow = row(0, 'test', test.status, test.name, () => {})
  const childrenVisible = writable(false)

  // Count scenarios by status
  const scenarioCounts = { passed: 0, failed: 0, error: 0 }
  for (const scenario of test.scenarios) {
    scenarioCounts[scenario.status]++
  }

  // Create placeholder rows for each status that has scenarios
  const childRows: CheckSummaryRowViewModel[] = []
  function addPlaceholderRow(status: CheckStatus, count: number, countKind: string) {
    let label = `${count} ${countKind}`
    if (count > 1) {
      label += 's'
    }
    childRows.push(row(1, 'test-summary', status, label, () => expandScenarios(test, status)))
  }
  if (scenarioCounts.error > 0) {
    addPlaceholderRow('error', scenarioCounts.error, 'error')
  }
  if (scenarioCounts.failed > 0) {
    addPlaceholderRow('failed', scenarioCounts.failed, 'failed scenario')
  }
  if (scenarioCounts.passed > 0) {
    addPlaceholderRow('passed', scenarioCounts.passed, 'passed scenario')
  }

  const writableChildRows = writable(childRows)

  // function expandFailedScenarios() {
  //   // Replace placeholder with actual failed scenario rows
  //   const failedScenarios = test.scenarios.filter(s => s.status === 'failed')
  //   const scenarioRows: CheckSummaryRowViewModel[] = []

  //   for (const scenario of failedScenarios) {
  //     scenarioRows.push(createScenarioRow(scenario, dataCoordinator))
  //   }

  //   // Replace the failed placeholder with actual rows
  //   const failedPlaceholderIndex = childRows.findIndex(r => r.isPlaceholder && r.placeholderData?.status === 'failed')
  //   if (failedPlaceholderIndex !== -1) {
  //     childRows.splice(failedPlaceholderIndex, 1, ...scenarioRows)
  //   }
  // }

  return {
    testRow,
    childRows: writableChildRows,
    childrenVisible
    // testData: { dataCoordinator, test }
  }
}

function expandScenarios(test: CheckTestReport, status: CheckStatus) {
  // Replace placeholder with actual scenario rows
  const scenarios = test.scenarios.filter(s => s.status === status)
  // const scenarioRows: CheckSummaryRowViewModel[] = []
  // for (const scenario of scenarios) {
  //   // scenarioRows.push(createScenarioRow(scenario, dataCoordinator))
  // }
}
