// Copyright (c) 2023 Climate Interactive / New Venture Fund

export * from './_shared/compare-resolved-types'

export * from './config/compare-spec-types'
export type { CompareConfig, CompareOptions } from './config/compare-config'
export { resolveCompareSpecsFromSources } from './config/compare-config'
export { CompareScenarios } from './config/compare-scenarios'

export type { CompareDatasetReport, CompareReport } from './run/compare-report'

export type { CompareSummary } from './run/compare-summary'
export { compareSummaryFromReport } from './run/compare-summary'

export { runCompare } from './run/compare-runner'
