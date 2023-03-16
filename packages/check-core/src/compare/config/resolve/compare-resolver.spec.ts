// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { VarId } from '../../../_shared/types'
import type { ModelSpec } from '../../../bundle/bundle-types'
import { ModelInputs } from '../../../bundle/model-inputs'
import type { InputId, InputVar } from '../../../bundle/var-types'

import type { CompareSpecs } from '../../config/compare-spec-types'

import type { CompareScenario } from '../../_shared/compare-resolved-types'

import {
  allAtPos,
  inputVar,
  scenarioGroup,
  scenarioWithInput,
  unresolvedScenarioRef,
  unresolvedViewForScenarioGroupId,
  unresolvedViewForScenarioId,
  view,
  viewGroup
} from '../../_shared/_mocks/mock-resolved-types'

import {
  compareSpecs,
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
} from '../_mocks/mock-spec-types'

import { resolveCompareSpecs } from './compare-resolver'

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
    const [varId, iVar] = inputVar(varName, inputId, maxValue)
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
  const inputAliases: Map<string, VarId> = new Map()
  inputAliases.set('S1', '_ivara')
  inputAliases.set('S2', kind === 'L' ? '_ivarb' : '_ivarb_renamed')
  inputAliases.set('S3', kind === 'L' ? '_ivarc' : '_ivard')

  // TODO: Test input groups

  return {
    modelSizeInBytes: 0,
    dataSizeInBytes: 0,
    inputVars,
    outputVars: new Map(),
    implVars: new Map(),
    inputAliases
  }
}

describe('resolveCompareSpecs', () => {
  const modelInputsL = new ModelInputs(mockModelSpec('L'))
  const modelInputsR = new ModelInputs(mockModelSpec('R'))

  const lVar = (name: string) => modelInputsL.getInputVarForName(name)
  const rVar = (name: string) => modelInputsR.getInputVarForName(name)

  //
  // SCENARIOS
  //

  describe('with scenario specs', () => {
    it('should expand "with: input" at position specs', () => {
      const specs = compareSpecs([
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

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [
          scenarioWithInput('ivarA', 'at-default', lVar('IVarA'), rVar('IVarA')),
          scenarioWithInput('id 2', 'at-minimum', lVar('IVarB'), rVar('IVarB_Renamed')),
          scenarioWithInput('s3', 'at-maximum', lVar('IVarC'), rVar('IVarD')),
          scenarioWithInput('ivarB', 'at-minimum', lVar('IVarB'), undefined),
          scenarioWithInput('ivarD', 'at-minimum', undefined, rVar('IVarD')),
          scenarioWithInput('ivarX', 'at-minimum', undefined, undefined)
        ],
        scenarioGroups: [],
        viewGroups: []
      })
    })

    it('should expand "with: input" at value specs', () => {
      const specs = compareSpecs([
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

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [
          scenarioWithInput('ivarA', 20, lVar('IVarA'), rVar('IVarA')),
          scenarioWithInput('id 2', 40, lVar('IVarB'), rVar('IVarB_Renamed')),
          scenarioWithInput('S3', 60, lVar('IVarC'), rVar('IVarD')),
          scenarioWithInput('ivarA', 500, { kind: 'invalid-value' }, { kind: 'invalid-value' }),
          scenarioWithInput('id 2', 90, lVar('IVarB'), { kind: 'invalid-value' })
        ],
        scenarioGroups: [],
        viewGroups: []
      })
    })

    // it('should expand "with: [...]" multiple setting specs', () => {
    //   const specs: CompareScenarioSpec[] = [
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
    //   expect(resolveCompareSpecs(modelSpec, specs)).toEqual([
    //     multipleInputs(scenario, undefined, [inputDesc(i1, 20), inputDesc(i2, 40), inputDesc(i3, 'at-maximum')])
    //   ])
    // })

    it('should expand "with_inputs: all" at position specs', () => {
      const specs = compareSpecs([
        scenarioWithAllInputsSpec('default'),
        scenarioWithAllInputsSpec('min'),
        scenarioWithAllInputsSpec('max')
      ])

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [allAtPos('at-default'), allAtPos('at-minimum'), allAtPos('at-maximum')],
        scenarioGroups: [],
        viewGroups: []
      })
    })

    // it('should expand "with_inputs_in: group" at position specs', () => {
    //   const specs: CompareScenarioSpec[] = [
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

    //   expect(resolveCompareSpecs(modelSpec, specs)).toEqual([
    //     multipleInputs(scenario1, 'input group 1', [inputDesc(i1, 'at-minimum'), inputDesc(i2, 'at-minimum')]),
    //     multipleInputs(scenario2, 'Input Group 2', [inputDesc(i2, 'at-maximum'), inputDesc(i3, 'at-maximum')]),
    //     allAtPos('at-maximum')
    //   ])
    // })

    // it('should expand "with_inputs_in: group" to error when group is unknown', () => {
    //   const specs: CompareScenarioSpec[] = [{ with_inputs_in: 'Unknown Group', at: 'min' }]

    //   expect(resolveCompareSpecs(modelSpec, specs)).toEqual([
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
    //   const specs: CompareScenarioSpec[] = [{ with_inputs_in: 'input group 3', at: 'min' }]

    //   expect(resolveCompareSpecs(modelSpec, specs)).toEqual([
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
      function scenario(id: number, pos: 'min' | 'max', varNameL?: string, varNameR?: string): CompareScenario {
        return scenarioWithInput(
          `id ${id}`,
          pos === 'min' ? 'at-minimum' : 'at-maximum',
          varNameL && lVar(varNameL),
          varNameR && rVar(varNameR)
        )
      }

      const specs = compareSpecs([scenarioMatrixSpec()])

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [
          allAtPos('at-default'),
          scenario(1, 'min', 'IVarA', 'IVarA'),
          scenario(1, 'max', 'IVarA', 'IVarA'),
          scenario(2, 'min', 'IVarB', 'IVarB_Renamed'),
          scenario(2, 'max', 'IVarB', 'IVarB_Renamed'),
          scenario(3, 'min', 'IVarC', undefined),
          scenario(3, 'max', 'IVarC', undefined),
          scenario(4, 'min', undefined, 'IVarD'),
          scenario(4, 'max', undefined, 'IVarD')
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
      const specs = compareSpecs(
        [scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'max')], { id: 'id_1_at_max' })],
        [
          scenarioGroupSpec('Group with two vars at max', [
            scenarioRefSpec('id_1_at_max'),
            scenarioWithInputsSpec([inputAtPositionSpec('id 2', 'max')])
          ])
        ]
      )

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [
          scenarioWithInput('id 1', 'at-maximum', lVar('IVarA'), rVar('IVarA'), { id: 'id_1_at_max' }),
          scenarioWithInput('id 2', 'at-maximum', lVar('IVarB'), rVar('IVarB_Renamed'))
        ],
        scenarioGroups: [
          scenarioGroup('Group with two vars at max', [
            scenarioWithInput('id 1', 'at-maximum', lVar('IVarA'), rVar('IVarA'), { id: 'id_1_at_max' }),
            scenarioWithInput('id 2', 'at-maximum', lVar('IVarB'), rVar('IVarB_Renamed'))
          ])
        ],
        viewGroups: []
      })
    })

    it('should resolve a scenario group that refers to an unknown scenario', () => {
      const specs = compareSpecs(
        [scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'max')])],
        [scenarioGroupSpec('Group with invalid ref', [scenarioRefSpec('unknown')])]
      )

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [scenarioWithInput('id 1', 'at-maximum', lVar('IVarA'), rVar('IVarA'))],
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
      const specs: CompareSpecs = {
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
        viewGroups: [
          viewGroupWithViewsSpec('View group 1', [
            viewSpec('View with all graphs', undefined, scenarioRefSpec('id_1_at_max'), graphsPresetSpec('all'))
          ]),
          viewGroupWithViewsSpec('View group 2', [
            viewSpec(
              // This view has an explicit title and subtitle
              'View with specific graphs',
              undefined,
              scenarioRefSpec('id_1_at_max'),
              graphsArraySpec(['1', '2'])
            ),
            viewSpec(
              // This view has no explicit title/subtitle, so it should be inferred from the scenario title/subtitle (which are defined)
              undefined,
              undefined,
              scenarioRefSpec('id_1_at_max'),
              graphsArraySpec(['1', '2'])
            ),
            viewSpec(
              // This view has no explicit title and its scenario title is also undefined, so it should resolve to "Untitled view"
              undefined,
              undefined,
              scenarioRefSpec('id_2_at_max'),
              graphsArraySpec(['1', '2'])
            )
          ])
        ]
      }

      const expectedId1AtMax = scenarioWithInput('id 1', 'at-maximum', lVar('IVarA'), rVar('IVarA'), {
        id: 'id_1_at_max',
        title: 'input id 1',
        subtitle: 'at max'
      })
      const expectedId2AtMax = scenarioWithInput('id 2', 'at-maximum', lVar('IVarB'), rVar('IVarB_Renamed'), {
        id: 'id_2_at_max'
      })

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [expectedId1AtMax, expectedId2AtMax],
        scenarioGroups: [scenarioGroup('Group with two vars at max', [expectedId1AtMax, expectedId2AtMax])],
        viewGroups: [
          viewGroup('View group 1', [view('View with all graphs', undefined, expectedId1AtMax, 'all')]),
          viewGroup('View group 2', [
            view('View with specific graphs', undefined, expectedId1AtMax, ['1', '2']),
            view('input id 1', 'at max', expectedId1AtMax, ['1', '2']),
            view('Untitled view', undefined, expectedId2AtMax, ['1', '2'])
          ])
        ]
      })
    })

    it('should resolve a view group that is specified using the shorthand with an array of scenarios', () => {
      const specs: CompareSpecs = {
        scenarios: [
          scenarioWithInputsSpec([inputAtPositionSpec('id 1', 'max')], {
            id: 'id_1_at_max',
            title: 'input id 1',
            subtitle: 'at max'
          })
        ],
        scenarioGroups: [
          scenarioGroupSpec(
            'Group with two vars at max',
            [
              scenarioRefSpec('id_1_at_max'),
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
          viewGroupWithScenariosSpec('View group 1', [scenarioRefSpec('id_1_at_max')], graphsPresetSpec('all')),
          viewGroupWithScenariosSpec('View group 2', [scenarioGroupRefSpec('group_1')], graphsArraySpec(['1', '2']))
        ]
      }

      const expectedId1AtMax = scenarioWithInput('id 1', 'at-maximum', lVar('IVarA'), rVar('IVarA'), {
        id: 'id_1_at_max',
        title: 'input id 1',
        subtitle: 'at max'
      })
      const expectedId2AtMax = scenarioWithInput('id 2', 'at-maximum', lVar('IVarB'), rVar('IVarB_Renamed'), {
        id: 'id_2_at_max',
        title: 'input id 2',
        subtitle: 'at max'
      })

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [expectedId1AtMax, expectedId2AtMax],
        scenarioGroups: [
          scenarioGroup('Group with two vars at max', [expectedId1AtMax, expectedId2AtMax], { id: 'group_1' })
        ],
        viewGroups: [
          viewGroup('View group 1', [view('input id 1', 'at max', expectedId1AtMax, 'all')]),
          viewGroup('View group 2', [
            view('input id 1', 'at max', expectedId1AtMax, ['1', '2']),
            view('input id 2', 'at max', expectedId2AtMax, ['1', '2'])
          ])
        ]
      })
    })

    it('should resolve a view group that refers to an unknown scenario', () => {
      const specs: CompareSpecs = {
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [
          viewGroupWithScenariosSpec('View group 1', [scenarioRefSpec('id_1_at_max')], graphsPresetSpec('all'))
        ]
      }

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [viewGroup('View group 1', [unresolvedViewForScenarioId(undefined, 'id_1_at_max')])]
      })
    })

    it('should resolve a view group that refers to an unknown scenario group', () => {
      const specs: CompareSpecs = {
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [
          viewGroupWithScenariosSpec('View group 2', [scenarioGroupRefSpec('group_1')], graphsArraySpec(['1', '2']))
        ]
      }

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
      expect(resolved).toEqual({
        scenarios: [],
        scenarioGroups: [],
        viewGroups: [viewGroup('View group 2', [unresolvedViewForScenarioGroupId(undefined, 'group_1')])]
      })
    })

    it('should resolve a view group that refers to a scenario group with some unresolved scenarios', () => {
      const specs: CompareSpecs = {
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

      const resolved = resolveCompareSpecs(modelInputsL, modelInputsR, specs)
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
