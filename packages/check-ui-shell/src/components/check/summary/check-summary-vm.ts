// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckDataCoordinator, CheckGroupReport, CheckReport } from '@sdeverywhere/check-core'
import type { CheckSummaryTestViewModel } from './check-summary-test-vm'
import { createCheckSummaryTestViewModel } from './check-summary-test-vm'

export interface CheckSummaryGroupViewModel {
  name: string
  tests: CheckSummaryTestViewModel[]
}

export interface CheckSummaryViewModel {
  total: number
  passed: number
  failed: number
  errors: number
  percents?: [number, number, number]
  groups: CheckSummaryGroupViewModel[]
}

function createCheckSummaryGroupViewModel(
  dataCoordinator: CheckDataCoordinator,
  group: CheckGroupReport,
  initialExpanded = false
): CheckSummaryGroupViewModel {
  return {
    name: group.name,
    tests: group.tests.map(test => {
      return createCheckSummaryTestViewModel(dataCoordinator, test, initialExpanded)
    })
  }
}

export function createCheckSummaryViewModel(
  dataCoordinator: CheckDataCoordinator,
  checkReport: CheckReport,
  initialExpanded = false
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
      return createCheckSummaryGroupViewModel(dataCoordinator, group, initialExpanded)
    })
  }
}
