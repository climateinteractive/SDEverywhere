// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { InputPosition, ScenarioSpec } from '../../../_shared/scenario-spec-types'
import type { VarId } from '../../../_shared/types'
import type { InputId, InputVar } from '../../../bundle/var-types'

import type {
  CompareResolverError,
  CompareScenario,
  CompareScenarioGroup,
  CompareScenarioInput,
  CompareScenarioInputState,
  CompareScenarioKey,
  CompareUnresolvedScenarioRef,
  CompareUnresolvedView,
  CompareView,
  CompareViewGroup
} from '../compare-resolved-types'
import type { CompareScenarioGroupId, CompareScenarioId, CompareViewGraphId } from '../../config/compare-spec-types'
import { allInputsAtPositionSpec } from '../../../_shared/scenario-specs'

//
// SCENARIOS
//

export function inputVar(varName: string, inputId?: InputId, maxValue = 100): [VarId, InputVar] {
  const varId = `_${varName.toLowerCase()}`
  const v: InputVar = {
    inputId,
    varId,
    varName,
    defaultValue: 50,
    minValue: 0,
    maxValue
  }
  return [varId, v]
}

export function nameForPos(position: InputPosition): string {
  switch (position) {
    case 'at-default':
      return 'default'
    case 'at-minimum':
      return 'minimum'
    case 'at-maximum':
      return 'maximum'
    default:
      return ''
  }
}

export function valueForPos(inputVar: InputVar, position: InputPosition): number | undefined {
  switch (position) {
    case 'at-default':
      return inputVar.defaultValue
    case 'at-minimum':
      return inputVar.minValue
    case 'at-maximum':
      return inputVar.maxValue
    default:
      return undefined
  }
}

export function allAtPos(
  key: CompareScenarioKey,
  position: InputPosition,
  opts?: { id?: string; title?: string; subtitle?: string }
): CompareScenario {
  const spec = allInputsAtPositionSpec(position)
  return {
    kind: 'scenario',
    key,
    id: opts?.id,
    title: opts?.title,
    subtitle: opts?.subtitle,
    settings: {
      kind: 'all-inputs-settings',
      position
    },
    specL: spec,
    specR: spec
  }
}

export function resolvedInput(
  requestedInputName: string,
  at: InputPosition | number,
  inputVarL: InputVar | CompareResolverError | undefined,
  inputVarR: InputVar | CompareResolverError | undefined
): CompareScenarioInput {
  return {
    requestedName: requestedInputName,
    stateL: stateForInputVar(inputVarL, at),
    stateR: stateForInputVar(inputVarR, at)
  }
}

export function scenarioWithInputs(
  key: CompareScenarioKey,
  resolvedInputs: CompareScenarioInput[],
  specL?: ScenarioSpec,
  specR?: ScenarioSpec,
  opts?: { id?: string; title?: string; subtitle?: string }
): CompareScenario {
  return {
    kind: 'scenario',
    key,
    id: opts?.id,
    title: opts?.title,
    subtitle: opts?.subtitle,
    settings: {
      kind: 'input-settings',
      inputs: resolvedInputs
    },
    specL,
    specR
  }
}

export function scenarioWithInput(
  key: CompareScenarioKey,
  requestedInputName: string,
  at: InputPosition | number,
  inputVarL: InputVar | CompareResolverError | undefined,
  inputVarR: InputVar | CompareResolverError | undefined,
  specL?: ScenarioSpec,
  specR?: ScenarioSpec,
  opts?: { id?: string; title?: string; subtitle?: string }
): CompareScenario {
  const input = resolvedInput(requestedInputName, at, inputVarL, inputVarR)
  return scenarioWithInputs(key, [input], specL, specR, opts)
}

export function stateForInputVar(
  inputVar: InputVar | CompareResolverError | undefined,
  at: InputPosition | number
): CompareScenarioInputState {
  if (inputVar === undefined) {
    return {
      error: {
        kind: 'unknown-input'
      }
    }
  }

  if (!('varId' in inputVar)) {
    return {
      error: inputVar
    }
  }

  let position: InputPosition
  let value: number
  if (typeof at === 'string') {
    position = at as InputPosition
    value = valueForPos(inputVar, position)
  } else {
    value = at as number
  }

  return {
    inputVar,
    position,
    value
  }
}

export function unresolvedScenarioRef(scenarioId: CompareScenarioId): CompareUnresolvedScenarioRef {
  return {
    kind: 'unresolved-scenario-ref',
    scenarioId
  }
}

//
// SCENARIO GROUPS
//

export function scenarioGroup(
  title: string,
  scenarios: (CompareScenario | CompareUnresolvedScenarioRef)[],
  opts?: { id?: string }
): CompareScenarioGroup {
  return {
    kind: 'scenario-group',
    id: opts?.id,
    title,
    scenarios
  }
}

//
// VIEWS
//

export function view(
  title: string,
  subtitle: string | undefined,
  scenario: CompareScenario,
  graphs: 'all' | CompareViewGraphId[]
): CompareView {
  return {
    kind: 'view',
    title,
    subtitle,
    scenario,
    graphs
  }
}

export function unresolvedViewForScenarioId(
  title: string | undefined,
  scenarioId: CompareScenarioId
): CompareUnresolvedView {
  return {
    kind: 'unresolved-view',
    title,
    scenarioId
  }
}

export function unresolvedViewForScenarioGroupId(
  title: string | undefined,
  groupId: CompareScenarioGroupId
): CompareUnresolvedView {
  return {
    kind: 'unresolved-view',
    title,
    scenarioGroupId: groupId
  }
}

//
// VIEW GROUPS
//

export function viewGroup(title: string, views: (CompareView | CompareUnresolvedView)[]): CompareViewGroup {
  return {
    kind: 'view-group',
    title,
    views
  }
}
