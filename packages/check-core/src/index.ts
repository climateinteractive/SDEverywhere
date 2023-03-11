// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

//
// _shared
//

export type { DatasetsResult, DataSource } from './_shared/data-source'

export type {
  AllInputsScenario,
  InputPosition,
  InputSetting,
  PositionSetting,
  Scenario,
  SettingsScenario,
  ValueSetting
} from './_shared/scenario'
export {
  allInputsAtPositionScenario,
  inputAtPositionScenario,
  inputAtValueScenario,
  matrixScenarios,
  positionSetting,
  settingsScenario,
  valueSetting
} from './_shared/scenario'

export type { Dataset, DatasetKey, DatasetMap, ScenarioGroupKey, ScenarioKey, SourceName, VarId } from './_shared/types'

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

export type { Dimension, ImplVar, InputVar, OutputVar, RelatedItem, Subscript } from './bundle/var-types'

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

export type { CompareConfig, CompareOptions } from './compare/compare-config'

export type { CompareDataRequestKey } from './compare/compare-data-coordinator'
export { CompareDataCoordinator } from './compare/compare-data-coordinator'

export type { CompareDatasets, CompareDatasetInfo } from './compare/compare-datasets'

export type { DiffPoint, DiffReport, DiffValidity } from './compare/compare-diff-datasets'
export { diffDatasets, compareDatasets } from './compare/compare-diff-datasets'

export type { GraphDatasetReport, GraphInclusion, GraphMetadataReport, GraphReport } from './compare/compare-graphs'
export { diffGraphs } from './compare/compare-graphs'

export type { CompareItem, CompareGroupInfo, CompareGroup } from './compare/compare-group'

export type { CompareDatasetReport, CompareReport } from './compare/compare-report'

export type { CompareScenarios, CompareScenarioInfo } from './compare/compare-scenarios'

export * from './compare/compare-spec'

export type { CompareDatasetSummary, CompareSummary } from './compare/compare-summary'
export { compareSummaryFromReport } from './compare/compare-summary'

export { DatasetManager } from './compare/dataset-manager'

export { ScenarioManager } from './compare/scenario-manager'

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

export type { SuiteReport } from './suite/suite-report'

export type { SuiteSummary } from './suite/suite-summary'
export { suiteSummaryFromReport } from './suite/suite-summary'
