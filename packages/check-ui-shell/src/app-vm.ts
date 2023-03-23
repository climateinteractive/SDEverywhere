// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { get, writable } from 'svelte/store'

import type { ComparisonSummary, SuiteSummary } from '@sdeverywhere/check-core'
import { checkReportFromSummary, comparisonSummaryFromReport, runSuite } from '@sdeverywhere/check-core'

import type { AppModel } from './model/app-model'

import type { CompareDetailViewModel } from './components/compare/detail/compare-detail-vm'
import { createCompareDetailViewModel } from './components/compare/detail/compare-detail-vm'
import type { CompareSummaryRowViewModel } from './components/compare/summary/compare-summary-row-vm'
import type { HeaderViewModel } from './components/header/header-vm'
import { createHeaderViewModel } from './components/header/header-vm'
import type { PerfViewModel } from './components/perf/perf-vm'
import { createPerfViewModel } from './components/perf/perf-vm'
import type { SummaryViewModel } from './components/summary/summary-vm'
import { createSummaryViewModel } from './components/summary/summary-vm'

export interface RunSuiteCallbacks {
  onProgress?: (pct: number) => void
  onComplete?: () => void
}

export class AppViewModel {
  private readonly writableChecksInProgress: Writable<boolean>
  public readonly checksInProgress: Readable<boolean>
  private readonly writableProgress: Writable<string>
  public readonly progress: Readable<string>
  public readonly headerViewModel: HeaderViewModel
  public summaryViewModel: SummaryViewModel
  private cancelRunSuite: () => void

  /**
   * @param appModel The app model.
   * @param suiteSummary The test suite summary if one was already generated by
   * model-check CLI tool during the build process; if defined, this will be used
   * instead of running the checks and comparisons in the user's browser.
   */
  constructor(private readonly appModel: AppModel, private readonly suiteSummary?: SuiteSummary) {
    this.writableChecksInProgress = writable(true)
    this.checksInProgress = this.writableChecksInProgress
    this.writableProgress = writable('0%')
    this.progress = this.writableProgress

    // Show the "Simplify Scenarios" checkbox if we run checks in the browser
    const includeSimplifyScenarios = suiteSummary === undefined
    this.headerViewModel = createHeaderViewModel(appModel.config.comparison, includeSimplifyScenarios)

    if (includeSimplifyScenarios) {
      // Re-run the tests when the "Simplify Scenarios" checkbox is toggled
      let firstEvent = true
      this.headerViewModel.simplifyScenarios.subscribe(() => {
        // XXX: Ignore the first event when we subscribe
        if (firstEvent) {
          firstEvent = false
        } else {
          this.runTestSuite()
        }
      })
    }
  }

  runTestSuite(): void {
    // If a run is already in progress, cancel it before starting a new run
    if (this.cancelRunSuite) {
      this.cancelRunSuite()
      this.cancelRunSuite = undefined
    }

    // Reset the progress state
    this.writableChecksInProgress.set(true)
    this.writableProgress.set('0%')

    const comparisonConfig = this.appModel.config.comparison
    if (this.suiteSummary) {
      // For the case where checks were run ahead of time using the model-check
      // CLI tool, we can display the report immediately instead of running all
      // the checks in the user's browser
      const simplifyScenarios = false
      const checkConfig = this.appModel.config.check
      const checkReport = checkReportFromSummary(checkConfig, this.suiteSummary.checkSummary, simplifyScenarios)
      const comparisonSummary = this.suiteSummary?.comparisonSummary
      this.summaryViewModel = createSummaryViewModel(
        this.appModel.checkDataCoordinator,
        checkReport,
        comparisonConfig,
        comparisonSummary,
        simplifyScenarios
      )
      this.writableChecksInProgress.set(false)
    } else {
      // For local dev builds, run the test suite in the browser
      const simplifyScenarios = get(this.headerViewModel.simplifyScenarios)
      this.cancelRunSuite = runSuite(
        this.appModel.config,
        {
          onProgress: pct => {
            this.writableProgress.set(`${Math.round(pct * 100)}%`)
          },
          onComplete: report => {
            const checkReport = report.checkReport
            let comparisonSummary: ComparisonSummary
            if (report.comparisonReport) {
              comparisonSummary = comparisonSummaryFromReport(report.comparisonReport)
            }
            this.summaryViewModel = createSummaryViewModel(
              this.appModel.checkDataCoordinator,
              checkReport,
              comparisonConfig,
              comparisonSummary,
              simplifyScenarios
            )
            this.writableChecksInProgress.set(false)
          },
          onError: error => {
            // TODO: Show error message in browser
            console.error(error)
          }
        },
        {
          simplifyScenarios
        }
      )
    }
  }

  createCompareDetailViewModelForSummaryRow(summaryRowViewModel: CompareSummaryRowViewModel): CompareDetailViewModel {
    const compareSummaryViewModel = this.summaryViewModel.compareSummaryViewModel
    const groupSummary = summaryRowViewModel.groupSummary
    const groupKey = summaryRowViewModel.groupKey
    const view = summaryRowViewModel.view

    // Determine which rows precede and follow the selected row
    let previousRowIndex: number
    let nextRowIndex: number
    const rowCount = compareSummaryViewModel.allRows.length
    const rowIndex = compareSummaryViewModel.allRows.findIndex(row => row.groupKey === groupKey)
    if (rowIndex >= 0) {
      if (rowIndex > 0) {
        previousRowIndex = rowIndex - 1
      }
      if (rowIndex < rowCount - 1) {
        nextRowIndex = rowIndex + 1
      }
    }

    return createCompareDetailViewModel(
      this.appModel.config.comparison,
      this.appModel.comparisonDataCoordinator,
      groupSummary,
      view,
      previousRowIndex,
      nextRowIndex
    )
  }

  createCompareDetailViewModelForSummaryRowIndex(rowIndex: number): CompareDetailViewModel {
    const compareSummaryViewModel = this.summaryViewModel.compareSummaryViewModel
    const rowViewModel = compareSummaryViewModel.allRows[rowIndex]
    return this.createCompareDetailViewModelForSummaryRow(rowViewModel)
  }

  createPerfViewModel(): PerfViewModel {
    return createPerfViewModel(this.appModel.config)
  }
}

export interface AppViewModelResult {
  viewModel?: AppViewModel
  error?: Error
}
