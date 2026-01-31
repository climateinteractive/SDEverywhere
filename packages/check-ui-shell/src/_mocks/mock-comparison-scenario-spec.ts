// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type {
  ComparisonScenarioInputAtPositionSpec,
  ComparisonScenarioInputAtValueSpec,
  ComparisonScenarioInputPosition,
  ComparisonScenarioInputSpec,
  ComparisonScenarioSpec,
  ComparisonScenarioWithInputsSpec
} from '@sdeverywhere/check-core'

export function scenarioWithAllInputsAtDefaultSpec(): ComparisonScenarioSpec {
  return {
    kind: 'scenario-with-all-inputs',
    id: 'all_inputs_at_default',
    title: 'All inputs',
    subtitle: 'at default',
    position: 'default'
  }
}

export function scenarioWithInputsSpec(
  inputs: ComparisonScenarioInputSpec[],
  opts?: { id?: string; title?: string; subtitle?: string }
): ComparisonScenarioWithInputsSpec {
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
  position: ComparisonScenarioInputPosition
): ComparisonScenarioInputAtPositionSpec {
  return {
    kind: 'input-at-position',
    inputName,
    position
  }
}

export function inputAtValueSpec(inputName: string, value: number): ComparisonScenarioInputAtValueSpec {
  return {
    kind: 'input-at-value',
    inputName,
    value
  }
}
