// Copyright (c) 2023 Climate Interactive / New Venture Fund

export type { CompareConfig, CompareOptions } from './0-config/compare-config'

export type { CompareDatasetReport, CompareReport } from './4-diff/compare-report'

export type { CompareSummary } from './4-diff/compare-summary'
export { compareSummaryFromReport } from './4-diff/compare-summary'

export { runCompare } from './4-diff/compare-runner'
