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

function createPlaceholderRow(
  indent: number,
  status: CheckStatus,
  count: number,
  label: string,
  onExpand: () => void
): CheckSummaryRowViewModel {
  const labelText = count === 1 ? `${count} ${label}` : `${count} ${label}s`
  const initialExpanded = false
  return row(indent, 'placeholder', status, labelText, initialExpanded, onExpand)
}

function loadDatasetChildren(
  datasetRow: CheckSummaryRowViewModel,
  dataset: CheckDatasetReport,
  scenario: CheckScenario,
  dataCoordinator: CheckDataCoordinator
) {
  // Create the predicate rows
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

    const initialExpanded = false
    const predicateRow = row(
      3,
      'predicate',
      predicate.result.status,
      predicateMessage(predicate, bold),
      initialExpanded,
      () => {
        // Toggle expanded state
        predicateRow.expanded.update(v => !v)
      },
      graphBoxViewModel
    )

    // Add the predicate row to the array
    predicateRows.push(predicateRow)
  }

  // Add the predicate rows to the dataset row
  datasetRow.childRows.update(() => predicateRows)
}

function createDatasetRow(
  dataset: CheckDatasetReport,
  scenario: CheckScenario,
  dataCoordinator: CheckDataCoordinator
): CheckSummaryRowViewModel {
  // Unlike the other levels, we always expand dataset rows to show the predicates
  // since there are rarely more than one or two predicates per dataset
  const initialExpanded = true
  const datasetRow = row(2, 'dataset', dataset.status, datasetMessage(dataset, bold), initialExpanded, () => {
    // Toggle expanded state
    datasetRow.expanded.update(v => !v)
  })

  // Load the predicate rows eagerly
  loadDatasetChildren(datasetRow, dataset, scenario, dataCoordinator)

  return datasetRow
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
  scenarioRow.childRows.update(currentRows => {
    const placeholderIndex = currentRows.findIndex(r => r.rowClasses.includes('placeholder') && r.status === status)
    if (placeholderIndex !== -1) {
      const newRows = [...currentRows]
      newRows.splice(placeholderIndex, 1, ...datasetRows)
      return newRows
    } else {
      return currentRows
    }
  })
}

function loadScenarioChildren(
  scenarioRow: CheckSummaryRowViewModel,
  scenario: CheckScenarioReport,
  dataCoordinator: CheckDataCoordinator
) {
  const totalDatasets = scenario.datasets.length

  if (totalDatasets <= 10) {
    // There are only a few child rows, so add them all directly
    const datasetRows: CheckSummaryRowViewModel[] = []
    for (const dataset of scenario.datasets) {
      datasetRows.push(createDatasetRow(dataset, scenario.checkScenario, dataCoordinator))
    }
    // Sort by status: error, failed, passed
    const statusOrder = { error: 0, failed: 1, passed: 2 }
    datasetRows.sort((a, b) => {
      return statusOrder[a.status] - statusOrder[b.status]
    })
    scenarioRow.childRows.update(() => datasetRows)
  } else {
    // Count datasets by status
    const datasetCounts = { passed: 0, failed: 0, error: 0 }
    for (const dataset of scenario.datasets) {
      datasetCounts[dataset.status]++
    }

    // Create placeholder rows for each status that has scenarios
    const childRows: CheckSummaryRowViewModel[] = []
    function addPlaceholderRow(status: CheckStatus, count: number, label: string) {
      childRows.push(
        createPlaceholderRow(2, status, count, label, () => {
          loadDatasetsForStatus(scenarioRow, scenario, status, dataCoordinator)
        })
      )
    }
    if (datasetCounts.error > 0) {
      addPlaceholderRow('error', datasetCounts.error, 'errored dataset')
    }
    if (datasetCounts.failed > 0) {
      addPlaceholderRow('failed', datasetCounts.failed, 'failed dataset')
    }
    if (datasetCounts.passed > 0) {
      addPlaceholderRow('passed', datasetCounts.passed, 'passed dataset')
    }

    // Add the placeholder rows to the scenario row
    scenarioRow.childRows.update(() => childRows)
  }
}

function createScenarioRow(
  scenario: CheckScenarioReport,
  dataCoordinator: CheckDataCoordinator
): CheckSummaryRowViewModel {
  const initialExpanded = false
  let childrenLoaded = false
  const scenarioRow = row(1, 'scenario', scenario.status, scenarioMessage(scenario, bold), initialExpanded, () => {
    // If becoming visible and no children loaded yet, load them
    if (!childrenLoaded) {
      loadScenarioChildren(scenarioRow, scenario, dataCoordinator)
      childrenLoaded = true
    }

    // Toggle expanded state
    scenarioRow.expanded.update(v => !v)
  })

  return scenarioRow
}

function loadScenariosForStatus(
  testRow: CheckSummaryRowViewModel,
  test: CheckTestReport,
  status: CheckStatus,
  dataCoordinator: CheckDataCoordinator
) {
  // Create the child scenario rows
  const scenarios = test.scenarios.filter(s => s.status === status)
  const scenarioRows: CheckSummaryRowViewModel[] = []
  for (const scenario of scenarios) {
    scenarioRows.push(createScenarioRow(scenario, dataCoordinator))
  }

  // Replace placeholder with actual scenario rows
  testRow.childRows.update(currentRows => {
    const placeholderIndex = currentRows.findIndex(r => r.rowClasses.includes('placeholder') && r.status === status)
    if (placeholderIndex !== -1) {
      const newRows = [...currentRows]
      newRows.splice(placeholderIndex, 1, ...scenarioRows)
      return newRows
    } else {
      return currentRows
    }
  })
}

function loadTestChildren(
  testRow: CheckSummaryRowViewModel,
  test: CheckTestReport,
  dataCoordinator: CheckDataCoordinator
) {
  const totalScenarios = test.scenarios.length

  if (totalScenarios <= 10) {
    // There are only a few child rows, so add them all directly
    const scenarioRows: CheckSummaryRowViewModel[] = []
    for (const scenario of test.scenarios) {
      scenarioRows.push(createScenarioRow(scenario, dataCoordinator))
    }
    // Sort by status: error, failed, passed
    const statusOrder = { error: 0, failed: 1, passed: 2 }
    scenarioRows.sort((a, b) => {
      return statusOrder[a.status] - statusOrder[b.status]
    })
    testRow.childRows.update(() => scenarioRows)
  } else {
    // Count scenarios by status
    const scenarioCounts = { passed: 0, failed: 0, error: 0 }
    for (const scenario of test.scenarios) {
      scenarioCounts[scenario.status]++
    }

    // Create placeholder rows for each status that has scenarios
    const childRows: CheckSummaryRowViewModel[] = []
    function addPlaceholderRow(status: CheckStatus, count: number, label: string) {
      childRows.push(
        createPlaceholderRow(1, status, count, label, () => {
          loadScenariosForStatus(testRow, test, status, dataCoordinator)
        })
      )
    }
    if (scenarioCounts.error > 0) {
      addPlaceholderRow('error', scenarioCounts.error, 'errored scenario')
    }
    if (scenarioCounts.failed > 0) {
      addPlaceholderRow('failed', scenarioCounts.failed, 'failed scenario')
    }
    if (scenarioCounts.passed > 0) {
      addPlaceholderRow('passed', scenarioCounts.passed, 'passed scenario')
    }

    // Add the placeholder rows to the test row
    testRow.childRows.update(() => childRows)
  }
}

function createTestRow(dataCoordinator: CheckDataCoordinator, test: CheckTestReport): CheckSummaryRowViewModel {
  const initialExpanded = false
  let childrenLoaded = false
  const testRow = row(0, 'test', test.status, test.name, initialExpanded, () => {
    // If becoming visible and no children loaded yet, load them
    if (!childrenLoaded) {
      loadTestChildren(testRow, test, dataCoordinator)
      childrenLoaded = true
    }

    // Toggle expanded state
    testRow.expanded.update(v => !v)
  })

  return testRow
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
