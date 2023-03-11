// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type {
  CompareScenarioGroupRefSpec,
  CompareScenarioGroupSpec,
  CompareScenarioInputAtPositionSpec,
  CompareScenarioInputAtValueSpec,
  CompareScenarioInputPosition,
  CompareScenarioInputSpec,
  CompareScenarioPresetMatrixSpec,
  CompareScenarioRefSpec,
  CompareScenarioSpec,
  CompareScenarioWithAllInputsSpec,
  CompareScenarioWithInputsSpec,
  CompareViewGraphsArraySpec,
  CompareViewGraphsPresetSpec,
  CompareViewGraphsSpec,
  CompareViewGroupSpec,
  CompareViewSpec
} from '../compare-spec'

//
// SCENARIOS
//

export function scenarioMatrixSpec(): CompareScenarioPresetMatrixSpec {
  return {
    kind: 'scenario-matrix'
  }
}

export function scenarioWithAllInputsSpec(
  position: CompareScenarioInputPosition,
  opts?: { title?: string; subtitle?: string }
): CompareScenarioWithAllInputsSpec {
  return {
    kind: 'scenario-with-all-inputs',
    title: opts?.title,
    subtitle: opts?.subtitle,
    position
  }
}

export function scenarioWithInputsSpec(
  inputs: CompareScenarioInputSpec[],
  opts?: { title?: string; subtitle?: string }
): CompareScenarioWithInputsSpec {
  return {
    kind: 'scenario-with-inputs',
    title: opts?.title,
    subtitle: opts?.subtitle,
    inputs
  }
}

export function inputAtPositionSpec(
  inputName: string,
  position: CompareScenarioInputPosition
): CompareScenarioInputAtPositionSpec {
  return {
    kind: 'input-at-position',
    inputName,
    position
  }
}

export function inputAtValueSpec(inputName: string, value: number): CompareScenarioInputAtValueSpec {
  return {
    kind: 'input-at-value',
    inputName,
    value
  }
}

export function scenarioRefSpec(scenarioName: string): CompareScenarioRefSpec {
  return {
    kind: 'scenario-ref',
    scenarioName
  }
}

//
// SCENARIO GROUPS
//

export function scenarioGroupSpec(
  groupName: string,
  scenarios: (CompareScenarioSpec | CompareScenarioRefSpec)[]
): CompareScenarioGroupSpec {
  return {
    kind: 'scenario-group',
    name: groupName,
    scenarios
  }
}

export function scenarioGroupRefSpec(groupName: string): CompareScenarioGroupRefSpec {
  return {
    kind: 'scenario-group-ref',
    groupName
  }
}

//
// VIEWS
//

export function viewSpec(
  viewName: string,
  scenarios: (CompareScenarioRefSpec | CompareScenarioGroupRefSpec)[],
  graphs: CompareViewGraphsSpec
): CompareViewSpec {
  return {
    kind: 'view',
    name: viewName,
    scenarios,
    graphs
  }
}

export function graphsPresetSpec(preset: 'all'): CompareViewGraphsPresetSpec {
  return {
    kind: 'graphs-preset',
    preset
  }
}

export function graphsArraySpec(graphIds: string[]): CompareViewGraphsArraySpec {
  return {
    kind: 'graphs-array',
    graphIds
  }
}

//
// VIEW GROUPS
//

export function viewGroupSpec(groupName: string, views: CompareViewSpec[]): CompareViewGroupSpec {
  return {
    kind: 'view-group',
    name: groupName,
    views
  }
}
