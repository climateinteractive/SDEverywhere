// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  CheckDataCoordinator,
  CheckGroupReport,
  CheckReport,
  CheckTestReport,
  CheckScenarioReport,
  CheckDatasetReport,
  CheckStatus,
  CheckScenario
} from '@sdeverywhere/check-core'
import { scenarioMessage, datasetMessage, predicateMessage } from '@sdeverywhere/check-core'

import { CheckSummaryGraphBoxViewModel } from './check-summary-graph-box-vm'
import type { CheckSummaryRowViewModel } from './check-summary-row-vm'
import { row } from './check-summary-row-vm'

export interface CheckSummaryGroupViewModel {
  name: string
  tests: CheckSummaryRowViewModel[]
}

export interface CheckSummaryViewModel {
  total: number
  passed: number
  failed: number
  errors: number
  percents?: [number, number, number]
  groups: CheckSummaryGroupViewModel[]
}

function bold(s: string | number): string {
  return `<span class="bold">${s}</span>`
}

function createTestRow(dataCoordinator: CheckDataCoordinator, test: CheckTestReport): CheckSummaryRowViewModel {
  let childrenLoaded = false

  const testRow = row(0, 'test', test.status, test.name, () => {
    // If becoming visible and no children loaded yet, load them
    if (!childrenLoaded) {
      loadTestChildren(testRow, test, dataCoordinator)
      childrenLoaded = true
    }

    // Toggle visibility
    testRow.childRowsVisible.update(v => !v)
  })

  return testRow
}

function loadTestChildren(
  testRow: CheckSummaryRowViewModel,
  test: CheckTestReport,
  dataCoordinator: CheckDataCoordinator
) {
  // Count scenarios by status
  const scenarioCounts = { passed: 0, failed: 0, error: 0 }
  for (const scenario of test.scenarios) {
    scenarioCounts[scenario.status]++
  }

  const childRows: CheckSummaryRowViewModel[] = []

  // Create placeholder rows for each status that has scenarios
  if (scenarioCounts.failed > 0) {
    childRows.push(
      createPlaceholderRow(1, 'failed', scenarioCounts.failed, 'failed scenario', () => {
        loadScenariosForStatus(testRow, test, 'failed', dataCoordinator)
      })
    )
  }

  if (scenarioCounts.passed > 0) {
    childRows.push(
      createPlaceholderRow(1, 'passed', scenarioCounts.passed, 'passed scenario', () => {
        loadScenariosForStatus(testRow, test, 'passed', dataCoordinator)
      })
    )
  }

  if (scenarioCounts.error > 0) {
    childRows.push(
      createPlaceholderRow(1, 'error', scenarioCounts.error, 'error scenario', () => {
        loadScenariosForStatus(testRow, test, 'error', dataCoordinator)
      })
    )
  }

  testRow.childRows.update(() => childRows)
}

function loadScenariosForStatus(
  testRow: CheckSummaryRowViewModel,
  test: CheckTestReport,
  status: CheckStatus,
  dataCoordinator: CheckDataCoordinator
) {
  const scenarios = test.scenarios.filter(s => s.status === status)
  const scenarioRows: CheckSummaryRowViewModel[] = []

  for (const scenario of scenarios) {
    scenarioRows.push(createScenarioRow(scenario, dataCoordinator))
  }

  // Replace placeholder with actual scenario rows
  testRow.childRows.subscribe(currentRows => {
    const placeholderIndex = currentRows.findIndex(r => r.rowClasses.includes('placeholder') && r.status === status)
    if (placeholderIndex !== -1) {
      const newRows = [...currentRows]
      newRows.splice(placeholderIndex, 1, ...scenarioRows)
      testRow.childRows.update(() => newRows)
    }
  })()
}

function createScenarioRow(
  scenario: CheckScenarioReport,
  dataCoordinator: CheckDataCoordinator
): CheckSummaryRowViewModel {
  let childrenLoaded = false

  const scenarioRow = row(1, 'scenario', scenario.status, scenarioMessage(scenario, bold), () => {
    // Toggle visibility
    scenarioRow.childRowsVisible.update(v => !v)

    // If becoming visible and no children loaded yet, load them
    if (!childrenLoaded) {
      loadScenarioChildren(scenarioRow, scenario, dataCoordinator)
      childrenLoaded = true
    }
  })

  return scenarioRow
}

function loadScenarioChildren(
  scenarioRow: CheckSummaryRowViewModel,
  scenario: CheckScenarioReport,
  dataCoordinator: CheckDataCoordinator
) {
  // Count datasets by status
  const datasetCounts = { passed: 0, failed: 0, error: 0 }
  for (const dataset of scenario.datasets) {
    datasetCounts[dataset.status]++
  }

  const childRows: CheckSummaryRowViewModel[] = []

  // Create placeholder rows for each status that has datasets
  if (datasetCounts.failed > 0) {
    childRows.push(
      createPlaceholderRow(2, 'failed', datasetCounts.failed, 'failed dataset', () => {
        loadDatasetsForStatus(scenarioRow, scenario, 'failed', dataCoordinator)
      })
    )
  }

  if (datasetCounts.passed > 0) {
    childRows.push(
      createPlaceholderRow(2, 'passed', datasetCounts.passed, 'passed dataset', () => {
        loadDatasetsForStatus(scenarioRow, scenario, 'passed', dataCoordinator)
      })
    )
  }

  if (datasetCounts.error > 0) {
    childRows.push(
      createPlaceholderRow(2, 'error', datasetCounts.error, 'error dataset', () => {
        loadDatasetsForStatus(scenarioRow, scenario, 'error', dataCoordinator)
      })
    )
  }

  scenarioRow.childRows.update(() => childRows)
}

function loadDatasetsForStatus(
  scenarioRow: CheckSummaryRowViewModel,
  scenario: CheckScenarioReport,
  status: CheckStatus,
  dataCoordinator: CheckDataCoordinator
) {
  const datasets = scenario.datasets.filter(d => d.status === status)
  const datasetRows: CheckSummaryRowViewModel[] = []

  for (const dataset of datasets) {
    datasetRows.push(createDatasetRow(dataset, scenario.checkScenario, dataCoordinator))
  }

  // Replace placeholder with actual dataset rows
  scenarioRow.childRows.subscribe(currentRows => {
    const placeholderIndex = currentRows.findIndex(r => r.rowClasses.includes('placeholder') && r.status === status)
    if (placeholderIndex !== -1) {
      const newRows = [...currentRows]
      newRows.splice(placeholderIndex, 1, ...datasetRows)
      scenarioRow.childRows.update(() => newRows)
    }
  })()
}

function createDatasetRow(
  dataset: CheckDatasetReport,
  scenario: CheckScenario,
  dataCoordinator: CheckDataCoordinator
): CheckSummaryRowViewModel {
  let childrenLoaded = false

  const datasetRow = row(2, 'dataset', dataset.status, datasetMessage(dataset, bold), () => {
    // Toggle visibility
    datasetRow.childRowsVisible.update(v => !v)

    // If becoming visible and no children loaded yet, load them
    if (!childrenLoaded) {
      loadDatasetChildren(datasetRow, dataset, scenario, dataCoordinator)
      childrenLoaded = true
    }
  })

  return datasetRow
}

function loadDatasetChildren(
  datasetRow: CheckSummaryRowViewModel,
  dataset: CheckDatasetReport,
  scenario: CheckScenario,
  dataCoordinator: CheckDataCoordinator
) {
  const predicateRows: CheckSummaryRowViewModel[] = []

  for (const predicate of dataset.predicates) {
    let graphBoxViewModel: CheckSummaryGraphBoxViewModel | undefined

    if (scenario.spec && dataset.checkDataset.datasetKey) {
      graphBoxViewModel = new CheckSummaryGraphBoxViewModel(
        dataCoordinator,
        scenario,
        dataset.checkDataset.datasetKey,
        predicate
      )
    }

    predicateRows.push(
      row(
        3,
        'predicate',
        predicate.result.status,
        predicateMessage(predicate, bold),
        () => {
          // Toggle graph visibility - this will be handled by the component
          console.log('Predicate clicked:', predicate)
        },
        graphBoxViewModel
      )
    )
  }

  datasetRow.childRows.update(() => predicateRows)
}

function createPlaceholderRow(
  indent: number,
  status: CheckStatus,
  count: number,
  label: string,
  onExpand: () => void
): CheckSummaryRowViewModel {
  const labelText = count === 1 ? `${count} ${label}` : `${count} ${label}s`
  return row(indent, 'placeholder', status, labelText, onExpand)
}

function createCheckSummaryGroupViewModel(
  dataCoordinator: CheckDataCoordinator,
  group: CheckGroupReport
): CheckSummaryGroupViewModel {
  return {
    name: group.name,
    tests: group.tests.map(test => createTestRow(dataCoordinator, test))
  }
}

export function createCheckSummaryViewModel(
  dataCoordinator: CheckDataCoordinator,
  checkReport: CheckReport
): CheckSummaryViewModel {
  let passed = 0
  let failed = 0
  let errors = 0
  for (const group of checkReport.groups) {
    for (const test of group.tests) {
      for (const scenario of test.scenarios) {
        if (scenario.datasets.length === 0) {
          errors++
          continue
        }
        for (const dataset of scenario.datasets) {
          if (dataset.predicates.length === 0) {
            errors++
            continue
          }
          for (const predicate of dataset.predicates) {
            switch (predicate.result.status) {
              case 'passed':
                passed++
                break
              case 'failed':
                failed++
                break
              case 'error':
                errors++
                break
              default:
                break
            }
          }
        }
      }
    }
  }

  const total = passed + failed + errors
  let percents: [number, number, number]
  if (total > 0) {
    percents = [(passed / total) * 100, (failed / total) * 100, (errors / total) * 100]
  }

  return {
    total,
    passed,
    failed,
    errors,
    percents,
    groups: checkReport.groups.map(group => {
      return createCheckSummaryGroupViewModel(dataCoordinator, group)
    })
  }
}
