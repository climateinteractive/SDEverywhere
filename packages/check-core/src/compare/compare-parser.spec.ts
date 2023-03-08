// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { parseComparisonScenariosYaml } from './compare-parser'

describe('parseComparisonScenariosYaml', () => {
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
    const result = parseComparisonScenariosYaml([yaml])
    expect(result.isOk()).toBe(false)
  })

  it('should accept valid yaml', () => {
    const yaml = `
input_scenarios:
  - scenario:
      name: S0
      with_inputs: all
      at: default
  
  - scenario:
      name: S1
      with: Input1
      at: min

  - scenario:
      name: S2
      with: Input1
      at: 5

  - scenario:
      name: S3
      with:
        - input: Input1
          at: max
        - input: Input2
          at: max

  - group:
      name: G1
      scenarios:
        - scenario_ref: S0
        - scenario:
            name: S5
            with: Input3
            at: min
        - scenario:
            name: S6
            with:
              - input: Input3
                at: max

user_scenarios:
  - group:
      name: Baseline
      scenarios:
        - scenario:
            name: All graphs
            input_scenarios:
              - scenario_ref: S0
            graphs: all

        - scenario:
            name: Temperature
            input_scenarios:
              - scenario_ref: S0
              - scenario_ref: S1
              - scenario_group_ref: G1
            graphs:
              - '86'
              - '87'
`

    const result = parseComparisonScenariosYaml([yaml])
    expect(result.isOk()).toBe(true)
  })
})
