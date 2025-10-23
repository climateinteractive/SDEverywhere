// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  ComparisonGroupSummary,
  ComparisonOptions,
  ComparisonReportOptions,
  ComparisonReportSummarySection,
  ComparisonSpecs,
  ConfigOptions,
  NamedBundle
} from '@sdeverywhere/check-core'

import {
  inputAtPositionSpec,
  scenarioWithAllInputsAtDefaultSpec,
  scenarioWithInputsSpec
} from './mock-comparison-scenario-spec'

export function mockConfigOptions(
  bundleL: NamedBundle,
  bundleR: NamedBundle,
  options?: { comparisonsEnabled?: boolean; groupScenarios?: boolean }
): ConfigOptions {
  const allPositive = `
- describe: Output 1
  tests:
    - it: should be positive
      scenarios:
        - with: Constant 1
          at: max
      datasets:
        - name: Output 1
      predicates:
        - gt: 0
  `

  const checkTests = [allPositive]

  let comparisonOptions: ComparisonOptions | undefined
  if (options?.comparisonsEnabled !== false) {
    const comparisonSpecs: ComparisonSpecs = {
      scenarios: [
        scenarioWithAllInputsAtDefaultSpec(),
        scenarioWithInputsSpec([inputAtPositionSpec('Constant 1', 'min')], { title: 'Constant 1', subtitle: 'at min' }),
        scenarioWithInputsSpec([inputAtPositionSpec('Constant 1', 'max')], { title: 'Constant 1', subtitle: 'at max' })
      ]
    }

    let reportOptions: ComparisonReportOptions
    if (options?.groupScenarios === true) {
      reportOptions = {
        summarySectionsForComparisonsByScenario: summaries => {
          const allSummaries = Array.from(summaries.allGroupSummaries.values())
          const sections: ComparisonReportSummarySection[] = []

          // Put the "All inputs at default" scenario in a "Key scenarios" section
          const keyScenarios: ComparisonGroupSummary[] = []
          const baseline = allSummaries.shift()
          keyScenarios.push(baseline)
          sections.push({
            headerText: 'Key scenarios',
            rows: keyScenarios.map(summary => {
              return {
                groupSummary: summary
              }
            })
            // Set the stable flag to true so that this section appears in the filter panel
            // stable: true
          })

          // Put all other scenarios in an "Other scenarios" section
          const otherScenarios = allSummaries
          sections.push({
            headerText: 'Other scenarios',
            rows: otherScenarios.map(summary => {
              return {
                groupSummary: summary
              }
            })
            // Set the stable flag to false so that the items in this section go into an "Other scenarios"
            // group in the filter panel
            // stable: false
          })
          return sections
        }
      }
    }

    comparisonOptions = {
      baseline: bundleL,
      thresholds: [1, 5, 10],
      specs: [comparisonSpecs],
      report: reportOptions
    }
  }

  return {
    current: bundleR,
    check: {
      tests: checkTests
    },
    comparison: comparisonOptions
  }
}
