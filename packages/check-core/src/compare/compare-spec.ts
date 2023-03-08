// Copyright (c) 2023 Climate Interactive / New Venture Fund

//
// INPUT SCENARIOS
//

export type CompareInputScenarioPosition = 'default' | 'min' | 'max'

export interface CompareInputScenarioInputSpec {
  input: string
  at: CompareInputScenarioPosition | number
}

export interface CompareInputScenarioSpec {
  ref?: string // CompareInputScenarioName
  name?: string // CompareInputScenarioName
  preset?: 'matrix'
  with?: string | CompareInputScenarioInputSpec[]
  with_inputs?: 'all'
  // with_inputs_in?: string
  at?: CompareInputScenarioPosition | number
}

export interface CompareInputScenarioGroupSpec {
  name: string // CompareInputScenarioGroupName
  scenarios: CompareInputScenarioSpec[] // TODO: ref or inline?
}

export interface CompareInputScenarioItemRef {
  scenario_ref: string // CompareInputScenarioName
}
export interface CompareInputScenarioGroupRef {
  group_ref: string // CompareInputScenarioGroupName
}
export type CompareInputScenarioRef = CompareInputScenarioItemRef | CompareInputScenarioGroupRef

//
// USER SCENARIOS
//

export interface CompareUserScenarioGraphSpec {
  id: string // CompareInputScenarioGraphId
}

export interface CompareUserScenarioSpec {
  name: string // CompareUserScenarioName
  desc?: string
  input_scenarios?: CompareInputScenarioSpec[]
  graphs?: 'all' | CompareUserScenarioGraphSpec[]
}

export interface CompareUserScenarioGroupSpec {
  name: string // CompareUserScenarioGroupName
  scenarios: CompareUserScenarioSpec[]
}

//
// TOP-LEVEL DEFS
//

export interface CompareTopLevelInputScenariosItemSpec {
  scenario?: CompareInputScenarioSpec
  group?: CompareInputScenarioGroupSpec
}

export interface CompareTopLevelUserScenariosItemSpec {
  group?: CompareUserScenarioGroupSpec
}

export interface CompareDefsSpec {
  input_scenarios?: CompareTopLevelInputScenariosItemSpec[]
  user_scenarios?: CompareTopLevelUserScenariosItemSpec[]
}

export interface CompareSpec {
  inputScenarios: CompareInputScenarioSpec[]
  inputScenarioGroups: CompareInputScenarioGroupSpec[]
  userScenarioGroups: CompareUserScenarioGroupSpec[]
}
