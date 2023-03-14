// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { parseCompareSpecs } from './compare-parser'
import {
  graphsArraySpec,
  graphsPresetSpec,
  inputAtPositionSpec,
  inputAtValueSpec,
  scenarioGroupRefSpec,
  scenarioGroupSpec,
  scenarioMatrixSpec,
  scenarioRefSpec,
  scenarioWithAllInputsSpec,
  scenarioWithInputsSpec,
  viewGroupWithScenariosSpec,
  viewGroupWithViewsSpec,
  viewSpec
} from '../_shared/_mocks/mock-spec-types'

describe('parseCompareSpecs', () => {
  it('should reject malformed yaml', () => {
    const yaml = `
- describe: Group1
  tests:
    - it: should do something
      datasets:
        - name: Output X
      predicates:
        - gt: 0
`
    const result = parseCompareSpecs({ kind: 'yaml', content: yaml })
    expect(result.isOk()).toBe(false)
  })

  it('should accept valid yaml', () => {
    const yaml = `
- scenario:
    preset: matrix

- scenario:
    id: S0
    title: S0
    subtitle: subtitle
    with_inputs: all
    at: default

- scenario:
    title: S1
    subtitle: subtitle
    with: Input1
    at: min

- scenario:
    title: S2
    with: Input1
    at: 5

- scenario:
    title: S3
    with:
      - input: Input1
        at: max
      - input: Input2
        at: 5

- scenario_group:
    id: G1
    title: G1
    scenarios:
      - scenario_ref: S0
      - scenario:
          title: S5
          with: Input3
          at: min
      - scenario:
          with:
            - input: Input3
              at: max

- view_group:
    title: Baseline
    views:
      - view:
          title: All graphs
          scenario_ref: S0
          graphs: all

- view_group:
    title: Temp (explicit views)
    views:
      - view:
          title: Temp for Scenario_0
          scenario_ref: S0
          graphs:
            - '86'
            - '87'
      - view:
          title: Temp for Scenario_1
          scenario_ref: S1
          graphs:
            - '86'
            - '87'

- view_group:
    title: Temp (shorthand)
    scenarios:
      - scenario_ref: S0
      - scenario_ref: S1
      - scenario_group_ref: G1
    graphs:
      - '86'
      - '87'
`

    const result = parseCompareSpecs({ kind: 'yaml', content: yaml })
    expect(result.isOk()).toBe(true)
    if (!result.isOk()) {
      return
    }

    const compareSpec = result.value

    expect(compareSpec.scenarios).toEqual([
      scenarioMatrixSpec(),
      scenarioWithAllInputsSpec('default', { id: 'S0', title: 'S0', subtitle: 'subtitle' }),
      scenarioWithInputsSpec([inputAtPositionSpec('Input1', 'min')], { title: 'S1', subtitle: 'subtitle' }),
      scenarioWithInputsSpec([inputAtValueSpec('Input1', 5)], { title: 'S2' }),
      scenarioWithInputsSpec([inputAtPositionSpec('Input1', 'max'), inputAtValueSpec('Input2', 5)], { title: 'S3' })
    ])

    expect(compareSpec.scenarioGroups).toEqual([
      scenarioGroupSpec(
        'G1',
        [
          scenarioRefSpec('S0'),
          scenarioWithInputsSpec([inputAtPositionSpec('Input3', 'min')], { title: 'S5' }),
          scenarioWithInputsSpec([inputAtPositionSpec('Input3', 'max')])
        ],
        { id: 'G1' }
      )
    ])

    expect(compareSpec.viewGroups).toEqual([
      viewGroupWithViewsSpec('Baseline', [viewSpec('All graphs', scenarioRefSpec('S0'), graphsPresetSpec('all'))]),
      viewGroupWithViewsSpec('Temp (explicit views)', [
        viewSpec('Temp for Scenario_0', scenarioRefSpec('S0'), graphsArraySpec(['86', '87'])),
        viewSpec('Temp for Scenario_1', scenarioRefSpec('S1'), graphsArraySpec(['86', '87']))
      ]),
      viewGroupWithScenariosSpec(
        'Temp (shorthand)',
        [scenarioRefSpec('S0'), scenarioRefSpec('S1'), scenarioGroupRefSpec('G1')],
        graphsArraySpec(['86', '87'])
      )
    ])
  })

  it('should reject malformed json', () => {
    const json = `\
{
  "scenario": 1
}`

    const result = parseCompareSpecs({ kind: 'json', content: json })
    expect(result.isOk()).toBe(false)
  })

  it('should accept valid json', () => {
    const json = `\
[
  {
    "scenario": {
      "preset": "matrix"
    }
  },
  {
    "scenario": {
      "id": "S0",
      "title": "S0",
      "subtitle": "subtitle",
      "with_inputs": "all",
      "at": "default"
    }
  }
]`

    const result = parseCompareSpecs({ kind: 'json', content: json })
    expect(result.isOk()).toBe(true)
    if (!result.isOk()) {
      return
    }

    const compareSpec = result.value

    expect(compareSpec.scenarios).toEqual([
      scenarioMatrixSpec(),
      scenarioWithAllInputsSpec('default', { id: 'S0', title: 'S0', subtitle: 'subtitle' })
    ])
  })
})
