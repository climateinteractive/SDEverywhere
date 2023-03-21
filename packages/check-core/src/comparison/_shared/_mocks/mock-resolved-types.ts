// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { InputPosition, ScenarioSpec } from '../../../_shared/scenario-spec-types'
import { allInputsAtPositionSpec, inputAtPositionSpec, inputAtValueSpec } from '../../../_shared/scenario-specs'
import type { VarId } from '../../../_shared/types'
import type { InputId, InputVar } from '../../../bundle/var-types'

import type {
  ComparisonResolverError,
  ComparisonScenario,
  ComparisonScenarioGroup,
  ComparisonScenarioInput,
  ComparisonScenarioInputState,
  ComparisonScenarioKey,
  ComparisonUnresolvedScenarioRef,
  ComparisonUnresolvedView,
  ComparisonView,
  ComparisonViewGroup
} from '../comparison-resolved-types'
import type {
  ComparisonScenarioGroupId,
  ComparisonScenarioId,
  ComparisonViewGraphId
} from '../../config/comparison-spec-types'

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
  key: ComparisonScenarioKey,
  position: InputPosition,
  opts?: { id?: string; title?: string; subtitle?: string }
): ComparisonScenario {
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
  inputVarL: InputVar | ComparisonResolverError | undefined,
  inputVarR: InputVar | ComparisonResolverError | undefined
): ComparisonScenarioInput {
  return {
    requestedName: requestedInputName,
    stateL: stateForInputVar(inputVarL, at),
    stateR: stateForInputVar(inputVarR, at)
  }
}

export function scenarioWithInputs(
  key: ComparisonScenarioKey,
  resolvedInputs: ComparisonScenarioInput[],
  specL?: ScenarioSpec,
  specR?: ScenarioSpec,
  opts?: { id?: string; title?: string; subtitle?: string }
): ComparisonScenario {
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
  key: ComparisonScenarioKey,
  requestedInputName: string,
  at: InputPosition | number,
  inputVarL: InputVar | ComparisonResolverError | undefined,
  inputVarR: InputVar | ComparisonResolverError | undefined,
  specL?: ScenarioSpec,
  specR?: ScenarioSpec,
  opts?: { id?: string; title?: string; subtitle?: string }
): ComparisonScenario {
  const input = resolvedInput(requestedInputName, at, inputVarL, inputVarR)
  return scenarioWithInputs(key, [input], specL, specR, opts)
}

export function scenarioWithInputVar(
  key: ComparisonScenarioKey,
  inputVar: InputVar,
  at: InputPosition | number
): ComparisonScenario {
  const input = resolvedInput(inputVar.varName, at, inputVar, inputVar)
  let spec: ScenarioSpec
  let subtitle: string
  if (typeof at === 'string') {
    spec = inputAtPositionSpec(inputVar.varId, at as InputPosition)
    subtitle = at.replace('-', ' ')
  } else {
    spec = inputAtValueSpec(inputVar.varId, at as number)
    subtitle = `at ${at}`
  }

  return scenarioWithInputs(key, [input], spec, spec, {
    title: inputVar.varName,
    subtitle
  })
}

export function stateForInputVar(
  inputVar: InputVar | ComparisonResolverError | undefined,
  at: InputPosition | number
): ComparisonScenarioInputState {
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

export function unresolvedScenarioRef(scenarioId: ComparisonScenarioId): ComparisonUnresolvedScenarioRef {
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
  scenarios: (ComparisonScenario | ComparisonUnresolvedScenarioRef)[],
  opts?: { id?: string }
): ComparisonScenarioGroup {
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
  scenario: ComparisonScenario,
  graphs: 'all' | ComparisonViewGraphId[]
): ComparisonView {
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
  scenarioId: ComparisonScenarioId
): ComparisonUnresolvedView {
  return {
    kind: 'unresolved-view',
    title,
    scenarioId
  }
}

export function unresolvedViewForScenarioGroupId(
  title: string | undefined,
  groupId: ComparisonScenarioGroupId
): ComparisonUnresolvedView {
  return {
    kind: 'unresolved-view',
    title,
    scenarioGroupId: groupId
  }
}

//
// VIEW GROUPS
//

export function viewGroup(title: string, views: (ComparisonView | ComparisonUnresolvedView)[]): ComparisonViewGroup {
  return {
    kind: 'view-group',
    title,
    views
  }
}
