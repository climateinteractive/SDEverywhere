// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { parseComparisonSpecs } from './comparison-parser'
import {
  datasetSpec,
  graphGroupRefSpec,
  graphGroupSpec,
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
  viewBoxSpec,
  viewGroupWithScenariosSpec,
  viewGroupWithViewsSpec,
  viewRowSpec,
  viewWithRowsSpec,
  viewWithScenarioSpec
} from '../_mocks/mock-spec-types'

describe('parseComparisonSpecs', () => {
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
    const result = parseComparisonSpecs({ kind: 'yaml', content: yaml })
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
      - scenario_ref:
          id: S1
          title: S1 custom title
          subtitle: custom subtitle
      - scenario:
          title: S5
          with: Input3
          at: min
      - scenario:
          with:
            - input: Input3
              at: max

- graph_group:
    id: GraphGroup1
    graphs:
      - '86'
      - '87'

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
          title: Temp for Scenario_1 (with graph group)
          subtitle: Subtitle goes here
          scenario_ref: S1
          graphs:
            graph_group_ref: GraphGroup1
      - view:
          title: Temp for Scenario_1 (no graphs)
          subtitle: Subtitle goes here
          scenario_ref: S1

- view_group:
    title: Temp (shorthand)
    scenarios:
      - scenario_ref: S0
      - scenario_ref: S1
      - scenario_group_ref: G1
    graphs:
      - '86'
      - '87'

- view_group:
    title: Calibration (explicit view with freeform rows)
    views:
      - view:
          title: Calibration Scenarios (mix of datasets and scenarios per row)
          rows:
            - row:
                title: Row 1
                subtitle: Subtitle goes here
                boxes:
                  - box:
                      title: Output X
                      subtitle: with Scenario 0
                      dataset:
                        name: Output X
                      scenario_ref: S0
                  - box:
                      title: Output Y
                      subtitle: with Scenario 1
                      dataset:
                        name: Output Y
                      scenario_ref: S1
            - row:
                title: Row 2
                boxes:
                  - box:
                      title: Output Z
                      subtitle: with Scenario 2
                      dataset:
                        name: Output Z
                        source: External
                      scenario_ref: S2
`

    // TODO: Add support for shorthand with same dataset repeated across the row
    // - view:
    //     title: Calibration Scenarios (one dataset per row)
    //     rows:
    //       - dataset:
    //           name: Output X
    //         scenarios:
    //           - scenario_ref: S0
    //           - scenario_ref: S1
    //       - dataset:
    //           name: Output Y
    //         scenarios:
    //           - scenario_ref: S0
    //           - scenario_ref: S1

    const result = parseComparisonSpecs({ kind: 'yaml', content: yaml })
    if (result.isErr()) {
      throw result.error
    }

    const comparisonSpecs = result.value

    expect(comparisonSpecs.scenarios).toEqual([
      scenarioMatrixSpec(),
      scenarioWithAllInputsSpec('default', { id: 'S0', title: 'S0', subtitle: 'subtitle' }),
      scenarioWithInputsSpec([inputAtPositionSpec('Input1', 'min')], { title: 'S1', subtitle: 'subtitle' }),
      scenarioWithInputsSpec([inputAtValueSpec('Input1', 5)], { title: 'S2' }),
      scenarioWithInputsSpec([inputAtPositionSpec('Input1', 'max'), inputAtValueSpec('Input2', 5)], { title: 'S3' })
    ])

    expect(comparisonSpecs.scenarioGroups).toEqual([
      scenarioGroupSpec(
        'G1',
        [
          scenarioRefSpec('S0'),
          scenarioRefSpec('S1', 'S1 custom title', 'custom subtitle'),
          scenarioWithInputsSpec([inputAtPositionSpec('Input3', 'min')], { title: 'S5' }),
          scenarioWithInputsSpec([inputAtPositionSpec('Input3', 'max')])
        ],
        { id: 'G1' }
      )
    ])

    expect(comparisonSpecs.graphGroups).toEqual([graphGroupSpec('GraphGroup1', ['86', '87'])])

    expect(comparisonSpecs.viewGroups).toEqual([
      viewGroupWithViewsSpec('Baseline', [
        viewWithScenarioSpec('All graphs', undefined, 'S0', graphsPresetSpec('all'))
      ]),
      viewGroupWithViewsSpec('Temp (explicit views)', [
        viewWithScenarioSpec('Temp for Scenario_0', undefined, 'S0', graphsArraySpec(['86', '87'])),
        viewWithScenarioSpec(
          'Temp for Scenario_1 (with graph group)',
          'Subtitle goes here',
          'S1',
          graphGroupRefSpec('GraphGroup1')
        ),
        viewWithScenarioSpec('Temp for Scenario_1 (no graphs)', 'Subtitle goes here', 'S1')
      ]),
      viewGroupWithScenariosSpec(
        'Temp (shorthand)',
        [scenarioRefSpec('S0'), scenarioRefSpec('S1'), scenarioGroupRefSpec('G1')],
        graphsArraySpec(['86', '87'])
      ),
      viewGroupWithViewsSpec('Calibration (explicit view with freeform rows)', [
        viewWithRowsSpec('Calibration Scenarios (mix of datasets and scenarios per row)', undefined, [
          viewRowSpec('Row 1', 'Subtitle goes here', [
            viewBoxSpec('Output X', 'with Scenario 0', datasetSpec('Output X'), 'S0'),
            viewBoxSpec('Output Y', 'with Scenario 1', datasetSpec('Output Y'), 'S1')
          ]),
          viewRowSpec('Row 2', undefined, [
            viewBoxSpec('Output Z', 'with Scenario 2', datasetSpec('Output Z', 'External'), 'S2')
          ])
        ])
      ])
    ])
  })

  it('should reject malformed json', () => {
    const json = `\
{
  "scenario": 1
}`

    const result = parseComparisonSpecs({ kind: 'json', content: json })
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

    const result = parseComparisonSpecs({ kind: 'json', content: json })
    expect(result.isOk()).toBe(true)
    if (!result.isOk()) {
      return
    }

    const comparisonSpecs = result.value

    expect(comparisonSpecs.scenarios).toEqual([
      scenarioMatrixSpec(),
      scenarioWithAllInputsSpec('default', { id: 'S0', title: 'S0', subtitle: 'subtitle' })
    ])
  })
})
