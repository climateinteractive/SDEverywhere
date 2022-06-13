// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'
import type { CheckConfig } from './check-config'
import type { CheckResult } from './check-func'
import { parseTestYaml } from './check-parser'
import type { CheckKey } from './check-planner'
import { CheckPlanner } from './check-planner'
import type { CheckReport } from './check-report'
import { buildCheckReport } from './check-report'

/**
 * A simplified/terse version of `CheckPredicateReport` that matches the
 * format of the JSON objects emitted by the CLI in terse mode.
 */
export interface CheckPredicateSummary {
  checkKey: CheckKey
  result: CheckResult
}

/**
 * A simplified/terse version of `CheckReport` that matches the
 * format of the JSON objects emitted by the CLI in terse mode.
 * This only contains predicate summaries for checks that have a status
 * of 'failed' or 'error'.
 */
export interface CheckSummary {
  predicateSummaries: CheckPredicateSummary[]
}

/**
 * Convert a full `CheckReport` to a simplified `CheckSummary` that only includes
 * failed/errored checks.
 *
 * @param checkReport The full check report.
 * @return The converted check summary.
 */
export function checkSummaryFromReport(checkReport: CheckReport): CheckSummary {
  const predicateSummaries: CheckPredicateSummary[] = []

  for (const group of checkReport.groups) {
    for (const test of group.tests) {
      for (const scenario of test.scenarios) {
        for (const dataset of scenario.datasets) {
          for (const predicate of dataset.predicates) {
            switch (predicate.result.status) {
              case 'passed':
                break
              case 'failed':
              case 'error':
                predicateSummaries.push({
                  checkKey: predicate.checkKey,
                  result: predicate.result
                })
                break
              default:
                assertNever(predicate.result.status)
            }
          }
        }
      }
    }
  }

  return {
    predicateSummaries
  }
}

/**
 * Convert a simplified `CheckSummary` to a full `CheckReport` that restores the
 * structure of the tests from the given configuration.
 *
 * @param checkConfig The config used to reconstruct the check test structure.
 * @param checkSummary The simplified check summary.
 * @param simplifyScenarios If true, reduce the number of scenarios generated for a `matrix`.
 * @return The converted check report.
 */
export function checkReportFromSummary(
  checkConfig: CheckConfig,
  checkSummary: CheckSummary,
  simplifyScenarios: boolean
): CheckReport | undefined {
  // Parse the tests
  const checkSpecResult = parseTestYaml(checkConfig.tests)
  if (checkSpecResult.isErr()) {
    // TODO: Use Result type here instead
    return undefined
  }
  const checkSpec = checkSpecResult.value

  // Build the check plan
  const checkPlanner = new CheckPlanner(checkConfig.bundle.model.modelSpec)
  checkPlanner.addAllChecks(checkSpec, simplifyScenarios)
  const checkPlan = checkPlanner.buildPlan()

  // Put the check results into a map
  const checkResults: Map<CheckKey, CheckResult> = new Map()
  for (const predicateSummary of checkSummary.predicateSummaries) {
    checkResults.set(predicateSummary.checkKey, predicateSummary.result)
  }

  // Build the full report
  return buildCheckReport(checkPlan, checkResults)
}
