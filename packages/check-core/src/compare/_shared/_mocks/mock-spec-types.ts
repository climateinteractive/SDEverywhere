// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type {
  CompareScenarioGroupId,
  CompareScenarioGroupRefSpec,
  CompareScenarioGroupSpec,
  CompareScenarioId,
  CompareScenarioInputAtPositionSpec,
  CompareScenarioInputAtValueSpec,
  CompareScenarioInputPosition,
  CompareScenarioInputSpec,
  CompareScenarioPresetMatrixSpec,
  CompareScenarioRefSpec,
  CompareScenarioSpec,
  CompareScenarioWithAllInputsSpec,
  CompareScenarioWithInputsSpec,
  CompareSpecs,
  CompareViewGraphsArraySpec,
  CompareViewGraphsPresetSpec,
  CompareViewGraphsSpec,
  CompareViewGroupSpec,
  CompareViewGroupWithScenariosSpec,
  CompareViewGroupWithViewsSpec,
  CompareViewSpec
} from '../compare-spec-types'

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
  opts?: { id?: string; title?: string; subtitle?: string }
): CompareScenarioWithAllInputsSpec {
  return {
    kind: 'scenario-with-all-inputs',
    id: opts?.id,
    title: opts?.title,
    subtitle: opts?.subtitle,
    position
  }
}

export function scenarioWithInputsSpec(
  inputs: CompareScenarioInputSpec[],
  opts?: { id?: string; title?: string; subtitle?: string }
): CompareScenarioWithInputsSpec {
  return {
    kind: 'scenario-with-inputs',
    id: opts?.id,
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

export function scenarioRefSpec(scenarioId: CompareScenarioId): CompareScenarioRefSpec {
  return {
    kind: 'scenario-ref',
    scenarioId
  }
}

//
// SCENARIO GROUPS
//

export function scenarioGroupSpec(
  title: string,
  scenarios: (CompareScenarioSpec | CompareScenarioRefSpec)[],
  opts?: { id?: string }
): CompareScenarioGroupSpec {
  return {
    kind: 'scenario-group',
    id: opts?.id,
    title,
    scenarios
  }
}

export function scenarioGroupRefSpec(groupId: CompareScenarioGroupId): CompareScenarioGroupRefSpec {
  return {
    kind: 'scenario-group-ref',
    groupId
  }
}

//
// VIEWS
//

export function viewSpec(
  title: string | undefined,
  scenario: CompareScenarioRefSpec,
  graphs: CompareViewGraphsSpec
): CompareViewSpec {
  return {
    kind: 'view',
    title,
    scenario,
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

export function viewGroupWithViewsSpec(title: string, views: CompareViewSpec[]): CompareViewGroupWithViewsSpec {
  return {
    kind: 'view-group-with-views',
    title,
    views
  }
}

export function viewGroupWithScenariosSpec(
  title: string,
  scenarios: (CompareScenarioRefSpec | CompareScenarioGroupRefSpec)[],
  graphs: CompareViewGraphsSpec
): CompareViewGroupWithScenariosSpec {
  return {
    kind: 'view-group-with-scenarios',
    title,
    scenarios,
    graphs
  }
}

//
// TOP-LEVEL TYPES
//

export function compareSpecs(
  scenarios: CompareScenarioSpec[],
  scenarioGroups: CompareScenarioGroupSpec[] = [],
  viewGroups: CompareViewGroupSpec[] = []
): CompareSpecs {
  return {
    scenarios,
    scenarioGroups,
    viewGroups
  }
}
