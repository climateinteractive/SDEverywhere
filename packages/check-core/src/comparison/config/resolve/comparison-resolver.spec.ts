// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { inputAtPositionSpec as atPosSpec, inputAtValueSpec as atValSpec } from '../../../_shared/scenario-specs'
import type { VarId } from '../../../_shared/types'
import type { BundleGraphId, BundleGraphSpec, InputAliasName, ModelSpec } from '../../../bundle/bundle-types'
import { ModelInputs } from '../../../bundle/model-inputs'
import type { InputId, InputVar } from '../../../bundle/var-types'

import type { ComparisonSpecs } from '../comparison-spec-types'

import type {
  ComparisonScenario,
  ComparisonScenarioInput,
  ComparisonScenarioInputState,
  ComparisonScenarioKey
} from '../../_shared/comparison-resolved-types'

import {
  allAtPos,
  inputVar,
  scenarioGroup,
  scenarioWithInput,
  scenarioWithInputs,
  unresolvedScenarioRef,
  unresolvedViewForScenarioGroupId,
  unresolvedViewForScenarioId,
  view,
  viewGroup
} from '../../_shared/_mocks/mock-resolved-types'

import {
  comparisonSpecs,
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
  scenarioWithDistinctInputsSpec,
  scenarioWithInputsSpec,
  viewGroupWithScenariosSpec,
  viewGroupWithViewsSpec,
  viewSpec
} from '../_mocks/mock-spec-types'

import { resolveComparisonSpecs } from './comparison-resolver'

function mockModelSpec(kind: 'L' | 'R'): ModelSpec {
  //
  // VARIABLES
  // L             R
  // id=1 IVarA    id=1 IVarA
  // id=2 IVarB    id=2 IVarB_Renamed
  // id=3 IVarC    ----
  // ----          id=4 IVarD
  //
  // ALIASES
  // L             R
  // S1 -> IVarA   S1 -> IVarA
  // S2 -> IVarB   S2 -> IVarB_Renamed
  // S3 -> IVarC   S3 -> IVarD
  //
  const inputVars: Map<VarId, InputVar> = new Map()
  function addVar(inputId: InputId, varName: string, maxValue = 100): void {
    const [varId, iVar] = inputVar(inputId, varName, maxValue)
    // Add the variable
    inputVars.set(varId, iVar)
  }
  addVar('1', 'IVarA')
  if (kind === 'L') {
    addVar('2', 'IVarB', 100)
    addVar('3', 'IVarC')
  } else {
    // Use a different value for this input on the right side so that we can test
    // flagging of out-of-range values
    addVar('2', 'IVarB_Renamed', 60)
    addVar('4', 'IVarD')
  }

  // Add aliases by slider name
  const inputAliases: Map<InputAliasName, VarId> = new Map()
  inputAliases.set('S1', '_ivara')
  inputAliases.set('S2', kind === 'L' ? '_ivarb' : '_ivarb_renamed')
  inputAliases.set('S3', kind === 'L' ? '_ivarc' : '_ivard')

  // Add graphs
  const graphSpecs: BundleGraphSpec[] = []
  function addGraph(graphId: BundleGraphId): void {
    graphSpecs.push({
      id: graphId,
      title: `Graph ${graphId}`,
      datasets: [],
      legendItems: [],
      metadata: new Map()
    })
  }
  addGraph('1')
  addGraph('2')

  // TODO: Test input groups

  return {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars,
    outputVars: new Map(),
    implVars: new Map(),
    inputAliases,
    graphSpecs
  }
}

describe('resolveComparisonSpecs', () => {
  const modelSpecL = mockModelSpec('L')
  const modelSpecR = mockModelSpec('R')

  const modelInputsL = new ModelInputs(modelSpecL)
  const modelInputsR = new ModelInputs(modelSpecR)

  const lVar = (name: string) => modelInputsL.getInputVarForName(name)
  const rVar = (name: string) => modelInputsR.getInputVarForName(name)

  //
  // SCENARIOS
  //

  describe('with scenario specs', () => {
    it('should expand "with: input" at position specs', () => {
      const specs = comparisonSpecs([
        // Match by variable name
        scenarioWithInputsSpec([inputAtPositionSpec('ivarA', 'default')]),
        // Match by input ID
        scenarioWithInputsSpec([inputAtPositionSpec('id 2', 'min')]),
        // Match by alias (slider name)
        scenarioWithInputsSpec([inputAtPositionSpec('s3', 'max')]),
        // Error if name can only be resolved on left side
        scenarioWithInputsSpec([inputAtPositionSpec('ivarB', 'min')]),
        // Error if name can only be resolved on right side
        scenarioWithInputsSpec([inputAtPositionSpec('ivarD', 'min')]),
        // Error if name can't be resolved on either side
        scenarioWithInputsSpec([inputAtPositionSpec('ivarX', 'min')])
      ])

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [
          scenarioWithInput(
            '1',
            'ivarA',
            'at-default',
            lVar('IVarA'),
            rVar('IVarA'),
            atPosSpec('_ivara', 'at-default'),
            atPosSpec('_ivara', 'at-default')
          ),
          scenarioWithInput(
            '2',
            'id 2',
            'at-minimum',
            lVar('IVarB'),
            rVar('IVarB_Renamed'),
            atPosSpec('_ivarb', 'at-minimum'),
            atPosSpec('_ivarb_renamed', 'at-minimum')
          ),
          scenarioWithInput(
            '3',
            's3',
            'at-maximum',
            lVar('IVarC'),
            rVar('IVarD'),
            atPosSpec('_ivarc', 'at-maximum'),
            atPosSpec('_ivard', 'at-maximum')
          ),
          scenarioWithInput(
            '4',
            'ivarB',
            'at-minimum',
            lVar('IVarB'),
            undefined,
            atPosSpec('_ivarb', 'at-minimum'),
            undefined
          ),
          scenarioWithInput(
            '5',
            'ivarD',
            'at-minimum',
            undefined,
            rVar('IVarD'),
            undefined,
            atPosSpec('_ivard', 'at-minimum')
          ),
          scenarioWithInput('6', 'ivarX', 'at-minimum', undefined, undefined, undefined, undefined)
        ],
        scenarioGroups: [],
        viewGroups: []
      })
    })

    it('should expand "with: input" at value specs', () => {
      const specs = comparisonSpecs([
        // Match by variable name
        scenarioWithInputsSpec([inputAtValueSpec('ivarA', 20)]),
        // Match by input ID
        scenarioWithInputsSpec([inputAtValueSpec('id 2', 40)]),
        // Match by alias (slider name)
        scenarioWithInputsSpec([inputAtValueSpec('S3', 60)]),
        // Error if value is out of range on both sides
        scenarioWithInputsSpec([inputAtValueSpec('ivarA', 500)]),
        // Error if value is out of range on one side
        scenarioWithInputsSpec([inputAtValueSpec('id 2', 90)])
      ])

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [
          scenarioWithInput(
            '1',
            'ivarA',
            20,
            lVar('IVarA'),
            rVar('IVarA'),
            atValSpec('_ivara', 20),
            atValSpec('_ivara', 20)
          ),
          scenarioWithInput(
            '2',
            'id 2',
            40,
            lVar('IVarB'),
            rVar('IVarB_Renamed'),
            atValSpec('_ivarb', 40),
            atValSpec('_ivarb_renamed', 40)
          ),
          scenarioWithInput(
            '3',
            'S3',
            60,
            lVar('IVarC'),
            rVar('IVarD'),
            atValSpec('_ivarc', 60),
            atValSpec('_ivard', 60)
          ),
          scenarioWithInput(
            '4',
            'ivarA',
            500,
            { kind: 'invalid-value' },
            { kind: 'invalid-value' },
            undefined,
            undefined
          ),
          scenarioWithInput(
            '5',
            'id 2',
            90,
            lVar('IVarB'),
            { kind: 'invalid-value' },
            atValSpec('_ivarb', 90),
            undefined
          )
        ],
        scenarioGroups: [],
        viewGroups: []
      })
    })

    it('should expand distinct model-specific input specs', () => {
      function resolvedInput(
        requestedInputName: string,
        stateL: ComparisonScenarioInputState,
        stateR: ComparisonScenarioInputState
      ): ComparisonScenarioInput {
        return {
          requestedName: requestedInputName,
          stateL,
          stateR
        }
      }

      const specs = comparisonSpecs([
        // Match by variable name
        scenarioWithDistinctInputsSpec([inputAtValueSpec('ivarA', 20)], [inputAtValueSpec('ivarA', 30)]),
        // Match by input ID
        scenarioWithDistinctInputsSpec([inputAtValueSpec('id 2', 40)], [inputAtValueSpec('id 2', 50)]),
        // Match by alias (slider name)
        scenarioWithDistinctInputsSpec([inputAtValueSpec('S3', 60)], [inputAtValueSpec('S3', 70)]),
        // Error if input is not available on requested side
        scenarioWithDistinctInputsSpec([inputAtValueSpec('ivarA', 20)], [inputAtValueSpec('unknown', 600)]),
        // Error if value is out of range on both sides
        scenarioWithDistinctInputsSpec([inputAtValueSpec('ivarA', 500)], [inputAtValueSpec('ivarA', 600)]),
        // Error if value is out of range on one side
        scenarioWithDistinctInputsSpec([inputAtValueSpec('id 2', 90)], [inputAtValueSpec('id 2', 600)])
      ])

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [
          scenarioWithInputs('1', [], atValSpec('_ivara', 20), atValSpec('_ivara', 30)),
          scenarioWithInputs('2', [], atValSpec('_ivarb', 40), atValSpec('_ivarb_renamed', 50)),
          scenarioWithInputs('3', [], atValSpec('_ivarc', 60), atValSpec('_ivard', 70)),
          scenarioWithInputs(
            '4',
            [resolvedInput('unknown', {}, { error: { kind: 'unknown-input' } })],
            undefined,
            undefined
          ),
          scenarioWithInputs(
            '5',
            [
              resolvedInput('ivarA', { error: { kind: 'invalid-value' } }, {}),
              resolvedInput('ivarA', {}, { error: { kind: 'invalid-value' } })
            ],
            undefined,
            undefined
          ),
          scenarioWithInputs(
            '6',
            [resolvedInput('id 2', {}, { error: { kind: 'invalid-value' } })],
            undefined,
            undefined
          )
        ],
        scenarioGroups: [],
        viewGroups: []
      })
    })

    // it('should expand "with: [...]" multiple setting specs', () => {
    //   const specs: ComparisonScenarioSpec[] = [
    //     {
    //       with: [
    //         { input: 'I1', at: 20 },
    //         { input: 'I2', at: 40 },
    //         { input: 'i3', at: 'max' }
    //       ]
    //     }
    //   ]

    //   const key = 'multi_i1_at_20__i2_at_40__i3_at_max'
    //   const scenario = settingsScenario(key, key, [
    //     valueSetting('_i1', 20),
    //     valueSetting('_i2', 40),
    //     positionSetting('_i3', 'at-maximum')
    //   ])
    //   expect(resolveComparisonSpecs(modelSpec, specs)).toEqual([
    //     multipleInputs(scenario, undefined, [inputDesc(i1, 20), inputDesc(i2, 40), inputDesc(i3, 'at-maximum')])
    //   ])
    // })

    it('should expand "with_inputs: all" at position specs', () => {
      const specs = comparisonSpecs([
        scenarioWithAllInputsSpec('default'),
        scenarioWithAllInputsSpec('min'),
        scenarioWithAllInputsSpec('max')
      ])

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [allAtPos('1', 'at-default'), allAtPos('2', 'at-minimum'), allAtPos('3', 'at-maximum')],
        scenarioGroups: [],
        viewGroups: []
      })
    })

    // it('should expand "with_inputs_in: group" at position specs', () => {
    //   const specs: ComparisonScenarioSpec[] = [
    //     { with_inputs_in: 'Input GROUP 1', at: 'min' },
    //     { with_inputs_in: 'input group 2', at: 'max' },
    //     { with_inputs: 'all', at: 'max' }
    //   ]

    //   const key1 = 'group_input_group_1'
    //   const scenario1 = settingsScenario(key1, key1, [
    //     positionSetting('_i1', 'at-minimum'),
    //     positionSetting('_i2', 'at-minimum')
    //   ])

    //   const key2 = 'group_input_group_2'
    //   const scenario2 = settingsScenario(key2, key2, [
    //     positionSetting('_i2', 'at-maximum'),
    //     positionSetting('_i3', 'at-maximum')
    //   ])

    //   expect(resolveComparisonSpecs(modelSpec, specs)).toEqual([
    //     multipleInputs(scenario1, 'input group 1', [inputDesc(i1, 'at-minimum'), inputDesc(i2, 'at-minimum')]),
    //     multipleInputs(scenario2, 'Input Group 2', [inputDesc(i2, 'at-maximum'), inputDesc(i3, 'at-maximum')]),
    //     allAtPos('at-maximum')
    //   ])
    // })

    // it('should expand "with_inputs_in: group" to error when group is unknown', () => {
    //   const specs: ComparisonScenarioSpec[] = [{ with_inputs_in: 'Unknown Group', at: 'min' }]

    //   expect(resolveComparisonSpecs(modelSpec, specs)).toEqual([
    //     {
    //       inputDescs: [],
    //       error: {
    //         kind: 'unknown-input-group',
    //         name: 'Unknown Group'
    //       }
    //     }
    //   ])
    // })

    // it('should expand "with_inputs_in: group" to error when group is empty', () => {
    //   const specs: ComparisonScenarioSpec[] = [{ with_inputs_in: 'input group 3', at: 'min' }]

    //   expect(resolveComparisonSpecs(modelSpec, specs)).toEqual([
    //     {
    //       inputDescs: [],
    //       error: {
    //         kind: 'empty-input-group',
    //         name: 'input group 3'
    //       }
    //     }
    //   ])
    // })

    it('should expand "preset: matrix" spec', () => {
      function scenario(
        key: ComparisonScenarioKey,
        id: number,
        pos: 'min' | 'max',
        varNameL?: string,
        varNameR?: string
      ): ComparisonScenario {
        const ipos = pos === 'min' ? 'at-minimum' : 'at-maximum'
        const specL = varNameL && atPosSpec(`_${varNameL.toLowerCase()}`, ipos)
        const specR = varNameR && atPosSpec(`_${varNameR.toLowerCase()}`, ipos)
        return scenarioWithInput(
          key,
          `id ${id}`,
          ipos,
          varNameL && lVar(varNameL),
          varNameR && rVar(varNameR),
          specL,
          specR
        )
      }

      const specs = comparisonSpecs([scenarioMatrixSpec()])

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [
          allAtPos('1', 'at-default'),
          scenario('2', 1, 'min', 'IVarA', 'IVarA'),
          scenario('3', 1, 'max', 'IVarA', 'IVarA'),
          scenario('4', 2, 'min', 'IVarB', 'IVarB_Renamed'),
          scenario('5', 2, 'max', 'IVarB', 'IVarB_Renamed'),
          scenario('6', 3, 'min', 'IVarC', undefined),
          scenario('7', 3, 'max', 'IVarC', undefined),
          scenario('8', 4, 'min', undefined, 'IVarD'),
          scenario('9', 4, 'max', undefined, 'IVarD')
        ],
        scenarioGroups: [],
        viewGroups: []
      })
    })
  })

  //
  // SCENARIO GROUPS
  //

  describe('with scenario group specs', () => {
    it('should resolve a scenario group with valid scenarios and refs', () => {
      const specs = comparisonSpecs(
        [scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'max')], { id: 'id_1_at_max' })],
        [
          scenarioGroupSpec('Group with two vars at max', [
            scenarioRefSpec('id_1_at_max'),
            scenarioWithInputsSpec([inputAtPositionSpec('id 2', 'max')])
          ])
        ]
      )

      const expectedId1AtMax = scenarioWithInput(
        '1',
        'id 1',
        'at-maximum',
        lVar('IVarA'),
        rVar('IVarA'),
        atPosSpec('_ivara', 'at-maximum'),
        atPosSpec('_ivara', 'at-maximum'),
        { id: 'id_1_at_max' }
      )

      const expectedId2AtMax = scenarioWithInput(
        '2',
        'id 2',
        'at-maximum',
        lVar('IVarB'),
        rVar('IVarB_Renamed'),
        atPosSpec('_ivarb', 'at-maximum'),
        atPosSpec('_ivarb_renamed', 'at-maximum')
      )

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [expectedId1AtMax, expectedId2AtMax],
        scenarioGroups: [scenarioGroup('Group with two vars at max', [expectedId1AtMax, expectedId2AtMax])],
        viewGroups: []
      })
    })

    it('should resolve a scenario group that refers to an unknown scenario', () => {
      const specs = comparisonSpecs(
        [scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'max')])],
        [scenarioGroupSpec('Group with invalid ref', [scenarioRefSpec('unknown')])]
      )

      const expectedId1AtMax = scenarioWithInput(
        '1',
        'id 1',
        'at-maximum',
        lVar('IVarA'),
        rVar('IVarA'),
        atPosSpec('_ivara', 'at-maximum'),
        atPosSpec('_ivara', 'at-maximum')
      )

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [expectedId1AtMax],
        scenarioGroups: [scenarioGroup('Group with invalid ref', [unresolvedScenarioRef('unknown')])],
        viewGroups: []
      })
    })
  })

  //
  // VIEW GROUPS
  //

  describe('with view group specs', () => {
    it('should resolve a view group that is specified with an array of view specs', () => {
      const specs: ComparisonSpecs = {
        scenarios: [
          scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'max')], {
            id: 'id_1_at_max',
            title: 'input id 1',
            subtitle: 'at max'
          })
        ],
        scenarioGroups: [
          scenarioGroupSpec('Group with two vars at max', [
            scenarioRefSpec('id_1_at_max'),
            scenarioWithInputsSpec([inputAtPositionSpec('id 2', 'max')], { id: 'id_2_at_max' })
          ])
        ],
        graphGroups: [graphGroupSpec('GG1', ['1', '2'])],
        viewGroups: [
          viewGroupWithViewsSpec('View group 1', [
            viewSpec('View with all graphs', undefined, 'id_1_at_max', graphsPresetSpec('all'), 'grouped-by-diffs')
          ]),
          viewGroupWithViewsSpec('View group 2', [
            viewSpec(
              // This view has an explicit title and subtitle
              'View with specific graphs',
              undefined,
              'id_1_at_max',
              graphGroupRefSpec('GG1'),
              'grouped-by-diffs'
            ),
            viewSpec(
              // This view has no explicit title/subtitle, so it should be inferred from the scenario title/subtitle (which are defined)
              undefined,
              undefined,
              'id_1_at_max',
              graphsArraySpec(['1', '2'])
            ),
            viewSpec(
              // This view has no explicit title and its scenario title is also undefined, so it should resolve to "Untitled view"
              undefined,
              undefined,
              'id_2_at_max',
              graphsArraySpec(['1', '2'])
            )
          ])
        ]
      }

      const expectedId1AtMax = scenarioWithInput(
        '1',
        'id 1',
        'at-maximum',
        lVar('IVarA'),
        rVar('IVarA'),
        atPosSpec('_ivara', 'at-maximum'),
        atPosSpec('_ivara', 'at-maximum'),
        {
          id: 'id_1_at_max',
          title: 'input id 1',
          subtitle: 'at max'
        }
      )

      const expectedId2AtMax = scenarioWithInput(
        '2',
        'id 2',
        'at-maximum',
        lVar('IVarB'),
        rVar('IVarB_Renamed'),
        atPosSpec('_ivarb', 'at-maximum'),
        atPosSpec('_ivarb_renamed', 'at-maximum'),
        {
          id: 'id_2_at_max'
        }
      )

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [expectedId1AtMax, expectedId2AtMax],
        scenarioGroups: [scenarioGroup('Group with two vars at max', [expectedId1AtMax, expectedId2AtMax])],
        viewGroups: [
          viewGroup('View group 1', [
            view('View with all graphs', undefined, expectedId1AtMax, ['1', '2'], 'grouped-by-diffs')
          ]),
          viewGroup('View group 2', [
            view('View with specific graphs', undefined, expectedId1AtMax, ['1', '2'], 'grouped-by-diffs'),
            view('input id 1', 'at max', expectedId1AtMax, ['1', '2']),
            view('Untitled view', undefined, expectedId2AtMax, ['1', '2'])
          ])
        ]
      })
    })

    it('should resolve a view group that is specified using the shorthand with an array of scenarios', () => {
      const specs: ComparisonSpecs = {
        scenarios: [
          scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'max')], {
            id: 'id_1_at_max',
            title: 'id 1 at max default title',
            subtitle: 'id 1 at max default subtitle'
          }),
          scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'min')], {
            id: 'id_1_at_min',
            title: 'id 1 at min default title',
            subtitle: 'id 1 at min default subtitle'
          })
        ],
        scenarioGroups: [
          scenarioGroupSpec(
            'Group',
            [
              scenarioRefSpec('id_1_at_max'),
              scenarioRefSpec(
                'id_1_at_min',
                'id 1 at min title override from scenario group',
                'id 1 at min subtitle override from scenario group'
              ),
              scenarioWithInputsSpec([inputAtPositionSpec('id 2', 'max')], {
                id: 'id_2_at_max',
                title: 'input id 2',
                subtitle: 'at max'
              })
            ],
            { id: 'group_1' }
          )
        ],
        viewGroups: [
          viewGroupWithScenariosSpec(
            'View group 1',
            [
              scenarioRefSpec(
                'id_1_at_max',
                'id 1 at max title override from view group',
                'id 1 at max subtitle override from view group'
              ),
              scenarioRefSpec(
                'id_1_at_min',
                'id 1 at min title override from view group',
                'id 1 at min subtitle override from view group'
              )
            ],
            graphsPresetSpec('all'),
            'grouped-by-diffs'
          ),
          viewGroupWithScenariosSpec('View group 2', [scenarioGroupRefSpec('group_1')], graphsArraySpec(['1', '2']))
        ]
      }

      const expectedId1 = (key: ComparisonScenarioKey, pos: 'min' | 'max', title: string, subtitle: string) => {
        const ipos = pos === 'min' ? 'at-minimum' : 'at-maximum'
        return scenarioWithInput(
          key,
          'id 1',
          ipos,
          lVar('IVarA'),
          rVar('IVarA'),
          atPosSpec('_ivara', ipos),
          atPosSpec('_ivara', ipos),
          {
            id: `id_1_at_${pos}`,
            title,
            subtitle
          }
        )
      }

      const expectedId1AtMax = expectedId1('1', 'max', 'id 1 at max default title', 'id 1 at max default subtitle')
      const expectedId1AtMin = expectedId1('2', 'min', 'id 1 at min default title', 'id 1 at min default subtitle')

      const expectedId1AtMinWithScenarioGroupOverride = expectedId1(
        '2',
        'min',
        'id 1 at min title override from scenario group',
        'id 1 at min subtitle override from scenario group'
      )

      const expectedId2AtMax = scenarioWithInput(
        '3',
        'id 2',
        'at-maximum',
        lVar('IVarB'),
        rVar('IVarB_Renamed'),
        atPosSpec('_ivarb', 'at-maximum'),
        atPosSpec('_ivarb_renamed', 'at-maximum'),
        {
          id: 'id_2_at_max',
          title: 'input id 2',
          subtitle: 'at max'
        }
      )

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved.scenarios).toEqual([expectedId1AtMax, expectedId1AtMin, expectedId2AtMax])
      expect(resolved.scenarioGroups).toEqual([
        scenarioGroup('Group', [expectedId1AtMax, expectedId1AtMinWithScenarioGroupOverride, expectedId2AtMax], {
          id: 'group_1'
        })
      ])
      expect(resolved.viewGroups).toEqual([
        viewGroup('View group 1', [
          view(
            'id 1 at max title override from view group',
            'id 1 at max subtitle override from view group',
            expectedId1AtMax,
            ['1', '2'],
            'grouped-by-diffs'
          ),
          view(
            'id 1 at min title override from view group',
            'id 1 at min subtitle override from view group',
            expectedId1AtMin,
            ['1', '2'],
            'grouped-by-diffs'
          )
        ]),
        viewGroup('View group 2', [
          view('id 1 at max default title', 'id 1 at max default subtitle', expectedId1AtMax, ['1', '2']),
          view(
            'id 1 at min title override from scenario group',
            'id 1 at min subtitle override from scenario group',
            expectedId1AtMinWithScenarioGroupOverride,
            ['1', '2']
          ),
          view('input id 2', 'at max', expectedId2AtMax, ['1', '2'])
        ])
      ])
    })

    it('should resolve a view group that refers to an unknown scenario', () => {
      const specs: ComparisonSpecs = {
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [
          viewGroupWithScenariosSpec('View group 1', [scenarioRefSpec('id_1_at_max')], graphsPresetSpec('all'))
        ]
      }

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [viewGroup('View group 1', [unresolvedViewForScenarioId(undefined, 'id_1_at_max')])]
      })
    })

    it('should resolve a view group that refers to an unknown scenario group', () => {
      const specs: ComparisonSpecs = {
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [
          viewGroupWithScenariosSpec('View group 2', [scenarioGroupRefSpec('group_1')], graphsArraySpec(['1', '2']))
        ]
      }

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [viewGroup('View group 2', [unresolvedViewForScenarioGroupId(undefined, 'group_1')])]
      })
    })

    it('should resolve a view group that refers to a scenario group with some unresolved scenarios', () => {
      const specs: ComparisonSpecs = {
        scenarios: [],
        scenarioGroups: [
          scenarioGroupSpec(
            'Group with two vars at max',
            [scenarioRefSpec('id_1_at_max'), scenarioRefSpec('id_2_at_max')],
            {
              id: 'group_1'
            }
          )
        ],
        viewGroups: [
          viewGroupWithScenariosSpec('View group 1', [scenarioGroupRefSpec('group_1')], graphsArraySpec(['1', '2']))
        ]
      }

      const resolved = resolveComparisonSpecs(modelSpecL, modelSpecR, specs)
      expect(resolved).toEqual({
        scenarios: [],
        scenarioGroups: [
          scenarioGroup(
            'Group with two vars at max',
            [unresolvedScenarioRef('id_1_at_max'), unresolvedScenarioRef('id_2_at_max')],
            { id: 'group_1' }
          )
        ],
        viewGroups: [
          viewGroup('View group 1', [
            unresolvedViewForScenarioId(undefined, 'id_1_at_max'),
            unresolvedViewForScenarioId(undefined, 'id_2_at_max')
          ])
        ]
      })
    })
  })
})
