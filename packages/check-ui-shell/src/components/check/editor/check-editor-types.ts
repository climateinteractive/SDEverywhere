// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { DatasetKey } from '@sdeverywhere/check-core'

// Re-export check spec types from check-core
export type {
  CheckDatasetSpec,
  CheckGroupSpec,
  CheckPredicateSpec,
  CheckScenarioInputSpec,
  CheckScenarioPosition,
  CheckScenarioSpec,
  CheckTestSpec
} from '@sdeverywhere/check-core'

/** The position type for scenario inputs (extends InputPosition with 'at-value'). */
export type ScenarioInputPosition = 'at-default' | 'at-minimum' | 'at-maximum' | 'at-value'

/** The type of predicate operator. */
export type PredicateType = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'approx'

/** The scenario configuration mode. */
export type ScenarioKind = 'all-inputs' | 'given-inputs'

/** Configuration for a single input in a given-inputs scenario. */
export interface GivenInputConfig {
  inputVarId: string
  position: ScenarioInputPosition
  /** Custom value when position is 'at-value'. */
  customValue?: number
}

/** Configuration for a single scenario. */
export interface ScenarioItemConfig {
  id: string
  kind: ScenarioKind
  /** Position for all-inputs scenarios (only supports preset positions, not at-value). */
  position?: ScenarioInputPosition
  /** Input configurations for given-inputs scenarios. */
  inputs?: GivenInputConfig[]
}

/** Reference type for predicate values. */
export type PredicateRefKind = 'constant' | 'data'

/** Dataset reference type for predicates. */
export type PredicateDatasetRefKind = 'inherit' | 'name'

/** Scenario reference type for predicates. */
export type PredicateScenarioRefKind = 'inherit' | 'different'

/** Inline scenario configuration for predicates. */
export interface PredicateScenarioConfig {
  kind: ScenarioKind
  /** Position for all-inputs scenarios. */
  position?: ScenarioInputPosition
  /** Input configurations for given-inputs scenarios. */
  inputs?: GivenInputConfig[]
}

/** Configuration for a predicate reference. */
export interface PredicateRefConfig {
  kind: PredicateRefKind
  /** Value for constant references. */
  value?: number
  /** Dataset reference kind for data references. */
  datasetRefKind?: PredicateDatasetRefKind
  /** Dataset key for data references (when datasetRefKind is 'name'). */
  datasetKey?: DatasetKey
  /** Scenario reference kind for data references. */
  scenarioRefKind?: PredicateScenarioRefKind
  /** Inline scenario configuration for data references (when scenarioRefKind is 'different'). */
  scenarioConfig?: PredicateScenarioConfig
}

/** Time bound type for predicates. */
export type TimeBoundType = 'incl' | 'excl'

/** Time range configuration for predicates. */
export interface PredicateTimeConfig {
  /** Whether time range is enabled. */
  enabled: boolean
  /** Start year. */
  startYear?: number
  /** Whether start year is inclusive (>=) or exclusive (>). */
  startType?: TimeBoundType
  /** End year. */
  endYear?: number
  /** Whether end year is inclusive (<=) or exclusive (<). */
  endType?: TimeBoundType
}

/** Configuration for a single predicate. */
export interface PredicateItemConfig {
  id: string
  type: PredicateType
  ref: PredicateRefConfig
  tolerance?: number
  /** Optional time range configuration. */
  time?: PredicateTimeConfig
}

/** Configuration for a single dataset. */
export interface DatasetItemConfig {
  id: string
  datasetKey: DatasetKey
}

/** The complete check test configuration. */
export interface CheckTestConfig {
  scenarios: ScenarioItemConfig[]
  datasets: DatasetItemConfig[]
  predicates: PredicateItemConfig[]
}
