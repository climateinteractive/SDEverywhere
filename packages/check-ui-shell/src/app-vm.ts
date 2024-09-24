// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import assertNever from 'assert-never'

import type { Readable, Writable } from 'svelte/store'
import { get, writable } from 'svelte/store'

import type { ComparisonSummary, SuiteSummary } from '@sdeverywhere/check-core'
import { checkReportFromSummary, comparisonSummaryFromReport, runSuite } from '@sdeverywhere/check-core'

import type { AppModel } from './model/app-model'

import type { ComparisonGroupingKind } from './components/compare/_shared/comparison-grouping-kind'
import type { CompareDetailViewModel } from './components/compare/detail/compare-detail-vm'
import { createCompareDetailViewModel } from './components/compare/detail/compare-detail-vm'
import type { ComparisonSummaryRowViewModel } from './components/compare/summary/comparison-summary-row-vm'
import type {
  ComparisonsByItemSummaryViewModel,
  ComparisonSummaryViewModel
} from './components/compare/summary/comparison-summary-vm'
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
      const checkConfig = this.appModel.config.check
      const checkReport = checkReportFromSummary(checkConfig, this.suiteSummary.checkSummary)
      const comparisonSummary = this.suiteSummary?.comparisonSummary
      this.summaryViewModel = createSummaryViewModel(
        this.appModel.checkDataCoordinator,
        checkReport,
        comparisonConfig,
        comparisonSummary
      )
      this.writableChecksInProgress.set(false)
    } else {
      // For local dev builds, run the test suite in the browser
      // TODO: Once we resolve checks as part of resolving config options, we won't
      // need this hack here
      let simplifyScenarios = false
      if (this.headerViewModel.simplifyScenarios !== undefined) {
        simplifyScenarios = get(this.headerViewModel.simplifyScenarios)
      }
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
              comparisonSummary
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

  createCompareDetailViewModelForSummaryRow(
    summaryRowViewModel: ComparisonSummaryRowViewModel
  ): CompareDetailViewModel {
    const groupSummary = summaryRowViewModel.groupSummary

    const viewGroup = summaryRowViewModel.viewMetadata?.viewGroup
    const view = summaryRowViewModel.viewMetadata?.view

    let summaryViewModel: ComparisonsByItemSummaryViewModel
    if (groupSummary.group.kind === 'by-dataset') {
      // Show pinned scenarios at the top of the detail view
      summaryViewModel = this.summaryViewModel
        .comparisonsByScenarioSummaryViewModel as ComparisonsByItemSummaryViewModel
    } else {
      // Show pinned datasets at the top of the detail view
      summaryViewModel = this.summaryViewModel.comparisonsByDatasetSummaryViewModel as ComparisonsByItemSummaryViewModel
    }
    const pinnedItemKeys = get(summaryViewModel.pinnedRows).map(row => row.key.replace('pinned_', ''))

    return createCompareDetailViewModel(
      summaryRowViewModel.key,
      this.appModel.config.comparison,
      this.appModel.comparisonDataCoordinator,
      groupSummary,
      viewGroup,
      view,
      pinnedItemKeys
    )
  }

  createCompareDetailViewModelForFirstSummaryRow(kind: ComparisonGroupingKind): CompareDetailViewModel | undefined {
    // Get the index of the associated row in the context of the summary view
    const comparisonSummaryViewModel = this.getComparisonSummaryViewModel(kind)
    const allRows = comparisonSummaryViewModel.allRows
    if (allRows.length > 0) {
      // Create a detail view for the first row
      const prevRow = allRows[0]
      return this.createCompareDetailViewModelForSummaryRow(prevRow)
    } else {
      return undefined
    }
  }

  createCompareDetailViewModelForSummaryRowBefore(
    kind: ComparisonGroupingKind,
    summaryRowKey: string
  ): CompareDetailViewModel | undefined {
    // Get the index of the associated row in the context of the summary view
    const comparisonSummaryViewModel = this.getComparisonSummaryViewModel(kind)
    const allRows = comparisonSummaryViewModel.allRows
    const rowIndex = allRows.findIndex(row => row.key === summaryRowKey)
    if (rowIndex > 0) {
      // Create a detail view for the previous row
      const prevRow = allRows[rowIndex - 1]
      return this.createCompareDetailViewModelForSummaryRow(prevRow)
    } else {
      return undefined
    }
  }

  createCompareDetailViewModelForSummaryRowAfter(
    kind: ComparisonGroupingKind,
    summaryRowKey: string
  ): CompareDetailViewModel | undefined {
    // Get the index of the associated row in the context of the summary view
    const comparisonSummaryViewModel = this.getComparisonSummaryViewModel(kind)
    const allRows = comparisonSummaryViewModel.allRows
    const rowIndex = allRows.findIndex(row => row.key === summaryRowKey)
    if (rowIndex >= 0 && rowIndex < allRows.length - 1) {
      // Create a detail view for the next row
      const nextRow = allRows[rowIndex + 1]
      return this.createCompareDetailViewModelForSummaryRow(nextRow)
    } else {
      return undefined
    }
  }

  private getComparisonSummaryViewModel(kind: ComparisonGroupingKind): ComparisonSummaryViewModel {
    switch (kind) {
      case 'views':
        return this.summaryViewModel.comparisonViewsSummaryViewModel
      case 'by-scenario':
        return this.summaryViewModel.comparisonsByScenarioSummaryViewModel
      case 'by-dataset':
        return this.summaryViewModel.comparisonsByDatasetSummaryViewModel
      default:
        assertNever(kind)
    }
  }

  createPerfViewModel(): PerfViewModel {
    return createPerfViewModel(this.appModel.config)
  }
}

export interface AppViewModelResult {
  viewModel?: AppViewModel
  error?: Error
}
