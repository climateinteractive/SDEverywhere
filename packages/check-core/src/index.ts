// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

//
// _shared
//

export * from './_shared/data-source'
export * from './_shared/scenario-spec-types'
export * from './_shared/types'

//
// bundle
//

export type {
  Bundle,
  BundleGraphData,
  BundleGraphDatasetSpec,
  BundleGraphId,
  BundleGraphSpec,
  BundleGraphView,
  BundleModel,
  LegendItem,
  LinkItem,
  LoadedBundle,
  ModelSpec,
  NamedBundle
} from './bundle/bundle-types'

export type { Dimension, ImplVar, InputId, InputVar, OutputVar, RelatedItem, Subscript } from './bundle/var-types'

//
// check
//

export type { CheckDataRequestKey } from './check/check-data-coordinator'
export { CheckDataCoordinator } from './check/check-data-coordinator'

export type { CheckResult, CheckResultErrorInfo } from './check/check-func'

export type { CheckKey } from './check/check-planner'

export type { CheckPredicateOp } from './check/check-predicate'

export type {
  CheckDatasetReport,
  CheckGroupReport,
  CheckPredicateOpConstantRef,
  CheckPredicateOpDataRef,
  CheckPredicateOpRef,
  CheckPredicateReport,
  CheckReport,
  CheckScenarioReport,
  CheckStatus,
  CheckTestReport
} from './check/check-report'
export { scenarioMessage, datasetMessage, predicateMessage } from './check/check-report'

export type { CheckScenario, CheckScenarioError, CheckScenarioInputDesc } from './check/check-scenario'

export type {
  CheckPredicateTimeOptions,
  CheckPredicateTimeRange,
  CheckPredicateTimeSingle,
  CheckPredicateTimeSpec
} from './check/check-spec'

export type { CheckPredicateSummary, CheckSummary } from './check/check-summary'
export { checkSummaryFromReport, checkReportFromSummary } from './check/check-summary'

//
// compare
//

export * from './compare/_shared/compare-resolved-types'

export * from './compare/config/compare-spec-types'
export type { CompareConfig, CompareOptions } from './compare/config/compare-config'
export type { CompareScenarios } from './compare/config/compare-scenarios'
export type { CompareDatasets } from './compare/config/compare-datasets'

export type { CompareDataRequestKey } from './compare/run/compare-data-coordinator'
export { CompareDataCoordinator } from './compare/run/compare-data-coordinator'

export type { DiffPoint, DiffReport, DiffValidity } from './compare/run/compare-diff-datasets'
export { diffDatasets, compareDatasets } from './compare/run/compare-diff-datasets'

export type {
  GraphDatasetReport,
  GraphInclusion,
  GraphMetadataReport,
  GraphReport
} from './compare/run/compare-diff-graphs'
export { diffGraphs } from './compare/run/compare-diff-graphs'

export * from './compare/run/comparison-report-types'
export { comparisonSummaryFromReport } from './compare/run/comparison-reporting'

export * from './compare/run/comparison-group-types'
export { categorizeComparisonTestSummaries } from './compare/run/comparison-grouping'

//
// config
//

export type { Config, ConfigOptions } from './config/config-types'

export { createConfig } from './config/config'

//
// perf
//

export { PerfRunner } from './perf/perf-runner'

export type { PerfReport } from './perf/perf-stats'
export { PerfStats } from './perf/perf-stats'

//
// suite
//

export type { RunSuiteCallbacks, RunSuiteOptions } from './suite/suite-runner'
export { runSuite } from './suite/suite-runner'

export * from './suite/suite-report-types'

export { suiteSummaryFromReport } from './suite/suite-reporting'
