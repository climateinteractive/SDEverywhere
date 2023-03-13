// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { VarId } from '../../_shared/types'
import type { ModelSpec } from '../../bundle/bundle-types'
import type { InputId, InputVar } from '../../bundle/var-types'

import type { CompareScenarioSpec } from '../_shared/compare-spec-types'
import type { CompareScenario } from '../_shared/compare-resolved-types'

import {
  inputAtPositionSpec,
  inputAtValueSpec,
  scenarioMatrixSpec,
  scenarioWithAllInputsSpec,
  scenarioWithInputsSpec
} from '../_shared/_mocks/mock-spec-types'
import { allAtPos, inputVar, scenarioWithInput } from '../_shared/_mocks/mock-resolved-types'

import { expandScenarios } from './compare-resolver'
import { ModelInputs } from './model-inputs'

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

describe('expandScenarios', () => {
  const modelInputsL = new ModelInputs(mockModelSpec('L'))
  const modelInputsR = new ModelInputs(mockModelSpec('R'))

  it.only('should expand "with: input" at position specs', () => {
    const scenarioSpecs: CompareScenarioSpec[] = [
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
    ]

    expect(expandScenarios(modelInputsL, modelInputsR, scenarioSpecs, false)).toEqual([
      scenarioWithInput(
        'ivarA',
        'at-default',
        modelInputsL.getInputVarForName('IVarA'),
        modelInputsR.getInputVarForName('IVarA')
      ),
      scenarioWithInput(
        'id 2',
        'at-minimum',
        modelInputsL.getInputVarForName('IVarB'),
        modelInputsR.getInputVarForName('IVarB_Renamed')
      ),
      scenarioWithInput(
        's3',
        'at-maximum',
        modelInputsL.getInputVarForName('IVarC'),
        modelInputsR.getInputVarForName('IVarD')
      ),
      scenarioWithInput('ivarB', 'at-minimum', modelInputsL.getInputVarForName('IVarB'), undefined),
      scenarioWithInput('ivarD', 'at-minimum', undefined, modelInputsR.getInputVarForName('IVarD')),
      scenarioWithInput('ivarX', 'at-minimum', undefined, undefined)
    ])
  })

  it('should expand "with: input" at value specs', () => {
    const scenarioSpecs: CompareScenarioSpec[] = [
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
    ]

    expect(expandScenarios(modelInputsL, modelInputsR, scenarioSpecs, false)).toEqual([
      scenarioWithInput(
        'ivarA',
        20,
        modelInputsL.getInputVarForName('IVarA'),
        modelInputsR.getInputVarForName('IVarA')
      ),
      scenarioWithInput(
        'id 2',
        40,
        modelInputsL.getInputVarForName('IVarB'),
        modelInputsR.getInputVarForName('IVarB_Renamed')
      ),
      scenarioWithInput('S3', 60, modelInputsL.getInputVarForName('IVarC'), modelInputsR.getInputVarForName('IVarD')),
      scenarioWithInput('ivarA', 500, { kind: 'invalid-value' }, { kind: 'invalid-value' }),
      scenarioWithInput('id 2', 90, modelInputsL.getInputVarForName('IVarB'), { kind: 'invalid-value' })
    ])
  })

  // it('should expand "with: [...]" multiple setting specs', () => {
  //   const scenarioSpecs: CompareScenarioSpec[] = [
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
  //   expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
  //     multipleInputs(scenario, undefined, [inputDesc(i1, 20), inputDesc(i2, 40), inputDesc(i3, 'at-maximum')])
  //   ])
  // })

  it('should expand "with_inputs: all" at position specs', () => {
    const scenarioSpecs: CompareScenarioSpec[] = [
      scenarioWithAllInputsSpec('default'),
      scenarioWithAllInputsSpec('min'),
      scenarioWithAllInputsSpec('max')
    ]
    expect(expandScenarios(modelInputsL, modelInputsR, scenarioSpecs, false)).toEqual([
      allAtPos('at-default'),
      allAtPos('at-minimum'),
      allAtPos('at-maximum')
    ])
  })

  // it('should expand "with_inputs_in: group" at position specs', () => {
  //   const scenarioSpecs: CompareScenarioSpec[] = [
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

  //   expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
  //     multipleInputs(scenario1, 'input group 1', [inputDesc(i1, 'at-minimum'), inputDesc(i2, 'at-minimum')]),
  //     multipleInputs(scenario2, 'Input Group 2', [inputDesc(i2, 'at-maximum'), inputDesc(i3, 'at-maximum')]),
  //     allAtPos('at-maximum')
  //   ])
  // })

  // it('should expand "with_inputs_in: group" to error when group is unknown', () => {
  //   const scenarioSpecs: CompareScenarioSpec[] = [{ with_inputs_in: 'Unknown Group', at: 'min' }]

  //   expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
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
  //   const scenarioSpecs: CompareScenarioSpec[] = [{ with_inputs_in: 'input group 3', at: 'min' }]

  //   expect(expandScenarios(modelSpec, scenarioSpecs, false)).toEqual([
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
        varNameL && modelInputsL.getInputVarForName(varNameL),
        varNameR && modelInputsR.getInputVarForName(varNameR)
      )
    }

    expect(expandScenarios(modelInputsL, modelInputsR, [scenarioMatrixSpec()], false)).toMatchObject([
      allAtPos('at-default'),
      scenario(1, 'min', 'IVarA', 'IVarA'),
      scenario(1, 'max', 'IVarA', 'IVarA'),
      scenario(2, 'min', 'IVarB', 'IVarB_Renamed'),
      scenario(2, 'max', 'IVarB', 'IVarB_Renamed'),
      scenario(3, 'min', 'IVarC', undefined),
      scenario(3, 'max', 'IVarC', undefined),
      scenario(4, 'min', undefined, 'IVarD'),
      scenario(4, 'max', undefined, 'IVarD')
    ])
  })

  it('should expand "preset: matrix" spec into a smaller set when simplify is true', () => {
    expect(expandScenarios(modelInputsL, modelInputsR, [scenarioMatrixSpec()], true)).toEqual([allAtPos('at-default')])
  })
})
