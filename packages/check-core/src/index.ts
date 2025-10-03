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
  DatasetGroupName,
  ImplVarGroup,
  InputAliasName,
  InputGroupName,
  InputSettingGroupId,
  LegendItem,
  LinkItem,
  LoadedBundle,
  ModelSpec,
  NamedBundle
} from './bundle/bundle-types'

export type { ImplVar, InputId, InputVar, OutputVar, RelatedItem } from './bundle/var-types'

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
// comparison
//

export * from './comparison/_shared/comparison-resolved-types'

export * from './comparison/config/comparison-spec-types'
export type {
  ComparisonConfig,
  ComparisonDatasetOptions,
  ComparisonOptions,
  ComparisonPlot,
  ComparisonReportDetailItem,
  ComparisonReportDetailRow,
  ComparisonReportOptions,
  ComparisonReportSummaryRow,
  ComparisonReportSummarySection
} from './comparison/config/comparison-config'
export type { ComparisonScenarios } from './comparison/config/comparison-scenarios'
export type { ComparisonDatasets } from './comparison/config/comparison-datasets'

export type { ComparisonDataRequestKey } from './comparison/run/comparison-data-coordinator'
export { ComparisonDataCoordinator } from './comparison/run/comparison-data-coordinator'

export * from './comparison/diff-datasets/diff-datasets'

export * from './comparison/diff-graphs/diff-graphs'

export * from './comparison/report/comparison-report-types'
export { comparisonSummaryFromReport } from './comparison/report/comparison-reporting'

export * from './comparison/report/comparison-group-types'
export * from './comparison/report/comparison-group-scores'
export { categorizeComparisonTestSummaries } from './comparison/report/comparison-grouping'

//
// config
//

export type { Config, ConfigInitOptions, ConfigOptions } from './config/config-types'

export { createConfig } from './config/config'

//
// perf
//

export { PerfRunner } from './perf/perf-runner'

export type { PerfReport } from './perf/perf-stats'
export { PerfStats } from './perf/perf-stats'

//
// trace
//

export type { TraceCompareToBundleOptions, TraceCompareToExtDataOptions, TraceOptions } from './trace/trace-runner'
export { TraceRunner } from './trace/trace-runner'

export type { TraceDatasetReport, TraceReport } from './trace/trace-report'

//
// suite
//

export type { RunSuiteCallbacks, RunSuiteOptions } from './suite/suite-runner'
export { runSuite } from './suite/suite-runner'

export * from './suite/suite-report-types'

export { suiteSummaryFromReport } from './suite/suite-reporting'
