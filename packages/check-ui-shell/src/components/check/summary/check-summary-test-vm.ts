// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type { CheckDataCoordinator, CheckTestReport } from '@sdeverywhere/check-core'
import { datasetMessage, predicateMessage, scenarioMessage } from '@sdeverywhere/check-core'

import { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'
import { row } from './check-summary-row-vm'

export interface CheckSummaryTestViewModel {
  testRow: CheckSummaryRowViewModel
  childRows: CheckSummaryRowViewModel[]
  expandAll: Writable<boolean>
}

function bold(s: string | number): string {
  return `<span class="bold">${s}</span>`
}

export function createCheckSummaryTestViewModel(
  dataCoordinator: CheckDataCoordinator,
  test: CheckTestReport
): CheckSummaryTestViewModel {
  const rows: CheckSummaryRowViewModel[] = []
  const testRow = row(0, 'test', test.status, test.name)
  for (const scenario of test.scenarios) {
    rows.push(row(1, 'scenario', scenario.status, scenarioMessage(scenario, bold)))
    for (const dataset of scenario.datasets) {
      rows.push(row(2, 'dataset', dataset.status, datasetMessage(dataset, bold)))
      for (const predicate of dataset.predicates) {
        let graphBoxViewModel: CheckSummaryGraphBoxViewModel
        if (scenario.checkScenario.scenario && dataset.checkDataset.datasetKey) {
          graphBoxViewModel = new CheckSummaryGraphBoxViewModel(
            dataCoordinator,
            scenario.checkScenario.scenario,
            dataset.checkDataset.datasetKey,
            predicate
          )
        }
        rows.push(row(3, 'predicate', predicate.result.status, predicateMessage(predicate, bold), graphBoxViewModel))
      }
    }
  }

  // Hide child rows for passed tests by default
  const expandAll = writable(false)

  return {
    testRow,
    childRows: rows,
    expandAll
  }
}
