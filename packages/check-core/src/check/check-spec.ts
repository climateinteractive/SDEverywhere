// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

/** Spec type that allows for matching a check by group and test name. */
export interface CheckNameSpec {
  /** The name of a check group. */
  groupName: string
  /** The name of a check test. */
  testName: string
}

export interface CheckDatasetMatchingSpec {
  // TODO: Make this an enum (aux, const, etc)?
  type: string
}

export interface CheckDatasetSpec {
  name?: string
  source?: string
  group?: string
  matching?: CheckDatasetMatchingSpec
}

export type CheckScenarioPosition = 'default' | 'min' | 'max'

export interface CheckScenarioInputSpec {
  input: string
  at: CheckScenarioPosition | number
}

export interface CheckScenarioSpec {
  preset?: 'matrix'
  scenarios_for_each_input_in?: string
  with?: string | CheckScenarioInputSpec[]
  with_inputs?: 'all'
  with_inputs_in?: string
  at?: CheckScenarioPosition | number
}

export type CheckPredicateRefConstant = number
export type CheckPredicateRefDataDatasetSpecial = 'inherit'
export interface CheckPredicateRefDataDatasetSpec {
  name: string
}
export type CheckPredicateRefDataScenarioSpecial = 'inherit'
export interface CheckPredicateRefDataScenarioSpec {
  inputs?: 'all' | CheckScenarioInputSpec[]
  input?: string
  at?: CheckScenarioPosition | number
}
export interface CheckPredicateRefData {
  dataset: CheckPredicateRefDataDatasetSpecial | CheckPredicateRefDataDatasetSpec
  scenario?: CheckPredicateRefDataScenarioSpecial | CheckPredicateRefDataScenarioSpec
}

export type CheckPredicateRefSpec = CheckPredicateRefConstant | CheckPredicateRefData

export type CheckPredicateTimeSingle = number
export type CheckPredicateTimeRange = [number, number]
export interface CheckPredicateTimeOptions {
  after_excl?: number
  after_incl?: number
  before_excl?: number
  before_incl?: number
}

export type CheckPredicateTimeSpec = CheckPredicateTimeSingle | CheckPredicateTimeRange | CheckPredicateTimeOptions

export interface CheckPredicateSpec {
  gt?: CheckPredicateRefSpec
  gte?: CheckPredicateRefSpec
  lt?: CheckPredicateRefSpec
  lte?: CheckPredicateRefSpec
  eq?: CheckPredicateRefSpec
  approx?: CheckPredicateRefSpec
  tolerance?: number
  time?: CheckPredicateTimeSpec
}

export interface CheckTestSpec {
  it: string
  scenarios?: CheckScenarioSpec[]
  datasets: CheckDatasetSpec[]
  predicates: CheckPredicateSpec[]
}

export interface CheckGroupSpec {
  describe: string
  tests: CheckTestSpec[]
}

export interface CheckSpec {
  groups: CheckGroupSpec[]
}
