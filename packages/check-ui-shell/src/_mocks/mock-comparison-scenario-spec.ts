// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { ComparisonScenarioSpec } from '@sdeverywhere/check-core'

export function scenarioWithAllInputsAtDefaultSpec(): ComparisonScenarioSpec {
  return {
    kind: 'scenario-with-all-inputs',
    id: 'all_inputs_at_default',
    title: 'All inputs',
    subtitle: 'at default',
    position: 'default'
  }
}
