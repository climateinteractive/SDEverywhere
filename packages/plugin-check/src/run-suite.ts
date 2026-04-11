// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { performance } from 'perf_hooks'

import pico from 'picocolors'

import type { BuildContext } from '@sdeverywhere/build'

import type {
  Config,
  ComparisonReport,
  PerfReport,
  RunSuiteCallbacks,
  CheckReport,
  CheckStatus,
  ComparisonConfig,
  CheckTestReport,
  SuiteSummary
} from '@sdeverywhere/check-core'
import {
  datasetMessage,
  predicateMessage,
  runSuite,
  scenarioMessage,
  suiteSummaryFromReport
} from '@sdeverywhere/check-core'

export interface RunTestSuiteResult {
  allChecksPassed: boolean
  suiteSummary: SuiteSummary
}

/**
 * Runs the test suite.
 */
export async function runTestSuite(
  context: BuildContext,
  config: Config,
  verbose: boolean
): Promise<RunTestSuiteResult> {
  return new Promise((resolve, reject) => {
    const t0 = performance.now()
    let lastPctByInc: number
    const callbacks: RunSuiteCallbacks = {
      onProgress: progress => {
        const pct = Math.round(progress * 100)
        const pctByInc = Math.floor(pct / 5) * 5
        if (lastPctByInc === undefined || pctByInc > lastPctByInc) {
          lastPctByInc = pctByInc
          context.log('info', `${pctByInc}%`)
        }
      },
      onComplete: report => {
        try {
          const t1 = performance.now()
          const elapsedMillis = t1 - t0
          const elapsedSeconds = (elapsedMillis / 1000).toFixed(1)
          context.log('info', `\nTest suite completed in ${elapsedSeconds}s`)

          // Print check summary to the console
          const allChecksPassed = printCheckSummary(context, report.checkReport, verbose)

          if (report.comparisonReport) {
            // Print the perf stats to the console
            printPerfStats(context, config.comparison, report.comparisonReport)
          }

          // Convert check and compare reports to terse form that only includes
          // failed/errored checks or comparisons with differences
          // TODO: The terse form was originally used when we had to write the
          // results to a JSON file and then read them back in when building
          // the report, but we no longer use that intermediate file, so there's
          // less reason to use the terse form (since it requires the web app
          // code to reconstruct the results).  But for now, we will continue
          // to use the terse form, and later we can update the app code.
          const suiteSummary = suiteSummaryFromReport(report, elapsedMillis)

          resolve({
            allChecksPassed,
            suiteSummary
          })
        } catch (e) {
          reject(e)
        }
      },
      onError: error => {
        reject(error)
      }
    }
    runSuite(config, callbacks)
  })
}

function printCheckSummary(context: BuildContext, checkReport: CheckReport, verbose: boolean): boolean {
  function printResult(indent: number, status: CheckStatus, text: string): void {
    if (!verbose && status === 'passed' && indent > 1) {
      return
    }
    let statusChar: string
    switch (status) {
      case 'passed':
        statusChar = '✓'
        break
      case 'failed':
        statusChar = '✗'
        break
      case 'error':
        statusChar = '‼'
        break
      case 'skipped':
        statusChar = '–'
        break
      default:
        statusChar = ''
        break
    }
    const msg = `${'  '.repeat(indent)}${statusChar} ${text}`
    context.log('info', status === 'passed' ? pico.green(msg) : pico.red(msg))
  }

  function bold(s: string): string {
    return pico.bold(s)
  }

  function printTest(test: CheckTestReport): void {
    const msg = `${test.name}${verbose || test.status !== 'passed' ? ':' : ''}`
    printResult(1, test.status, msg)
  }

  let allPassed = true
  context.log('info', '\nCheck results:')
  for (const group of checkReport.groups) {
    context.log('info', `\n${group.name}`)

    for (const test of group.tests) {
      if (test.status !== 'passed') {
        allPassed = false
      }
      printTest(test)

      for (const scenario of test.scenarios) {
        printResult(3, scenario.status, scenarioMessage(scenario, bold))

        for (const dataset of scenario.datasets) {
          printResult(5, dataset.status, datasetMessage(dataset, bold))

          for (const predicate of dataset.predicates) {
            printResult(7, predicate.result.status, predicateMessage(predicate, bold))
          }
        }
      }
    }
  }
  context.log('info', '')

  return allPassed
}

function stat(label: string, n: number): string {
  return `${label}=${n.toFixed(1)}ms`
}

function printPerfReportLine(context: BuildContext, perfReport: PerfReport): void {
  const avg = stat('avg', perfReport.avgTime)
  const min = stat('min', perfReport.minTime)
  const max = stat('max', perfReport.maxTime)
  context.log('info', `    ${avg} ${min} ${max}`)
}

function printPerfStats(context: BuildContext, comparisonConfig: ComparisonConfig, report: ComparisonReport): void {
  context.log('info', '\nPerformance stats:')
  context.log('info', `  ${comparisonConfig.bundleL.name}:`)
  printPerfReportLine(context, report.perfReportL)
  context.log('info', `  ${comparisonConfig.bundleR.name}:`)
  printPerfReportLine(context, report.perfReportR)
  context.log('info', '')
}
