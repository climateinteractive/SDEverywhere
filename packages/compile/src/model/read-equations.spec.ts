import { describe, expect, it } from 'vitest'

import { canonicalName, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'
import type { VensimModelParseTree } from '../parse/parser'

import Model from './model'
import { default as VariableImpl } from './variable'

import { parseInlineVensimModel, parseVensimModel, sampleModelDir, type Variable } from '../_tests/test-support'

/**
 * This is a shorthand for the following steps to read equations:
 *   - parseVensimModel
 *   - readSubscriptRanges
 *   - resolveSubscriptRanges
 *   - readVariables
 *   - analyze (this includes readEquations)
 */
function readSubscriptsAndEquationsFromSource(source: {
  modelText?: string
  modelName?: string
  modelDir?: string
}): Variable[] {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  let parsedModel: VensimModelParseTree
  if (source.modelText) {
    parsedModel = parseInlineVensimModel(source.modelText)
  } else {
    parsedModel = parseVensimModel(source.modelName)
  }

  let modelDir = source.modelDir
  if (modelDir === undefined) {
    if (source.modelName) {
      modelDir = sampleModelDir(source.modelName)
    }
  }

  Model.read(parsedModel, /*spec=*/ {}, /*extData=*/ undefined, /*directData=*/ undefined, modelDir, {
    stopAfterAnalyze: true
  })

  return Model.variables.map(v => {
    // XXX: Strip out the legacy ANTLR eqnCtx to avoid vitest hang when comparing
    delete v.eqnCtx
    // XXX: Strip out the new parsedEqn field, since we don't need it for comparing
    delete v.parsedEqn
    return v
  })
}

function readInlineModel(modelText: string, modelDir?: string): Variable[] {
  const vars = readSubscriptsAndEquationsFromSource({ modelText, modelDir })

  // Exclude the `Time` variable so that we have one less thing to check
  return vars.filter(v => v.varName !== '_time')
}

function readSubscriptsAndEquations(modelName: string): Variable[] {
  return readSubscriptsAndEquationsFromSource({ modelName })
}

function v(lhs: string, formula: string, overrides?: Partial<Variable>): Variable {
  const variable = new VariableImpl(undefined)
  // XXX: Strip out the ANTLR eqnCtx to avoid vitest hang when comparing
  delete variable.eqnCtx
  variable.modelLHS = lhs
  variable.modelFormula = formula
  variable.varName = canonicalName(lhs.split('[')[0])
  variable.varType = 'aux'
  variable.hasInitValue = false
  variable.includeInOutput = true
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      const r = variable as Record<string, any>
      r[key] = value
    }
  }
  return variable as Variable
}

describe('readEquations', () => {
  it('should work for simple equation with explicit parentheses', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = (x + 2) * 3 ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', '(x+2)*3', {
        refId: '_y',
        references: ['_x']
      })
    ])
  })

  it('should work for conditional expression with = op', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = IF THEN ELSE(x = time, 1, 0) ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', 'IF THEN ELSE(x=time,1,0)', {
        refId: '_y',
        references: ['_x', '_time']
      })
    ])
  })

  it('should work for conditional expression with reference to dimension', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x = 1 ~~|
      y[DimA] = IF THEN ELSE(DimA = x, 1, 0) ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y[DimA]', 'IF THEN ELSE(DimA=x,1,0)', {
        refId: '_y',
        subscripts: ['_dima'],
        references: ['_x']
      })
    ])
  })

  it('should work for conditional expression with reference to dimension and subscript/index', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      y[DimA] = IF THEN ELSE(DimA = A2, 1, 0) ~~|
    `)
    expect(vars).toEqual([
      v('y[DimA]', 'IF THEN ELSE(DimA=A2,1,0)', {
        refId: '_y',
        subscripts: ['_dima']
      })
    ])
  })

  it('should work for data variable definition', () => {
    const vars = readInlineModel(
      `
      x ~~|
      `
    )
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'data'
      })
    ])
  })

  it('should work for lookup definition', () => {
    const vars = readInlineModel(`
      x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|
    `)
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'lookup',
        range: [
          [0, 0],
          [2, 2]
        ],
        points: [
          [0, 0],
          [0.1, 0.01],
          [0.5, 0.7],
          [1, 1],
          [1.5, 1.2],
          [2, 1.3]
        ]
      })
    ])
  })

  it('should work for lookup call', () => {
    const vars = readInlineModel(`
      x( (0,0),(2,1.3) ) ~~|
      y = x(2) ~~|
    `)
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'lookup',
        range: [],
        points: [
          [0, 0],
          [2, 1.3]
        ]
      }),
      v('y', 'x(2)', {
        refId: '_y',
        referencedFunctionNames: ['__x']
      })
    ])
  })

  it('should work for lookup call (with apply-to-all lookup variable)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[DimA]( (0,0),(2,1.3) ) ~~|
      y = x[A1](2) ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', '', {
        points: [
          [0, 0],
          [2, 1.3]
        ],
        refId: '_x',
        subscripts: ['_dima'],
        varType: 'lookup'
      }),
      v('y', 'x[A1](2)', {
        refId: '_y',
        referencedLookupVarNames: ['_x']
      })
    ])
  })

  it('should work for lookup call (with separated lookup variable)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[A1]( (0,0),(2,1.3) ) ~~|
      x[A2]( (1,1),(4,3) ) ~~|
      y = x[A1](2) ~~|
    `)
    expect(vars).toEqual([
      v('x[A1]', '', {
        points: [
          [0, 0],
          [2, 1.3]
        ],
        refId: '_x[_a1]',
        subscripts: ['_a1'],
        varType: 'lookup'
      }),
      v('x[A2]', '', {
        points: [
          [1, 1],
          [4, 3]
        ],
        refId: '_x[_a2]',
        subscripts: ['_a2'],
        varType: 'lookup'
      }),
      v('y', 'x[A1](2)', {
        refId: '_y',
        referencedLookupVarNames: ['_x']
      })
    ])
  })

  it('should work for ACTIVE INITIAL function', () => {
    const vars = readInlineModel(`
      Initial Target Capacity = 1 ~~|
      Capacity = 2 ~~|
      Target Capacity = ACTIVE INITIAL(Capacity, Initial Target Capacity) ~~|
    `)
    expect(vars).toEqual([
      v('Initial Target Capacity', '1', {
        refId: '_initial_target_capacity',
        varType: 'const'
      }),
      v('Capacity', '2', {
        refId: '_capacity',
        varType: 'const'
      }),
      v('Target Capacity', 'ACTIVE INITIAL(Capacity,Initial Target Capacity)', {
        refId: '_target_capacity',
        references: ['_capacity'],
        hasInitValue: true,
        initReferences: ['_initial_target_capacity'],
        referencedFunctionNames: ['__active_initial']
      })
    ])
  })

  it('should work for ALLOCATE AVAILABLE function', () => {
    const vars = readInlineModel(`
      branch: Boston, Dayton ~~|
      pprofile: ptype, ppriority ~~|
      supply available = 200 ~~|
      demand[branch] = 500,300 ~~|
      priority[Boston,pprofile] = 1,5 ~~|
      priority[Dayton,pprofile] = 1,7 ~~|
      shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[branch,ptype], supply available) ~~|
    `)
    expect(vars).toEqual([
      v('supply available', '200', {
        refId: '_supply_available',
        varType: 'const'
      }),
      v('demand[branch]', '500,300', {
        refId: '_demand[_boston]',
        separationDims: ['_branch'],
        subscripts: ['_boston'],
        varType: 'const'
      }),
      v('demand[branch]', '500,300', {
        refId: '_demand[_dayton]',
        separationDims: ['_branch'],
        subscripts: ['_dayton'],
        varType: 'const'
      }),
      v('priority[Boston,pprofile]', '1,5', {
        refId: '_priority[_boston,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_boston', '_ptype'],
        varType: 'const'
      }),
      v('priority[Boston,pprofile]', '1,5', {
        refId: '_priority[_boston,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_boston', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Dayton,pprofile]', '1,7', {
        refId: '_priority[_dayton,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_dayton', '_ptype'],
        varType: 'const'
      }),
      v('priority[Dayton,pprofile]', '1,7', {
        refId: '_priority[_dayton,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_dayton', '_ppriority'],
        varType: 'const'
      }),
      v('shipments[branch]', 'ALLOCATE AVAILABLE(demand[branch],priority[branch,ptype],supply available)', {
        refId: '_shipments',
        referencedFunctionNames: ['__allocate_available'],
        references: [
          '_demand[_boston]',
          '_demand[_dayton]',
          '_priority[_boston,_ppriority]',
          '_priority[_boston,undefined]',
          '_supply_available'
        ],
        subscripts: ['_branch']
      })
    ])
  })

  it('should work for DELAY1 function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = DELAY1(x, 5) ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', 'DELAY1(x,5)', {
        refId: '_y',
        references: ['__level1', '__aux1'],
        delayVarRefId: '__level1',
        delayTimeVarName: '__aux1'
      }),
      v('_level1', 'INTEG(x-y,x*5)', {
        refId: '__level1',
        varType: 'level',
        includeInOutput: false,
        references: ['_x', '_y'],
        hasInitValue: true,
        initReferences: ['_x'],
        referencedFunctionNames: ['__integ']
      }),
      v('_aux1', '5', {
        refId: '__aux1',
        varType: 'const',
        includeInOutput: false
      })
    ])
  })

  it('should work for DELAY1I function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      init = 2 ~~|
      y = DELAY1I(x, 5, init) ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('init', '2', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'DELAY1I(x,5,init)', {
        refId: '_y',
        references: ['__level1', '__aux1'],
        delayVarRefId: '__level1',
        delayTimeVarName: '__aux1'
      }),
      v('_level1', 'INTEG(x-y,init*5)', {
        refId: '__level1',
        varType: 'level',
        includeInOutput: false,
        references: ['_x', '_y'],
        hasInitValue: true,
        initReferences: ['_init'],
        referencedFunctionNames: ['__integ']
      }),
      v('_aux1', '5', {
        refId: '__aux1',
        varType: 'const',
        includeInOutput: false
      })
    ])
  })

  it('should work for DELAY1I function (with subscripted variables)', () => {
    // Note that we have a mix of non-apply-to-all (input, delay) and apply-to-all (init)
    // variables here to cover both cases
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      input[DimA] = 10, 20, 30 ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 0 ~~|
      y[DimA] = DELAY1I(input[DimA], delay[DimA], init[DimA]) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[DimA]', 'DELAY1I(input[DimA],delay[DimA],init[DimA])', {
        delayTimeVarName: '__aux1',
        delayVarRefId: '__level1',
        refId: '_y',
        references: ['__level1', '__aux1[_dima]'],
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG(input[DimA]-y[DimA],init[DimA]*delay[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a1]', '_input[_a2]', '_input[_a3]', '_y'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux1[DimA]', 'delay[DimA]', {
        includeInOutput: false,
        refId: '__aux1',
        references: ['_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima']
      })
    ])
  })

  it('should work for DELAY1I function (with separated variables using subdimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      input[DimA] = 10, 20, 30 ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 0 ~~|
      y[A1] = 5 ~~|
      y[SubA] = DELAY1I(input[SubA], delay[SubA], init[SubA]) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[A1]', '5', {
        refId: '_y[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('y[SubA]', 'DELAY1I(input[SubA],delay[SubA],init[SubA])', {
        delayTimeVarName: '__aux1',
        delayVarRefId: '__level_y_1[_a2]',
        refId: '_y[_a2]',
        references: ['__level_y_1[_a2]', '__aux1[_a2]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('y[SubA]', 'DELAY1I(input[SubA],delay[SubA],init[SubA])', {
        delayTimeVarName: '__aux2',
        delayVarRefId: '__level_y_1[_a3]',
        refId: '_y[_a3]',
        references: ['__level_y_1[_a3]', '__aux2[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('_level_y_1[a2]', 'INTEG(input[a2]-y[a2],init[a2]*delay[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a2]'],
        refId: '__level_y_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a2]', '_y[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_aux1[a2]', 'delay[a2]', {
        includeInOutput: false,
        refId: '__aux1[_a2]',
        references: ['_delay[_a2]'],
        subscripts: ['_a2']
      }),
      v('_level_y_1[a3]', 'INTEG(input[a3]-y[a3],init[a3]*delay[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a3]'],
        refId: '__level_y_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a3]', '_y[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_aux2[a3]', 'delay[a3]', {
        includeInOutput: false,
        refId: '__aux2[_a3]',
        references: ['_delay[_a3]'],
        subscripts: ['_a3']
      })
    ])
  })

  it('should work for DELAY3 function', () => {
    const vars = readInlineModel(`
      input = 1 ~~|
      delay = 2 ~~|
      y = DELAY3(input, delay) ~~|
    `)
    expect(vars).toEqual([
      v('input', '1', {
        refId: '_input',
        varType: 'const'
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y', 'DELAY3(input,delay)', {
        delayTimeVarName: '__aux4',
        delayVarRefId: '__level3',
        refId: '_y',
        references: ['__level3', '__level2', '__level1', '__aux4']
      }),
      v('_level3', 'INTEG(_aux2-_aux3,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__aux2', '__aux3'],
        varType: 'level'
      }),
      v('_level2', 'INTEG(_aux1-_aux2,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__aux1', '__aux2'],
        varType: 'level'
      }),
      v('_level1', 'INTEG(input-_aux1,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '__aux1'],
        varType: 'level'
      }),
      v('_aux1', '_level1/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux1',
        references: ['__level1', '_delay']
      }),
      v('_aux2', '_level2/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux2',
        references: ['__level2', '_delay']
      }),
      v('_aux3', '_level3/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux3',
        references: ['__level3', '_delay']
      }),
      v('_aux4', '((delay)/3)', {
        includeInOutput: false,
        refId: '__aux4',
        references: ['_delay']
      })
    ])
  })

  it('should work for DELAY3I function', () => {
    const vars = readInlineModel(`
      input = 1 ~~|
      delay = 2 ~~|
      init = 3 ~~|
      y = DELAY3I(input, delay, init) ~~|
    `)
    expect(vars).toEqual([
      v('input', '1', {
        refId: '_input',
        varType: 'const'
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('init', '3', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'DELAY3I(input,delay,init)', {
        delayTimeVarName: '__aux4',
        delayVarRefId: '__level3',
        refId: '_y',
        references: ['__level3', '__level2', '__level1', '__aux4']
      }),
      v('_level3', 'INTEG(_aux2-_aux3,init*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__aux2', '__aux3'],
        varType: 'level'
      }),
      v('_level2', 'INTEG(_aux1-_aux2,init*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__aux1', '__aux2'],
        varType: 'level'
      }),
      v('_level1', 'INTEG(input-_aux1,init*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '__aux1'],
        varType: 'level'
      }),
      v('_aux1', '_level1/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux1',
        references: ['__level1', '_delay']
      }),
      v('_aux2', '_level2/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux2',
        references: ['__level2', '_delay']
      }),
      v('_aux3', '_level3/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux3',
        references: ['__level3', '_delay']
      }),
      v('_aux4', '((delay)/3)', {
        includeInOutput: false,
        refId: '__aux4',
        references: ['_delay']
      })
    ])
  })

  it('should work for DELAY3I function (with nested function calls)', () => {
    const vars = readInlineModel(`
      input = 1 ~~|
      delay = 2 ~~|
      init = 3 ~~|
      y = DELAY3I(MIN(0, input), MAX(0, delay), ABS(init)) ~~|
    `)
    expect(vars).toEqual([
      v('input', '1', {
        refId: '_input',
        varType: 'const'
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('init', '3', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'DELAY3I(MIN(0,input),MAX(0,delay),ABS(init))', {
        delayTimeVarName: '__aux4',
        delayVarRefId: '__level3',
        refId: '_y',
        references: ['__level3', '__level2', '__level1', '__aux4']
      }),
      v('_level3', 'INTEG(_aux2-_aux3,ABS(init)*((MAX(0,delay))/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay'],
        refId: '__level3',
        referencedFunctionNames: ['__integ', '__abs', '__max'],
        references: ['__aux2', '__aux3'],
        varType: 'level'
      }),
      v('_level2', 'INTEG(_aux1-_aux2,ABS(init)*((MAX(0,delay))/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay'],
        refId: '__level2',
        referencedFunctionNames: ['__integ', '__abs', '__max'],
        references: ['__aux1', '__aux2'],
        varType: 'level'
      }),
      v('_level1', 'INTEG(MIN(0,input)-_aux1,ABS(init)*((MAX(0,delay))/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay'],
        refId: '__level1',
        referencedFunctionNames: ['__integ', '__min', '__abs', '__max'],
        references: ['_input', '__aux1'],
        varType: 'level'
      }),
      v('_aux1', '_level1/((MAX(0,delay))/3)', {
        includeInOutput: false,
        refId: '__aux1',
        referencedFunctionNames: ['__max'],
        references: ['__level1', '_delay']
      }),
      v('_aux2', '_level2/((MAX(0,delay))/3)', {
        includeInOutput: false,
        refId: '__aux2',
        referencedFunctionNames: ['__max'],
        references: ['__level2', '_delay']
      }),
      v('_aux3', '_level3/((MAX(0,delay))/3)', {
        includeInOutput: false,
        refId: '__aux3',
        referencedFunctionNames: ['__max'],
        references: ['__level3', '_delay']
      }),
      v('_aux4', '((MAX(0,delay))/3)', {
        includeInOutput: false,
        refId: '__aux4',
        referencedFunctionNames: ['__max'],
        references: ['_delay']
      })
    ])
  })

  it('should work for DELAY3I function (with subscripted variables)', () => {
    // Note that we have a mix of non-apply-to-all (input, delay) and apply-to-all (init)
    // variables here to cover both cases
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      input[DimA] = 10, 20, 30 ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 0 ~~|
      y[DimA] = DELAY3I(input[DimA], delay[DimA], init[DimA]) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[DimA]', 'DELAY3I(input[DimA],delay[DimA],init[DimA])', {
        delayTimeVarName: '__aux4',
        delayVarRefId: '__level3',
        refId: '_y',
        references: ['__level3', '__level2', '__level1', '__aux4[_dima]'],
        subscripts: ['_dima']
      }),
      v('_level3[DimA]', 'INTEG(_aux2[DimA]-_aux3[DimA],init[DimA]*((delay[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__aux2', '__aux3'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level2[DimA]', 'INTEG(_aux1[DimA]-_aux2[DimA],init[DimA]*((delay[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__aux1', '__aux2'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level1[DimA]', 'INTEG(input[DimA]-_aux1[DimA],init[DimA]*((delay[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a1]', '_input[_a2]', '_input[_a3]', '__aux1'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux1[DimA]', '_level1[DimA]/((delay[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux1',
        references: ['__level1', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux2[DimA]', '_level2[DimA]/((delay[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux2',
        references: ['__level2', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux3[DimA]', '_level3[DimA]/((delay[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux3',
        references: ['__level3', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux4[DimA]', '((delay[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux4',
        references: ['_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima']
      })
    ])
  })

  it('should work for DELAY3I function (with separated variables using subdimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      input[DimA] = 10, 20, 30 ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 0 ~~|
      y[A1] = 5 ~~|
      y[SubA] = DELAY3I(input[SubA], delay[SubA], init[SubA]) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input[DimA]', '10,20,30', {
        refId: '_input[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[A1]', '5', {
        refId: '_y[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('y[SubA]', 'DELAY3I(input[SubA],delay[SubA],init[SubA])', {
        delayTimeVarName: '__aux_y_4',
        delayVarRefId: '__level_y_3[_a2]',
        refId: '_y[_a2]',
        references: ['__level_y_3[_a2]', '__level_y_2[_a2]', '__level_y_1[_a2]', '__aux_y_4[_a2]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('y[SubA]', 'DELAY3I(input[SubA],delay[SubA],init[SubA])', {
        delayTimeVarName: '__aux_y_4',
        delayVarRefId: '__level_y_3[_a3]',
        refId: '_y[_a3]',
        references: ['__level_y_3[_a3]', '__level_y_2[_a3]', '__level_y_1[_a3]', '__aux_y_4[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('_level_y_3[a2]', 'INTEG(_aux_y_2[a2]-_aux_y_3[a2],init[a2]*((delay[a2])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a2]'],
        refId: '__level_y_3[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_y_2', '__aux_y_3'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_2[a2]', 'INTEG(_aux_y_1[a2]-_aux_y_2[a2],init[a2]*((delay[a2])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a2]'],
        refId: '__level_y_2[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_y_1', '__aux_y_2'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_1[a2]', 'INTEG(input[a2]-_aux_y_1[a2],init[a2]*((delay[a2])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a2]'],
        refId: '__level_y_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a2]', '__aux_y_1'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_aux_y_1[a2]', '_level_y_1[a2]/((delay[a2])/3)', {
        includeInOutput: false,
        refId: '__aux_y_1',
        references: ['__level_y_1[_a2]', '_delay[_a2]'],
        subscripts: ['_a2']
      }),
      v('_aux_y_2[a2]', '_level_y_2[a2]/((delay[a2])/3)', {
        includeInOutput: false,
        refId: '__aux_y_2',
        references: ['__level_y_2[_a2]', '_delay[_a2]'],
        subscripts: ['_a2']
      }),
      v('_aux_y_3[a2]', '_level_y_3[a2]/((delay[a2])/3)', {
        includeInOutput: false,
        refId: '__aux_y_3',
        references: ['__level_y_3[_a2]', '_delay[_a2]'],
        subscripts: ['_a2']
      }),
      v('_aux_y_4[a2]', '((delay[a2])/3)', {
        includeInOutput: false,
        refId: '__aux_y_4[_a2]',
        references: ['_delay[_a2]'],
        subscripts: ['_a2']
      }),
      v('_level_y_3[a3]', 'INTEG(_aux_y_2[a3]-_aux_y_3[a3],init[a3]*((delay[a3])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a3]'],
        refId: '__level_y_3[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_y_2', '__aux_y_3'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_y_2[a3]', 'INTEG(_aux_y_1[a3]-_aux_y_2[a3],init[a3]*((delay[a3])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a3]'],
        refId: '__level_y_2[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_y_1', '__aux_y_2'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_y_1[a3]', 'INTEG(input[a3]-_aux_y_1[a3],init[a3]*((delay[a3])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a3]'],
        refId: '__level_y_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a3]', '__aux_y_1'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_aux_y_1[a3]', '_level_y_1[a3]/((delay[a3])/3)', {
        includeInOutput: false,
        refId: '__aux_y_1',
        references: ['__level_y_1[_a3]', '_delay[_a3]'],
        subscripts: ['_a3']
      }),
      v('_aux_y_2[a3]', '_level_y_2[a3]/((delay[a3])/3)', {
        includeInOutput: false,
        refId: '__aux_y_2',
        references: ['__level_y_2[_a3]', '_delay[_a3]'],
        subscripts: ['_a3']
      }),
      v('_aux_y_3[a3]', '_level_y_3[a3]/((delay[a3])/3)', {
        includeInOutput: false,
        refId: '__aux_y_3',
        references: ['__level_y_3[_a3]', '_delay[_a3]'],
        subscripts: ['_a3']
      }),
      v('_aux_y_4[a3]', '((delay[a3])/3)', {
        includeInOutput: false,
        refId: '__aux_y_4[_a3]',
        references: ['_delay[_a3]'],
        subscripts: ['_a3']
      })
    ])
  })

  it('should work for DELAY FIXED function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = 2 ~~|
      delay = y + 5 ~~|
      init = 3 ~~|
      z = DELAY FIXED(x, delay, init) ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', '2', {
        refId: '_y',
        varType: 'const'
      }),
      v('delay', 'y+5', {
        refId: '_delay',
        references: ['_y']
      }),
      v('init', '3', {
        refId: '_init',
        varType: 'const'
      }),
      v('z', 'DELAY FIXED(x,delay,init)', {
        refId: '_z',
        varType: 'level',
        varSubtype: 'fixedDelay',
        fixedDelayVarName: '__fixed_delay1',
        references: ['_x'],
        hasInitValue: true,
        initReferences: ['_delay', '_init'],
        referencedFunctionNames: ['__delay_fixed']
      })
    ])
  })

  it('should work for DEPRECIATE STRAIGHTLINE function', () => {
    const vars = readInlineModel(`
      dtime = 20 ~~|
      fisc = 1 ~~|
      init = 5 ~~|
      Capacity Cost = 1000 ~~|
      New Capacity = 2000 ~~|
      stream = Capacity Cost * New Capacity ~~|
      Depreciated Amount = DEPRECIATE STRAIGHTLINE(stream, dtime, fisc, init) ~~|
    `)
    expect(vars).toEqual([
      v('dtime', '20', {
        refId: '_dtime',
        varType: 'const'
      }),
      v('fisc', '1', {
        refId: '_fisc',
        varType: 'const'
      }),
      v('init', '5', {
        refId: '_init',
        varType: 'const'
      }),
      v('Capacity Cost', '1000', {
        refId: '_capacity_cost',
        varType: 'const'
      }),
      v('New Capacity', '2000', {
        refId: '_new_capacity',
        varType: 'const'
      }),
      v('stream', 'Capacity Cost*New Capacity', {
        refId: '_stream',
        references: ['_capacity_cost', '_new_capacity']
      }),
      v('Depreciated Amount', 'DEPRECIATE STRAIGHTLINE(stream,dtime,fisc,init)', {
        refId: '_depreciated_amount',
        varSubtype: 'depreciation',
        depreciationVarName: '__depreciation1',
        references: ['_stream', '_init'],
        hasInitValue: true,
        initReferences: ['_dtime', '_fisc'],
        referencedFunctionNames: ['__depreciate_straightline']
      })
    ])
  })

  it('should work for GAMMA LN function', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      y = GAMMA LN(x) ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', 'GAMMA LN(x)', {
        refId: '_y',
        referencedFunctionNames: ['__gamma_ln'],
        references: ['_x']
      })
    ])
  })

  it('should work for GET DIRECT CONSTANTS function (single value)', () => {
    const vars = readInlineModel(`
      x = GET DIRECT CONSTANTS('data/a.csv', ',', 'B2') ~~|
    `)
    expect(vars).toEqual([
      v('x', "GET DIRECT CONSTANTS('data/a.csv',',','B2')", {
        directConstArgs: { file: 'data/a.csv', tab: ',', startCell: 'B2' },
        refId: '_x',
        varType: 'const'
      })
    ])
  })

  it('should work for GET DIRECT CONSTANTS function (1D)', () => {
    const vars = readInlineModel(`
      DimB: B1, B2, B3 ~~|
      x[DimB] = GET DIRECT CONSTANTS('data/b.csv', ',', 'B2*') ~~|
    `)
    expect(vars).toEqual([
      v('x[DimB]', "GET DIRECT CONSTANTS('data/b.csv',',','B2*')", {
        directConstArgs: { file: 'data/b.csv', tab: ',', startCell: 'B2*' },
        refId: '_x',
        subscripts: ['_dimb'],
        varType: 'const'
      })
    ])
  })

  it('should work for GET DIRECT CONSTANTS function (2D)', () => {
    const vars = readInlineModel(`
      DimB: B1, B2, B3 ~~|
      DimC: C1, C2 ~~|
      x[DimB, DimC] = GET DIRECT CONSTANTS('data/c.csv', ',', 'B2') ~~|
    `)
    expect(vars).toEqual([
      v('x[DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", {
        directConstArgs: { file: 'data/c.csv', tab: ',', startCell: 'B2' },
        refId: '_x',
        subscripts: ['_dimb', '_dimc'],
        varType: 'const'
      })
    ])
  })

  it('should work for GET DIRECT CONSTANTS function (separate definitions)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      DimC: C1, C2 ~~|
      x[DimC, SubA] = GET DIRECT CONSTANTS('data/f.csv',',','B2') ~~|
      x[DimC, DimA] :EXCEPT: [DimC, SubA] = 0 ~~|
    `)
    expect(vars).toEqual([
      v('x[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        directConstArgs: { file: 'data/f.csv', tab: ',', startCell: 'B2' },
        refId: '_x[_a2,_dimc]',
        separationDims: ['_suba'],
        subscripts: ['_a2', '_dimc'],
        varType: 'const'
      }),
      v('x[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        directConstArgs: { file: 'data/f.csv', tab: ',', startCell: 'B2' },
        refId: '_x[_a3,_dimc]',
        separationDims: ['_suba'],
        subscripts: ['_a3', '_dimc'],
        varType: 'const'
      }),
      v('x[DimC,DimA]:EXCEPT:[DimC,SubA]', '0', {
        refId: '_x[_a1,_dimc]',
        separationDims: ['_dima'],
        subscripts: ['_a1', '_dimc'],
        varType: 'const'
      })
    ])
  })

  it('should work for GET DIRECT DATA function (single value)', () => {
    const vars = readInlineModel(`
      x = GET DIRECT DATA('g_data.csv', ',', 'A', 'B13') ~~|
      y = x * 10 ~~|
    `)
    expect(vars).toEqual([
      v('x', "GET DIRECT DATA('g_data.csv',',','A','B13')", {
        directDataArgs: { file: 'g_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B13' },
        refId: '_x',
        varType: 'data'
      }),
      v('y', 'x*10', {
        refId: '_y',
        references: ['_x']
      })
    ])
  })

  it('should work for GET DIRECT DATA function (1D)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      x[DimA] = GET DIRECT DATA('e_data.csv', ',', 'A', 'B5') ~~|
      y = x[A2] * 10 ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B5')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B5' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B5')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B5' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('y', 'x[A2]*10', {
        refId: '_y',
        references: ['_x[_a2]']
      })
    ])
  })

  it('should work for GET DIRECT DATA function (2D with separate definitions)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      DimB: B1, B2 ~~|
      x[A1, DimB] = GET DIRECT DATA('e_data.csv', ',', 'A', 'B5') ~~|
      x[A2, DimB] = 0 ~~|
      y = x[A2, B1] * 10 ~~|
    `)
    expect(vars).toEqual([
      v('x[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B5')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B5' },
        refId: '_x[_a1,_b1]',
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b1'],
        varType: 'data'
      }),
      v('x[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B5')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B5' },
        refId: '_x[_a1,_b2]',
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b2'],
        varType: 'data'
      }),
      v('x[A2,DimB]', '0', {
        refId: '_x[_a2,_dimb]',
        subscripts: ['_a2', '_dimb'],
        varType: 'const'
      }),
      v('y', 'x[A2,B1]*10', {
        refId: '_y',
        references: ['_x[_a2,_dimb]']
      })
    ])
  })

  it('should work for GET DIRECT LOOKUPS function', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookup_data.csv', ',', '1', 'AH2') ~~|
      y[DimA] = x[DimA](Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'data'
      }),
      v('y[DimA]', 'x[DimA](Time)', {
        refId: '_y',
        referencedLookupVarNames: ['_x'],
        references: ['_time'],
        subscripts: ['_dima']
      }),
      v('z', 'y[A2]', {
        refId: '_z',
        references: ['_y']
      })
    ])
  })

  it('should work for IF THEN ELSE function', () => {
    const vars = readInlineModel(`
      x = 100 ~~|
      y = 2 ~~|
      z = IF THEN ELSE(Time > x, 1, y) ~~|
    `)
    expect(vars).toEqual([
      v('x', '100', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', '2', {
        refId: '_y',
        varType: 'const'
      }),
      v('z', 'IF THEN ELSE(Time>x,1,y)', {
        refId: '_z',
        references: ['_time', '_x', '_y']
      })
    ])
  })

  it('should work for INITIAL function', () => {
    const vars = readInlineModel(`
      x = Time * 2 ~~|
      y = INITIAL(x) ~~|
    `)
    expect(vars).toEqual([
      v('x', 'Time*2', {
        refId: '_x',
        references: ['_time']
      }),
      v('y', 'INITIAL(x)', {
        refId: '_y',
        varType: 'initial',
        hasInitValue: true,
        initReferences: ['_x'],
        referencedFunctionNames: ['__initial']
      })
    ])
  })

  it('should work for INTEG function', () => {
    const vars = readInlineModel(`
      x = Time * 2 ~~|
      init = 5 ~~|
      y = INTEG(x, init) ~~|
    `)
    expect(vars).toEqual([
      v('x', 'Time*2', {
        refId: '_x',
        references: ['_time']
      }),
      v('init', '5', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'INTEG(x,init)', {
        refId: '_y',
        varType: 'level',
        references: ['_x'],
        hasInitValue: true,
        initReferences: ['_init'],
        referencedFunctionNames: ['__integ']
      })
    ])
  })

  it('should work for INTEG function (with nested function calls)', () => {
    const vars = readInlineModel(`
      x = Time * 2 ~~|
      init = 5 ~~|
      y = INTEG(ABS(x), POW(init, 3)) ~~|
    `)
    expect(vars).toEqual([
      v('x', 'Time*2', {
        refId: '_x',
        references: ['_time']
      }),
      v('init', '5', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'INTEG(ABS(x),POW(init,3))', {
        refId: '_y',
        varType: 'level',
        references: ['_x'],
        hasInitValue: true,
        initReferences: ['_init'],
        referencedFunctionNames: ['__integ', '__abs', '__pow']
      })
    ])
  })

  it('should work for LOOKUP BACKWARD function (with lookup defined explicitly)', () => {
    const vars = readInlineModel(`
      x( (0,0),(2,1.3) ) ~~|
      y = LOOKUP BACKWARD(x, 1) ~~|
    `)
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'lookup',
        range: [],
        points: [
          [0, 0],
          [2, 1.3]
        ]
      }),
      v('y', 'LOOKUP BACKWARD(x,1)', {
        refId: '_y',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_x']
      })
    ])
  })

  it('should work for LOOKUP BACKWARD function (with lookup defined using GET DIRECT LOOKUPS)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookup_data.csv', ',', '1', 'AH2') ~~|
      y[DimA] = LOOKUP BACKWARD(x[DimA], Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'data'
      }),
      v('y[DimA]', 'LOOKUP BACKWARD(x[DimA],Time)', {
        refId: '_y',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_x[_a1]', '_x[_a2]', '_x[_a3]', '_time'],
        subscripts: ['_dima']
      }),
      v('z', 'y[A2]', {
        refId: '_z',
        references: ['_y']
      })
    ])
  })

  it('should work for LOOKUP FORWARD function (with lookup defined explicitly)', () => {
    const vars = readInlineModel(`
      x( (0,0),(2,1.3) ) ~~|
      y = LOOKUP FORWARD(x, 1) ~~|
    `)
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'lookup',
        range: [],
        points: [
          [0, 0],
          [2, 1.3]
        ]
      }),
      v('y', 'LOOKUP FORWARD(x,1)', {
        refId: '_y',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_x']
      })
    ])
  })

  it('should work for LOOKUP FORWARD function (with lookup defined using GET DIRECT LOOKUPS)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookup_data.csv', ',', '1', 'AH2') ~~|
      y[DimA] = LOOKUP FORWARD(x[DimA], Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'data'
      }),
      v('y[DimA]', 'LOOKUP FORWARD(x[DimA],Time)', {
        refId: '_y',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_x[_a1]', '_x[_a2]', '_x[_a3]', '_time'],
        subscripts: ['_dima']
      }),
      v('z', 'y[A2]', {
        refId: '_z',
        references: ['_y']
      })
    ])
  })

  it('should work for LOOKUP INVERT function (with lookup defined explicitly)', () => {
    const vars = readInlineModel(`
      x( (0,0),(2,1.3) ) ~~|
      y = LOOKUP INVERT(x, 1) ~~|
    `)
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'lookup',
        range: [],
        points: [
          [0, 0],
          [2, 1.3]
        ]
      }),
      v('y', 'LOOKUP INVERT(x,1)', {
        refId: '_y',
        referencedFunctionNames: ['__lookup_invert'],
        references: ['_x']
      })
    ])
  })

  it('should work for LOOKUP INVERT function (with lookup defined using GET DIRECT LOOKUPS)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookup_data.csv', ',', '1', 'AH2') ~~|
      y[DimA] = LOOKUP INVERT(x[DimA], Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'data'
      }),
      v('y[DimA]', 'LOOKUP INVERT(x[DimA],Time)', {
        refId: '_y',
        referencedFunctionNames: ['__lookup_invert'],
        references: ['_x[_a1]', '_x[_a2]', '_x[_a3]', '_time'],
        subscripts: ['_dima']
      }),
      v('z', 'y[A2]', {
        refId: '_z',
        references: ['_y']
      })
    ])
  })

  it('should work for MAX function', () => {
    const vars = readInlineModel(`
      a = 10 ~~|
      b = 20 ~~|
      y = MAX(a, b) ~~|
    `)
    expect(vars).toEqual([
      v('a', '10', {
        refId: '_a',
        varType: 'const'
      }),
      v('b', '20', {
        refId: '_b',
        varType: 'const'
      }),
      v('y', 'MAX(a,b)', {
        refId: '_y',
        referencedFunctionNames: ['__max'],
        references: ['_a', '_b']
      })
    ])
  })

  it('should work for MIN function', () => {
    const vars = readInlineModel(`
      a = 10 ~~|
      b = 20 ~~|
      y = MIN(a, b) ~~|
    `)
    expect(vars).toEqual([
      v('a', '10', {
        refId: '_a',
        varType: 'const'
      }),
      v('b', '20', {
        refId: '_b',
        varType: 'const'
      }),
      v('y', 'MIN(a,b)', {
        refId: '_y',
        referencedFunctionNames: ['__min'],
        references: ['_a', '_b']
      })
    ])
  })

  it('should work for MODULO function', () => {
    const vars = readInlineModel(`
      a = 20 ~~|
      b = 10 ~~|
      y = MODULO(a, b) ~~|
    `)
    expect(vars).toEqual([
      v('a', '20', {
        refId: '_a',
        varType: 'const'
      }),
      v('b', '10', {
        refId: '_b',
        varType: 'const'
      }),
      v('y', 'MODULO(a,b)', {
        refId: '_y',
        referencedFunctionNames: ['__modulo'],
        references: ['_a', '_b']
      })
    ])
  })

  // TODO: Add a variant where discount rate is defined as (x+1) (old reader did not include
  // parens and might generate incorrect equation)
  it('should work for NPV function', () => {
    const vars = readInlineModel(`
      stream = 100 ~~|
      discount rate = 10 ~~|
      init = 0 ~~|
      factor = 2 ~~|
      y = NPV(stream, discount rate, init, factor) ~~|
    `)
    expect(vars).toEqual([
      v('stream', '100', {
        refId: '_stream',
        varType: 'const'
      }),
      v('discount rate', '10', {
        refId: '_discount_rate',
        varType: 'const'
      }),
      v('init', '0', {
        refId: '_init',
        varType: 'const'
      }),
      v('factor', '2', {
        refId: '_factor',
        varType: 'const'
      }),
      v('y', 'NPV(stream,discount rate,init,factor)', {
        refId: '_y',
        references: ['__level2', '__level1', '__aux1'],
        npvVarName: '__aux1'
      }),
      v('_level1', 'INTEG((-_level1*discount rate)/(1+discount rate*TIME STEP),1)', {
        refId: '__level1',
        varType: 'level',
        includeInOutput: false,
        references: ['_discount_rate', '_time_step'],
        hasInitValue: true,
        referencedFunctionNames: ['__integ']
      }),
      v('_level2', 'INTEG(stream*_level1,init)', {
        refId: '__level2',
        varType: 'level',
        includeInOutput: false,
        references: ['_stream', '__level1'],
        hasInitValue: true,
        initReferences: ['_init'],
        referencedFunctionNames: ['__integ']
      }),
      v('_aux1', '(_level2+stream*TIME STEP*_level1)*factor', {
        refId: '__aux1',
        includeInOutput: false,
        references: ['__level2', '_stream', '_time_step', '__level1', '_factor']
      })
    ])
  })

  // TODO
  it.skip('should work for NPV function (with subscripted variables)', () => {})

  it('should work for PULSE function', () => {
    const vars = readInlineModel(`
      start = 10 ~~|
      width = 20 ~~|
      y = PULSE(start, width) ~~|
    `)
    expect(vars).toEqual([
      v('start', '10', {
        refId: '_start',
        varType: 'const'
      }),
      v('width', '20', {
        refId: '_width',
        varType: 'const'
      }),
      v('y', 'PULSE(start,width)', {
        refId: '_y',
        referencedFunctionNames: ['__pulse'],
        references: ['_start', '_width']
      })
    ])
  })

  it('should work for SAMPLE IF TRUE function', () => {
    const vars = readInlineModel(`
      initial = 10 ~~|
      input = 5 ~~|
      x = 1 ~~|
      y = SAMPLE IF TRUE(Time > x, input, initial) ~~|
    `)
    expect(vars).toEqual([
      v('initial', '10', {
        refId: '_initial',
        varType: 'const'
      }),
      v('input', '5', {
        refId: '_input',
        varType: 'const'
      }),
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', 'SAMPLE IF TRUE(Time>x,input,initial)', {
        refId: '_y',
        references: ['_time', '_x', '_input'],
        hasInitValue: true,
        initReferences: ['_initial'],
        referencedFunctionNames: ['__sample_if_true']
      })
    ])
  })

  it('should work for SMOOTH function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = SMOOTH(input, delay) ~~|
    `)
    expect(vars).toEqual([
      v('input', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y', 'SMOOTH(input,delay)', {
        refId: '_y',
        references: ['__level1'],
        smoothVarRefId: '__level1'
      }),
      v('_level1', 'INTEG((input-_level1)/delay,input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTHI function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      init = 5 ~~|
      y = SMOOTHI(input, delay, init) ~~|
    `)
    expect(vars).toEqual([
      v('input', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('init', '5', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'SMOOTHI(input,delay,init)', {
        refId: '_y',
        references: ['__level1'],
        smoothVarRefId: '__level1'
      }),
      v('_level1', 'INTEG((input-_level1)/delay,init)', {
        includeInOutput: false,
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        hasInitValue: true,
        initReferences: ['_init'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTHI function (with subscripted variables)', () => {
    // Note that we have a mix of non-apply-to-all (delay, init) and apply-to-all (input)
    // variables here to cover both cases
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      input[DimA] = x[DimA] + PULSE(10, 10) ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 4, 5, 6 ~~|
      y[DimA] = SMOOTHI(input[DimA], delay[DimA], init[DimA]) ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('input[DimA]', 'x[DimA]+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        references: ['_x[_a1]', '_x[_a2]', '_x[_a3]'],
        subscripts: ['_dima']
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '4,5,6', {
        refId: '_init[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('init[DimA]', '4,5,6', {
        refId: '_init[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('init[DimA]', '4,5,6', {
        refId: '_init[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('y[DimA]', 'SMOOTHI(input[DimA],delay[DimA],init[DimA])', {
        refId: '_y',
        references: ['__level1'],
        smoothVarRefId: '__level1',
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG((input[DimA]-_level1[DimA])/delay[DimA],init[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init[_a1]', '_init[_a2]', '_init[_a3]'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTHI function (with separated variables using subdimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      input[DimA] = x[DimA] + PULSE(10, 10) ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 0 ~~|
      y[A1] = 5 ~~|
      y[SubA] = SMOOTHI(input[SubA], delay[SubA], init[SubA]) ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('input[DimA]', 'x[DimA]+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        references: ['_x[_a1]', '_x[_a2]', '_x[_a3]'],
        subscripts: ['_dima']
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[A1]', '5', {
        refId: '_y[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('y[SubA]', 'SMOOTHI(input[SubA],delay[SubA],init[SubA])', {
        refId: '_y[_a2]',
        references: ['__level_y_1[_a2]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_y_1[_a2]',
        subscripts: ['_a2']
      }),
      v('y[SubA]', 'SMOOTHI(input[SubA],delay[SubA],init[SubA])', {
        refId: '_y[_a3]',
        references: ['__level_y_1[_a3]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_y_1[_a3]',
        subscripts: ['_a3']
      }),
      v('_level_y_1[a2]', 'INTEG((input[a2]-_level_y_1[a2])/delay[a2],init[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_1[a3]', 'INTEG((input[a3]-_level_y_1[a3])/delay[a3],init[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTH3 function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = SMOOTH3(input, delay) ~~|
    `)
    expect(vars).toEqual([
      v('input', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y', 'SMOOTH3(input,delay)', {
        refId: '_y',
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3'
      }),
      v('_level1', 'INTEG((input-_level1)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        varType: 'level'
      }),
      v('_level2', 'INTEG((_level1-_level2)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_delay'],
        varType: 'level'
      }),
      v('_level3', 'INTEG((_level2-_level3)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_delay'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTH3 function (when nested in another function)', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = MAX(SMOOTH3(input, delay), 0) ~~|
    `)
    expect(vars).toEqual([
      v('input', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y', 'MAX(SMOOTH3(input,delay),0)', {
        refId: '_y',
        referencedFunctionNames: ['__max'],
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3'
      }),
      v('_level1', 'INTEG((input-_level1)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        varType: 'level'
      }),
      v('_level2', 'INTEG((_level1-_level2)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_delay'],
        varType: 'level'
      }),
      v('_level3', 'INTEG((_level2-_level3)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_delay'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTH3I function', () => {
    const vars = readInlineModel(`
      input = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y = SMOOTH3I(input, delay, 5) ~~|
    `)
    expect(vars).toEqual([
      v('input', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y', 'SMOOTH3I(input,delay,5)', {
        refId: '_y',
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3'
      }),
      v('_level1', 'INTEG((input-_level1)/(delay/3),5)', {
        hasInitValue: true,
        includeInOutput: false,
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        varType: 'level'
      }),
      v('_level2', 'INTEG((_level1-_level2)/(delay/3),5)', {
        hasInitValue: true,
        includeInOutput: false,
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_delay'],
        varType: 'level'
      }),
      v('_level3', 'INTEG((_level2-_level3)/(delay/3),5)', {
        hasInitValue: true,
        includeInOutput: false,
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_delay'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTH3I function (with nested function calls)', () => {
    const vars = readInlineModel(`
      x = 1 ~~|
      input = x + PULSE(10, 10) ~~|
      delay = 3 ~~|
      init = 0 ~~|
      y = SMOOTH3I(MIN(0, input), MIN(0, delay), ABS(init)) ~~|
    `)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('input', 'x+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        references: ['_x']
      }),
      v('delay', '3', {
        refId: '_delay',
        varType: 'const'
      }),
      v('init', '0', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'SMOOTH3I(MIN(0,input),MIN(0,delay),ABS(init))', {
        refId: '_y',
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3'
      }),
      v('_level1', 'INTEG((MIN(0,input)-_level1)/(MIN(0,delay)/3),ABS(init))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level1',
        referencedFunctionNames: ['__integ', '__min', '__abs'],
        references: ['_input', '_delay'],
        varType: 'level'
      }),
      v('_level2', 'INTEG((_level1-_level2)/(MIN(0,delay)/3),ABS(init))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level2',
        referencedFunctionNames: ['__integ', '__min', '__abs'],
        references: ['__level1', '_delay'],
        varType: 'level'
      }),
      v('_level3', 'INTEG((_level2-_level3)/(MIN(0,delay)/3),ABS(init))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level3',
        referencedFunctionNames: ['__integ', '__min', '__abs'],
        references: ['__level2', '_delay'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTH3I function (with subscripted variables)', () => {
    // Note that we have a mix of non-apply-to-all (input, delay) and apply-to-all (init)
    // variables here to cover both cases
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      input[DimA] = x[DimA] + PULSE(10, 10) ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 4, 5, 6 ~~|
      y[DimA] = SMOOTH3I(input[DimA], delay[DimA], init[DimA]) ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('input[DimA]', 'x[DimA]+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        references: ['_x[_a1]', '_x[_a2]', '_x[_a3]'],
        subscripts: ['_dima']
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '4,5,6', {
        refId: '_init[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('init[DimA]', '4,5,6', {
        refId: '_init[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('init[DimA]', '4,5,6', {
        refId: '_init[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('y[DimA]', 'SMOOTH3I(input[DimA],delay[DimA],init[DimA])', {
        refId: '_y',
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3',
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG((input[DimA]-_level1[DimA])/(delay[DimA]/3),init[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init[_a1]', '_init[_a2]', '_init[_a3]'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level2[DimA]', 'INTEG((_level1[DimA]-_level2[DimA])/(delay[DimA]/3),init[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init[_a1]', '_init[_a2]', '_init[_a3]'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level3[DimA]', 'INTEG((_level2[DimA]-_level3[DimA])/(delay[DimA]/3),init[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init[_a1]', '_init[_a2]', '_init[_a3]'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_delay[_a1]', '_delay[_a2]', '_delay[_a3]'],
        subscripts: ['_dima'],
        varType: 'level'
      })
    ])
  })

  it('should work for SMOOTH3I function (with separated variables using subdimension)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      SubA: A2, A3 ~~|
      x[DimA] = 1, 2, 3 ~~|
      input[DimA] = x[DimA] + PULSE(10, 10) ~~|
      delay[DimA] = 1, 2, 3 ~~|
      init[DimA] = 0 ~~|
      y[A1] = 5 ~~|
      y[SubA] = SMOOTH3I(input[SubA], delay[SubA], init[SubA]) ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('x[DimA]', '1,2,3', {
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('input[DimA]', 'x[DimA]+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        references: ['_x[_a1]', '_x[_a2]', '_x[_a3]'],
        subscripts: ['_dima']
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[DimA]', '1,2,3', {
        refId: '_delay[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[A1]', '5', {
        refId: '_y[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('y[SubA]', 'SMOOTH3I(input[SubA],delay[SubA],init[SubA])', {
        refId: '_y[_a2]',
        references: ['__level_y_1[_a2]', '__level_y_2[_a2]', '__level_y_3[_a2]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_y_3[_a2]',
        subscripts: ['_a2']
      }),
      v('y[SubA]', 'SMOOTH3I(input[SubA],delay[SubA],init[SubA])', {
        refId: '_y[_a3]',
        references: ['__level_y_1[_a3]', '__level_y_2[_a3]', '__level_y_3[_a3]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_y_3[_a3]',
        subscripts: ['_a3']
      }),
      v('_level_y_1[a2]', 'INTEG((input[a2]-_level_y_1[a2])/(delay[a2]/3),init[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_2[a2]', 'INTEG((_level_y_1[a2]-_level_y_2[a2])/(delay[a2]/3),init[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_2[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_y_1[_a2]', '_delay[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_3[a2]', 'INTEG((_level_y_2[a2]-_level_y_3[a2])/(delay[a2]/3),init[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_3[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_y_2[_a2]', '_delay[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_1[a3]', 'INTEG((input[a3]-_level_y_1[a3])/(delay[a3]/3),init[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_y_2[a3]', 'INTEG((_level_y_1[a3]-_level_y_2[a3])/(delay[a3]/3),init[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_2[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_y_1[_a3]', '_delay[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_y_3[a3]', 'INTEG((_level_y_2[a3]-_level_y_3[a3])/(delay[a3]/3),init[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init'],
        refId: '__level_y_3[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_y_2[_a3]', '_delay[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      })
    ])
  })

  it('should work for TREND function', () => {
    const vars = readInlineModel(`
      input = 1 ~~|
      avg time = 2 ~~|
      init = 3 ~~|
      y = TREND(input, avg time, init) ~~|
    `)
    expect(vars).toEqual([
      v('input', '1', {
        refId: '_input',
        varType: 'const'
      }),
      v('avg time', '2', {
        refId: '_avg_time',
        varType: 'const'
      }),
      v('init', '3', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'TREND(input,avg time,init)', {
        refId: '_y',
        references: ['__level1', '__aux1'],
        trendVarName: '__aux1'
      }),
      v('_level1', 'INTEG((input-_level1)/avg time,input/(1+init*avg time))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_init', '_avg_time'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_avg_time'],
        varType: 'level'
      }),
      v('_aux1', 'ZIDZ(input-_level1,avg time*ABS(_level1))', {
        includeInOutput: false,
        refId: '__aux1',
        referencedFunctionNames: ['__zidz', '__abs'],
        references: ['_input', '__level1', '_avg_time']
      })
    ])
  })

  it('should work for TREND function (with subscripted variables)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      input[DimA] = 1, 2 ~~|
      avg time[DimA] = 3, 4 ~~|
      init[DimA] = 5 ~~|
      y[DimA] = TREND(input[DimA], avg time[DimA], init[DimA]) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '1,2', {
        refId: '_input[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[DimA]', '1,2', {
        refId: '_input[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('avg time[DimA]', '3,4', {
        refId: '_avg_time[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('avg time[DimA]', '3,4', {
        refId: '_avg_time[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('init[DimA]', '5', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[DimA]', 'TREND(input[DimA],avg time[DimA],init[DimA])', {
        refId: '_y',
        references: ['__level1', '__aux1'],
        subscripts: ['_dima'],
        trendVarName: '__aux1'
      }),
      v(
        '_level1[DimA]',
        'INTEG((input[DimA]-_level1[DimA])/avg time[DimA],input[DimA]/(1+init[DimA]*avg time[DimA]))',
        {
          hasInitValue: true,
          includeInOutput: false,
          initReferences: ['_input[_a1]', '_input[_a2]', '_init', '_avg_time[_a1]', '_avg_time[_a2]'],
          refId: '__level1',
          referencedFunctionNames: ['__integ'],
          references: ['_input[_a1]', '_input[_a2]', '_avg_time[_a1]', '_avg_time[_a2]'],
          subscripts: ['_dima'],
          varType: 'level'
        }
      ),
      v('_aux1[DimA]', 'ZIDZ(input[DimA]-_level1[DimA],avg time[DimA]*ABS(_level1[DimA]))', {
        includeInOutput: false,
        refId: '__aux1',
        referencedFunctionNames: ['__zidz', '__abs'],
        references: ['_input[_a1]', '_input[_a2]', '__level1', '_avg_time[_a1]', '_avg_time[_a2]'],
        subscripts: ['_dima']
      })
    ])
  })

  it('should work for WITH LOOKUP function', () => {
    const vars = readInlineModel(`
      y = WITH LOOKUP(Time, ( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) )) ~~|
    `)
    expect(vars).toEqual([
      v('y', 'WITH LOOKUP(Time,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))', {
        lookupArgVarName: '__lookup1',
        refId: '_y',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup1'],
        references: ['_time']
      }),
      v('_lookup1', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [0.1, 0.01],
          [0.5, 0.7],
          [1, 1],
          [1.5, 1.2],
          [2, 1.3]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup1',
        varType: 'lookup'
      })
    ])
  })

  it('should work for Vensim "active_initial" model', () => {
    const vars = readSubscriptsAndEquations('active_initial')
    expect(vars).toEqual([
      v('Capacity', 'INTEG(Capacity Adjustment Rate,Target Capacity)', {
        hasInitValue: true,
        initReferences: ['_target_capacity'],
        refId: '_capacity',
        referencedFunctionNames: ['__integ'],
        references: ['_capacity_adjustment_rate'],
        varType: 'level'
      }),
      v('Capacity Adjustment Rate', '(Target Capacity-Capacity)/Capacity Adjustment Time', {
        refId: '_capacity_adjustment_rate',
        references: ['_target_capacity', '_capacity', '_capacity_adjustment_time']
      }),
      v('Capacity Adjustment Time', '10', {
        refId: '_capacity_adjustment_time',
        varType: 'const'
      }),
      v('Capacity Utilization', 'Production/Capacity', {
        refId: '_capacity_utilization',
        references: ['_production', '_capacity']
      }),
      v('FINAL TIME', '100', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('Initial Target Capacity', '100', {
        refId: '_initial_target_capacity',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('Production', '100+STEP(100,10)', {
        refId: '_production',
        referencedFunctionNames: ['__step']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('Target Capacity', 'ACTIVE INITIAL(Capacity*Utilization Adjustment,Initial Target Capacity)', {
        hasInitValue: true,
        initReferences: ['_initial_target_capacity'],
        refId: '_target_capacity',
        referencedFunctionNames: ['__active_initial'],
        references: ['_capacity', '_utilization_adjustment']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Utilization Adjustment', 'Capacity Utilization^Utilization Sensitivity', {
        refId: '_utilization_adjustment',
        references: ['_capacity_utilization', '_utilization_sensitivity']
      }),
      v('Utilization Sensitivity', '1', {
        refId: '_utilization_sensitivity',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "allocate" model', () => {
    const vars = readSubscriptsAndEquations('allocate')
    expect(vars).toEqual([
      v('demand[region]', '3,2,4', {
        refId: '_demand[_boston]',
        separationDims: ['_region'],
        subscripts: ['_boston'],
        varType: 'const'
      }),
      v('demand[region]', '3,2,4', {
        refId: '_demand[_dayton]',
        separationDims: ['_region'],
        subscripts: ['_dayton'],
        varType: 'const'
      }),
      v('demand[region]', '3,2,4', {
        refId: '_demand[_fresno]',
        separationDims: ['_region'],
        subscripts: ['_fresno'],
        varType: 'const'
      }),
      v('extra', '1', {
        refId: '_extra',
        varType: 'const'
      }),
      v('Final Supply', '10', {
        refId: '_final_supply',
        varType: 'const'
      }),
      v('FINAL TIME', '12', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('Initial Supply', '0', {
        refId: '_initial_supply',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('integer supply', '0', {
        refId: '_integer_supply',
        varType: 'const'
      }),
      v('integer type', '0', {
        refId: '_integer_type',
        varType: 'const'
      }),
      v('priority type', '3', {
        refId: '_priority_type',
        varType: 'const'
      }),
      v('priority vector[region,pextra]', 'extra', {
        refId: '_priority_vector[_region,_pextra]',
        references: ['_extra'],
        subscripts: ['_region', '_pextra']
      }),
      v('priority vector[region,ppriority]', 'priority[region]', {
        refId: '_priority_vector[_region,_ppriority]',
        references: ['_priority[_boston]', '_priority[_dayton]', '_priority[_fresno]'],
        subscripts: ['_region', '_ppriority']
      }),
      v('priority vector[region,ptype]', 'priority type+integer type', {
        refId: '_priority_vector[_region,_ptype]',
        references: ['_priority_type', '_integer_type'],
        subscripts: ['_region', '_ptype']
      }),
      v('priority vector[region,pwidth]', 'priority width', {
        refId: '_priority_vector[_region,_pwidth]',
        references: ['_priority_width'],
        subscripts: ['_region', '_pwidth']
      }),
      v('priority width', '1', {
        refId: '_priority_width',
        varType: 'const'
      }),
      v('priority[region]', '1,2,3', {
        refId: '_priority[_boston]',
        separationDims: ['_region'],
        subscripts: ['_boston'],
        varType: 'const'
      }),
      v('priority[region]', '1,2,3', {
        refId: '_priority[_dayton]',
        separationDims: ['_region'],
        subscripts: ['_dayton'],
        varType: 'const'
      }),
      v('priority[region]', '1,2,3', {
        refId: '_priority[_fresno]',
        separationDims: ['_region'],
        subscripts: ['_fresno'],
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v(
        'shipments[region]',
        'ALLOCATE AVAILABLE(demand[region],priority vector[region,ptype],total supply available)',
        {
          refId: '_shipments',
          referencedFunctionNames: ['__allocate_available'],
          references: [
            '_demand[_boston]',
            '_demand[_dayton]',
            '_demand[_fresno]',
            '_priority_vector[_region,_ppriority]',
            '_priority_vector[_region,_pwidth]',
            '_total_supply_available'
          ],
          subscripts: ['_region']
        }
      ),
      v('TIME STEP', '0.125', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('total demand', 'SUM(demand[region!])', {
        refId: '_total_demand',
        referencedFunctionNames: ['__sum'],
        references: ['_demand[_boston]', '_demand[_dayton]', '_demand[_fresno]']
      }),
      v('total shipments', 'SUM(shipments[region!])', {
        refId: '_total_shipments',
        referencedFunctionNames: ['__sum'],
        references: ['_shipments']
      }),
      v(
        'total supply available',
        'IF THEN ELSE(integer supply,INTEGER(Initial Supply+(Final Supply-Initial Supply)*(Time-INITIAL TIME)/(FINAL TIME-INITIAL TIME)),Initial Supply+(Final Supply-Initial Supply)*(Time-INITIAL TIME)/(FINAL TIME-INITIAL TIME))',
        {
          refId: '_total_supply_available',
          references: ['_initial_supply', '_final_supply', '_time', '_initial_time', '_final_time']
        }
      ),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  // it('should work for Vensim "arrays_varname" model', () => {
  //   const vars = readSubscriptsAndEquations('arrays_varname')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  it('should work for Vensim "delay" model', () => {
    const vars = readSubscriptsAndEquations('delay')
    expect(vars).toEqual([
      v('d1', 'DELAY1(input,delay)', {
        delayTimeVarName: '__aux1',
        delayVarRefId: '__level1',
        refId: '_d1',
        references: ['__level1', '__aux1']
      }),
      v('d10', 'k*DELAY3(input,delay)', {
        delayTimeVarName: '__aux5',
        delayVarRefId: '__level4',
        refId: '_d10',
        references: ['_k', '__level4', '__level3', '__level2', '__aux5']
      }),
      v('d11[DimA]', 'k*DELAY3(input,delay a[DimA])', {
        delayTimeVarName: '__aux9',
        delayVarRefId: '__level7',
        refId: '_d11',
        references: ['_k', '__level7', '__level6', '__level5', '__aux9[_dima]'],
        subscripts: ['_dima']
      }),
      v('d12[SubA]', 'k*DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        delayTimeVarName: '__aux_d12_4',
        delayVarRefId: '__level_d12_3[_a2]',
        refId: '_d12[_a2]',
        references: ['_k', '__level_d12_3[_a2]', '__level_d12_2[_a2]', '__level_d12_1[_a2]', '__aux_d12_4[_a2]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('d12[SubA]', 'k*DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        delayTimeVarName: '__aux_d12_4',
        delayVarRefId: '__level_d12_3[_a3]',
        refId: '_d12[_a3]',
        references: ['_k', '__level_d12_3[_a3]', '__level_d12_2[_a3]', '__level_d12_1[_a3]', '__aux_d12_4[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('d2[DimA]', 'DELAY1I(input a[DimA],delay,init 1)', {
        delayTimeVarName: '__aux10',
        delayVarRefId: '__level8',
        refId: '_d2',
        references: ['__level8', '__aux10[_dima]'],
        subscripts: ['_dima']
      }),
      v('d3[DimA]', 'DELAY1I(input,delay a[DimA],init 1)', {
        delayTimeVarName: '__aux11',
        delayVarRefId: '__level9',
        refId: '_d3',
        references: ['__level9', '__aux11[_dima]'],
        subscripts: ['_dima']
      }),
      v('d4[DimA]', 'DELAY1I(input,delay,init a[DimA])', {
        delayTimeVarName: '__aux12',
        delayVarRefId: '__level10',
        refId: '_d4',
        references: ['__level10', '__aux12[_dima]'],
        subscripts: ['_dima']
      }),
      v('d5[DimA]', 'DELAY1I(input a[DimA],delay a[DimA],init a[DimA])', {
        delayTimeVarName: '__aux13',
        delayVarRefId: '__level11',
        refId: '_d5',
        references: ['__level11', '__aux13[_dima]'],
        subscripts: ['_dima']
      }),
      v('d6[SubA]', 'DELAY1I(input 2[SubA],delay 2,init 2[SubA])', {
        delayTimeVarName: '__aux14',
        delayVarRefId: '__level_d6_1[_a2]',
        refId: '_d6[_a2]',
        references: ['__level_d6_1[_a2]', '__aux14[_a2]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('d6[SubA]', 'DELAY1I(input 2[SubA],delay 2,init 2[SubA])', {
        delayTimeVarName: '__aux15',
        delayVarRefId: '__level_d6_1[_a3]',
        refId: '_d6[_a3]',
        references: ['__level_d6_1[_a3]', '__aux15[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('d7', 'DELAY3(input,delay)', {
        delayTimeVarName: '__aux19',
        delayVarRefId: '__level14',
        refId: '_d7',
        references: ['__level14', '__level13', '__level12', '__aux19']
      }),
      v('d8[DimA]', 'DELAY3(input,delay a[DimA])', {
        delayTimeVarName: '__aux23',
        delayVarRefId: '__level17',
        refId: '_d8',
        references: ['__level17', '__level16', '__level15', '__aux23[_dima]'],
        subscripts: ['_dima']
      }),
      v('d9[SubA]', 'DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        delayTimeVarName: '__aux_d9_4',
        delayVarRefId: '__level_d9_3[_a2]',
        refId: '_d9[_a2]',
        references: ['__level_d9_3[_a2]', '__level_d9_2[_a2]', '__level_d9_1[_a2]', '__aux_d9_4[_a2]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('d9[SubA]', 'DELAY3I(input 2[SubA],delay 2,init 2[SubA])', {
        delayTimeVarName: '__aux_d9_4',
        delayVarRefId: '__level_d9_3[_a3]',
        refId: '_d9[_a3]',
        references: ['__level_d9_3[_a3]', '__level_d9_2[_a3]', '__level_d9_1[_a3]', '__aux_d9_4[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('delay', '5', {
        refId: '_delay',
        varType: 'const'
      }),
      v('delay 2', '5', {
        refId: '_delay_2',
        varType: 'const'
      }),
      v('delay a[DimA]', '1,2,3', {
        refId: '_delay_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay a[DimA]', '1,2,3', {
        refId: '_delay_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay a[DimA]', '1,2,3', {
        refId: '_delay_a[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('FINAL TIME', '10', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('init 1', '0', {
        refId: '_init_1',
        varType: 'const'
      }),
      v('init 2[SubA]', '0', {
        refId: '_init_2[_a2]',
        separationDims: ['_suba'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('init 2[SubA]', '0', {
        refId: '_init_2[_a3]',
        separationDims: ['_suba'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init a[DimA]', '0', {
        refId: '_init_a',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('input', 'STEP(10,0)-STEP(10,4)', {
        refId: '_input',
        referencedFunctionNames: ['__step']
      }),
      v('input 2[SubA]', '20,30', {
        refId: '_input_2[_a2]',
        separationDims: ['_suba'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input 2[SubA]', '20,30', {
        refId: '_input_2[_a3]',
        separationDims: ['_suba'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('input a[DimA]', '10,20,30', {
        refId: '_input_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input a[DimA]', '10,20,30', {
        refId: '_input_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input a[DimA]', '10,20,30', {
        refId: '_input_a[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('k', '42', {
        refId: '_k',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      }),
      v('_level1', 'INTEG(input-d1,input*delay)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_d1'],
        varType: 'level'
      }),
      v('_aux1', 'delay', {
        includeInOutput: false,
        refId: '__aux1',
        references: ['_delay']
      }),
      v('_level4', 'INTEG(_aux3-_aux4,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level4',
        referencedFunctionNames: ['__integ'],
        references: ['__aux3', '__aux4'],
        varType: 'level'
      }),
      v('_level3', 'INTEG(_aux2-_aux3,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__aux2', '__aux3'],
        varType: 'level'
      }),
      v('_level2', 'INTEG(input-_aux2,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '__aux2'],
        varType: 'level'
      }),
      v('_aux2', '_level2/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux2',
        references: ['__level2', '_delay']
      }),
      v('_aux3', '_level3/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux3',
        references: ['__level3', '_delay']
      }),
      v('_aux4', '_level4/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux4',
        references: ['__level4', '_delay']
      }),
      v('_aux5', '((delay)/3)', {
        includeInOutput: false,
        refId: '__aux5',
        references: ['_delay']
      }),
      v('_level7[DimA]', 'INTEG(_aux7[DimA]-_aux8[DimA],input*((delay a[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level7',
        referencedFunctionNames: ['__integ'],
        references: ['__aux7', '__aux8'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level6[DimA]', 'INTEG(_aux6[DimA]-_aux7[DimA],input*((delay a[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level6',
        referencedFunctionNames: ['__integ'],
        references: ['__aux6', '__aux7'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level5[DimA]', 'INTEG(input-_aux6[DimA],input*((delay a[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level5',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '__aux6'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux6[DimA]', '_level5[DimA]/((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux6',
        references: ['__level5', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux7[DimA]', '_level6[DimA]/((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux7',
        references: ['__level6', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux8[DimA]', '_level7[DimA]/((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux8',
        references: ['__level7', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux9[DimA]', '((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux9',
        references: ['_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_level_d12_3[a2]', 'INTEG(_aux_d12_2[a2]-_aux_d12_3[a2],init 2[a2]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a2]', '_delay_2'],
        refId: '__level_d12_3[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d12_2', '__aux_d12_3'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_d12_2[a2]', 'INTEG(_aux_d12_1[a2]-_aux_d12_2[a2],init 2[a2]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a2]', '_delay_2'],
        refId: '__level_d12_2[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d12_1', '__aux_d12_2'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_d12_1[a2]', 'INTEG(input 2[a2]-_aux_d12_1[a2],init 2[a2]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a2]', '_delay_2'],
        refId: '__level_d12_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a2]', '__aux_d12_1'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_aux_d12_1[a2]', '_level_d12_1[a2]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_1',
        references: ['__level_d12_1[_a2]', '_delay_2'],
        subscripts: ['_a2']
      }),
      v('_aux_d12_2[a2]', '_level_d12_2[a2]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_2',
        references: ['__level_d12_2[_a2]', '_delay_2'],
        subscripts: ['_a2']
      }),
      v('_aux_d12_3[a2]', '_level_d12_3[a2]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_3',
        references: ['__level_d12_3[_a2]', '_delay_2'],
        subscripts: ['_a2']
      }),
      v('_aux_d12_4[a2]', '((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_4[_a2]',
        references: ['_delay_2'],
        subscripts: ['_a2']
      }),
      v('_level_d12_3[a3]', 'INTEG(_aux_d12_2[a3]-_aux_d12_3[a3],init 2[a3]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a3]', '_delay_2'],
        refId: '__level_d12_3[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d12_2', '__aux_d12_3'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_d12_2[a3]', 'INTEG(_aux_d12_1[a3]-_aux_d12_2[a3],init 2[a3]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a3]', '_delay_2'],
        refId: '__level_d12_2[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d12_1', '__aux_d12_2'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_d12_1[a3]', 'INTEG(input 2[a3]-_aux_d12_1[a3],init 2[a3]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a3]', '_delay_2'],
        refId: '__level_d12_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a3]', '__aux_d12_1'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_aux_d12_1[a3]', '_level_d12_1[a3]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_1',
        references: ['__level_d12_1[_a3]', '_delay_2'],
        subscripts: ['_a3']
      }),
      v('_aux_d12_2[a3]', '_level_d12_2[a3]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_2',
        references: ['__level_d12_2[_a3]', '_delay_2'],
        subscripts: ['_a3']
      }),
      v('_aux_d12_3[a3]', '_level_d12_3[a3]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_3',
        references: ['__level_d12_3[_a3]', '_delay_2'],
        subscripts: ['_a3']
      }),
      v('_aux_d12_4[a3]', '((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d12_4[_a3]',
        references: ['_delay_2'],
        subscripts: ['_a3']
      }),
      v('_level8[DimA]', 'INTEG(input a[DimA]-d2[DimA],init 1*delay)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_1', '_delay'],
        refId: '__level8',
        referencedFunctionNames: ['__integ'],
        references: ['_input_a[_a1]', '_input_a[_a2]', '_input_a[_a3]', '_d2'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux10[DimA]', 'delay', {
        includeInOutput: false,
        refId: '__aux10',
        references: ['_delay'],
        subscripts: ['_dima']
      }),
      v('_level9[DimA]', 'INTEG(input-d3[DimA],init 1*delay a[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_1', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level9',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_d3'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux11[DimA]', 'delay a[DimA]', {
        includeInOutput: false,
        refId: '__aux11',
        references: ['_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_level10[DimA]', 'INTEG(input-d4[DimA],init a[DimA]*delay)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_a', '_delay'],
        refId: '__level10',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_d4'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux12[DimA]', 'delay', {
        includeInOutput: false,
        refId: '__aux12',
        references: ['_delay'],
        subscripts: ['_dima']
      }),
      v('_level11[DimA]', 'INTEG(input a[DimA]-d5[DimA],init a[DimA]*delay a[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_a', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level11',
        referencedFunctionNames: ['__integ'],
        references: ['_input_a[_a1]', '_input_a[_a2]', '_input_a[_a3]', '_d5'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux13[DimA]', 'delay a[DimA]', {
        includeInOutput: false,
        refId: '__aux13',
        references: ['_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_level_d6_1[a2]', 'INTEG(input 2[a2]-d6[a2],init 2[a2]*delay 2)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a2]', '_delay_2'],
        refId: '__level_d6_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a2]', '_d6[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_aux14[a2]', 'delay 2', {
        includeInOutput: false,
        refId: '__aux14[_a2]',
        references: ['_delay_2'],
        subscripts: ['_a2']
      }),
      v('_level_d6_1[a3]', 'INTEG(input 2[a3]-d6[a3],init 2[a3]*delay 2)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a3]', '_delay_2'],
        refId: '__level_d6_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a3]', '_d6[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_aux15[a3]', 'delay 2', {
        includeInOutput: false,
        refId: '__aux15[_a3]',
        references: ['_delay_2'],
        subscripts: ['_a3']
      }),
      v('_level14', 'INTEG(_aux17-_aux18,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level14',
        referencedFunctionNames: ['__integ'],
        references: ['__aux17', '__aux18'],
        varType: 'level'
      }),
      v('_level13', 'INTEG(_aux16-_aux17,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level13',
        referencedFunctionNames: ['__integ'],
        references: ['__aux16', '__aux17'],
        varType: 'level'
      }),
      v('_level12', 'INTEG(input-_aux16,input*((delay)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay'],
        refId: '__level12',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '__aux16'],
        varType: 'level'
      }),
      v('_aux16', '_level12/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux16',
        references: ['__level12', '_delay']
      }),
      v('_aux17', '_level13/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux17',
        references: ['__level13', '_delay']
      }),
      v('_aux18', '_level14/((delay)/3)', {
        includeInOutput: false,
        refId: '__aux18',
        references: ['__level14', '_delay']
      }),
      v('_aux19', '((delay)/3)', {
        includeInOutput: false,
        refId: '__aux19',
        references: ['_delay']
      }),
      v('_level17[DimA]', 'INTEG(_aux21[DimA]-_aux22[DimA],input*((delay a[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level17',
        referencedFunctionNames: ['__integ'],
        references: ['__aux21', '__aux22'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level16[DimA]', 'INTEG(_aux20[DimA]-_aux21[DimA],input*((delay a[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level16',
        referencedFunctionNames: ['__integ'],
        references: ['__aux20', '__aux21'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level15[DimA]', 'INTEG(input-_aux20[DimA],input*((delay a[DimA])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        refId: '__level15',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '__aux20'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_aux20[DimA]', '_level15[DimA]/((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux20',
        references: ['__level15', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux21[DimA]', '_level16[DimA]/((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux21',
        references: ['__level16', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux22[DimA]', '_level17[DimA]/((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux22',
        references: ['__level17', '_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_aux23[DimA]', '((delay a[DimA])/3)', {
        includeInOutput: false,
        refId: '__aux23',
        references: ['_delay_a[_a1]', '_delay_a[_a2]', '_delay_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('_level_d9_3[a2]', 'INTEG(_aux_d9_2[a2]-_aux_d9_3[a2],init 2[a2]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a2]', '_delay_2'],
        refId: '__level_d9_3[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d9_2', '__aux_d9_3'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_d9_2[a2]', 'INTEG(_aux_d9_1[a2]-_aux_d9_2[a2],init 2[a2]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a2]', '_delay_2'],
        refId: '__level_d9_2[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d9_1', '__aux_d9_2'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_d9_1[a2]', 'INTEG(input 2[a2]-_aux_d9_1[a2],init 2[a2]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a2]', '_delay_2'],
        refId: '__level_d9_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a2]', '__aux_d9_1'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_aux_d9_1[a2]', '_level_d9_1[a2]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_1',
        references: ['__level_d9_1[_a2]', '_delay_2'],
        subscripts: ['_a2']
      }),
      v('_aux_d9_2[a2]', '_level_d9_2[a2]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_2',
        references: ['__level_d9_2[_a2]', '_delay_2'],
        subscripts: ['_a2']
      }),
      v('_aux_d9_3[a2]', '_level_d9_3[a2]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_3',
        references: ['__level_d9_3[_a2]', '_delay_2'],
        subscripts: ['_a2']
      }),
      v('_aux_d9_4[a2]', '((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_4[_a2]',
        references: ['_delay_2'],
        subscripts: ['_a2']
      }),
      v('_level_d9_3[a3]', 'INTEG(_aux_d9_2[a3]-_aux_d9_3[a3],init 2[a3]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a3]', '_delay_2'],
        refId: '__level_d9_3[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d9_2', '__aux_d9_3'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_d9_2[a3]', 'INTEG(_aux_d9_1[a3]-_aux_d9_2[a3],init 2[a3]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a3]', '_delay_2'],
        refId: '__level_d9_2[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_d9_1', '__aux_d9_2'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_d9_1[a3]', 'INTEG(input 2[a3]-_aux_d9_1[a3],init 2[a3]*((delay 2)/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_2[_a3]', '_delay_2'],
        refId: '__level_d9_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a3]', '__aux_d9_1'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_aux_d9_1[a3]', '_level_d9_1[a3]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_1',
        references: ['__level_d9_1[_a3]', '_delay_2'],
        subscripts: ['_a3']
      }),
      v('_aux_d9_2[a3]', '_level_d9_2[a3]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_2',
        references: ['__level_d9_2[_a3]', '_delay_2'],
        subscripts: ['_a3']
      }),
      v('_aux_d9_3[a3]', '_level_d9_3[a3]/((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_3',
        references: ['__level_d9_3[_a3]', '_delay_2'],
        subscripts: ['_a3']
      }),
      v('_aux_d9_4[a3]', '((delay 2)/3)', {
        includeInOutput: false,
        refId: '__aux_d9_4[_a3]',
        references: ['_delay_2'],
        subscripts: ['_a3']
      })
    ])
  })

  it('should work for Vensim "delayfixed" model', () => {
    const vars = readSubscriptsAndEquations('delayfixed')
    expect(vars).toEqual([
      v('a', 'DELAY FIXED(input[A1]+1,a delay time,0)', {
        fixedDelayVarName: '__fixed_delay1',
        hasInitValue: true,
        initReferences: ['_a_delay_time'],
        refId: '_a',
        referencedFunctionNames: ['__delay_fixed'],
        references: ['_input[_a1]'],
        varSubtype: 'fixedDelay',
        varType: 'level'
      }),
      v('a delay time', '0', {
        refId: '_a_delay_time',
        varType: 'const'
      }),
      v('b', 'DELAY FIXED(input[A1]+1,b delay time,0)', {
        fixedDelayVarName: '__fixed_delay2',
        hasInitValue: true,
        initReferences: ['_b_delay_time'],
        refId: '_b',
        referencedFunctionNames: ['__delay_fixed'],
        references: ['_input[_a1]'],
        varSubtype: 'fixedDelay',
        varType: 'level'
      }),
      v('b delay time', '1', {
        refId: '_b_delay_time',
        varType: 'const'
      }),
      v('FINAL TIME', '50', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('input[A1]', '10*TIME', {
        refId: '_input[_a1]',
        references: ['_time'],
        subscripts: ['_a1']
      }),
      v('input[A2]', '20*TIME', {
        refId: '_input[_a2]',
        references: ['_time'],
        subscripts: ['_a2']
      }),
      v('input[A3]', '30*TIME', {
        refId: '_input[_a3]',
        references: ['_time'],
        subscripts: ['_a3']
      }),
      v('output[DimA]', 'DELAY FIXED(input[DimA],1,0)', {
        fixedDelayVarName: '__fixed_delay3',
        hasInitValue: true,
        refId: '_output',
        referencedFunctionNames: ['__delay_fixed'],
        references: ['_input[_a1]', '_input[_a2]', '_input[_a3]'],
        subscripts: ['_dima'],
        varSubtype: 'fixedDelay',
        varType: 'level'
      }),
      v('receiving', 'DELAY FIXED(shipping,shipping time,shipping)', {
        fixedDelayVarName: '__fixed_delay4',
        hasInitValue: true,
        initReferences: ['_shipping_time', '_shipping'],
        refId: '_receiving',
        referencedFunctionNames: ['__delay_fixed'],
        references: ['_shipping'],
        varSubtype: 'fixedDelay',
        varType: 'level'
      }),
      v('reference shipping rate', '1', {
        refId: '_reference_shipping_rate',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('shipments in transit', 'INTEG(shipping-receiving,shipping*shipping time)', {
        hasInitValue: true,
        initReferences: ['_shipping', '_shipping_time'],
        refId: '_shipments_in_transit',
        referencedFunctionNames: ['__integ'],
        references: ['_shipping', '_receiving'],
        varType: 'level'
      }),
      v('shipping', 'STEP(reference shipping rate,10)-STEP(reference shipping rate,20)', {
        refId: '_shipping',
        referencedFunctionNames: ['__step'],
        references: ['_reference_shipping_rate']
      }),
      v('shipping time', '20', {
        refId: '_shipping_time',
        varType: 'const'
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "delayfixed2" model', () => {
    const vars = readSubscriptsAndEquations('delayfixed2')
    expect(vars).toEqual([
      v('FINAL TIME', '20', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '10', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('input1', '10*TIME+10', {
        refId: '_input1',
        references: ['_time']
      }),
      v('input2', '10*TIME+10', {
        refId: '_input2',
        references: ['_time']
      }),
      v('output1', 'DELAY FIXED(input1,1,0)', {
        fixedDelayVarName: '__fixed_delay1',
        hasInitValue: true,
        refId: '_output1',
        referencedFunctionNames: ['__delay_fixed'],
        references: ['_input1'],
        varSubtype: 'fixedDelay',
        varType: 'level'
      }),
      v('output2', 'DELAY FIXED(input2,5,0)', {
        fixedDelayVarName: '__fixed_delay2',
        hasInitValue: true,
        refId: '_output2',
        referencedFunctionNames: ['__delay_fixed'],
        references: ['_input2'],
        varSubtype: 'fixedDelay',
        varType: 'level'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "depreciate" model', () => {
    const vars = readSubscriptsAndEquations('depreciate')
    expect(vars).toEqual([
      v('Capacity Cost', '1e+06', {
        refId: '_capacity_cost',
        varType: 'const'
      }),
      v('Depreciated Amount', 'DEPRECIATE STRAIGHTLINE(str,dtime,1,0)', {
        depreciationVarName: '__depreciation1',
        hasInitValue: true,
        initReferences: ['_dtime'],
        refId: '_depreciated_amount',
        referencedFunctionNames: ['__depreciate_straightline'],
        references: ['_str'],
        varSubtype: 'depreciation'
      }),
      v('dtime', '20', {
        refId: '_dtime',
        varType: 'const'
      }),
      v('FINAL TIME', '2050', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '2020', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('New Capacity', 'IF THEN ELSE(Time=2022,1000,IF THEN ELSE(Time=2026,2500,0))', {
        refId: '_new_capacity',
        references: ['_time']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('str', 'Capacity Cost*New Capacity', {
        refId: '_str',
        references: ['_capacity_cost', '_new_capacity']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "directconst" model', () => {
    const vars = readSubscriptsAndEquations('directconst')
    expect(vars).toEqual([
      v('a', "GET DIRECT CONSTANTS('data/a.csv',',','B2')", {
        directConstArgs: { file: 'data/a.csv', tab: ',', startCell: 'B2' },
        refId: '_a',
        varType: 'const'
      }),
      v('b[DimB]', "GET DIRECT CONSTANTS('data/b.csv',',','b2*')", {
        directConstArgs: { file: 'data/b.csv', tab: ',', startCell: 'b2*' },
        refId: '_b',
        subscripts: ['_dimb'],
        varType: 'const'
      }),
      v('c[DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", {
        directConstArgs: { file: 'data/c.csv', tab: ',', startCell: 'B2' },
        refId: '_c',
        subscripts: ['_dimb', '_dimc'],
        varType: 'const'
      }),
      v('d[D1,DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", {
        directConstArgs: { file: 'data/c.csv', tab: ',', startCell: 'B2' },
        refId: '_d',
        subscripts: ['_dimb', '_dimc', '_d1'],
        varType: 'const'
      }),
      v('e[DimC,DimB]', "GET DIRECT CONSTANTS('data/c.csv',',','B2*')", {
        directConstArgs: { file: 'data/c.csv', tab: ',', startCell: 'B2*' },
        refId: '_e',
        subscripts: ['_dimb', '_dimc'],
        varType: 'const'
      }),
      v('f[DimC,DimA]:EXCEPT:[DimC,SubA]', '0', {
        refId: '_f[_a1,_dimc]',
        separationDims: ['_dima'],
        subscripts: ['_a1', '_dimc'],
        varType: 'const'
      }),
      v('f[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        directConstArgs: { file: 'data/f.csv', tab: ',', startCell: 'B2' },
        refId: '_f[_a2,_dimc]',
        separationDims: ['_suba'],
        subscripts: ['_a2', '_dimc'],
        varType: 'const'
      }),
      v('f[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        directConstArgs: { file: 'data/f.csv', tab: ',', startCell: 'B2' },
        refId: '_f[_a3,_dimc]',
        separationDims: ['_suba'],
        subscripts: ['_a3', '_dimc'],
        varType: 'const'
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g[From DimC,To DimC]', "GET DIRECT CONSTANTS('data/g.csv',',','B2')", {
        directConstArgs: { file: 'data/g.csv', tab: ',', startCell: 'B2' },
        refId: '_g',
        subscripts: ['_from_dimc', '_to_dimc'],
        varType: 'const'
      }),
      v('h', "GET DIRECT CONSTANTS('data/h.csv',',','B5')", {
        directConstArgs: { file: 'data/h.csv', tab: ',', startCell: 'B5' },
        refId: '_h',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "directdata" model', () => {
    const vars = readSubscriptsAndEquations('directdata')
    expect(vars).toEqual([
      v('a[DimA]', "GET DIRECT DATA('?data','A Data','A','B2')", {
        directDataArgs: { file: '?data', tab: 'A Data', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('a[DimA]', "GET DIRECT DATA('?data','A Data','A','B2')", {
        directDataArgs: { file: '?data', tab: 'A Data', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('b[DimA]', 'a[DimA]*10', {
        refId: '_b',
        references: ['_a[_a1]', '_a[_a2]'],
        subscripts: ['_dima']
      }),
      v('c', "GET DIRECT DATA('?data','C Data','a','b2')", {
        directDataArgs: { file: '?data', tab: 'C Data', timeRowOrCol: 'a', startCell: 'b2' },
        refId: '_c',
        varType: 'data'
      }),
      v('d', 'c*10', {
        refId: '_d',
        references: ['_c']
      }),
      v('e[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_e[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('e[DimA]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_e[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('f[DimA]', 'e[DimA]*10', {
        refId: '_f',
        references: ['_e[_a1]', '_e[_a2]'],
        subscripts: ['_dima']
      }),
      v('FINAL TIME', '2050', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g', "GET DIRECT DATA('g_data.csv',',','A','B2')", {
        directDataArgs: { file: 'g_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_g',
        varType: 'data'
      }),
      v('h', 'g*10', {
        refId: '_h',
        references: ['_g']
      }),
      v('i[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_i[_a1,_b1]',
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b1'],
        varType: 'data'
      }),
      v('i[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_i[_a1,_b2]',
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b2'],
        varType: 'data'
      }),
      v('INITIAL TIME', '1990', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('j[A1,DimB]', 'i[A1,DimB]', {
        refId: '_j',
        references: ['_i[_a1,_b1]', '_i[_a1,_b2]'],
        subscripts: ['_a1', '_dimb']
      }),
      v('k[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_k[_a1,_b1]',
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b1'],
        varType: 'data'
      }),
      v('k[A1,DimB]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_k[_a1,_b2]',
        separationDims: ['_dimb'],
        subscripts: ['_a1', '_b2'],
        varType: 'data'
      }),
      v('k[A2,DimB]', '0', {
        refId: '_k[_a2,_dimb]',
        subscripts: ['_a2', '_dimb'],
        varType: 'const'
      }),
      v('l[DimA,DimB]', 'k[DimA,DimB]', {
        refId: '_l',
        references: ['_k[_a1,_b1]', '_k[_a1,_b2]', '_k[_a2,_dimb]'],
        subscripts: ['_dima', '_dimb']
      }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", {
        directDataArgs: { file: 'm.csv', tab: ',', timeRowOrCol: '1', startCell: 'B2' },
        refId: '_m[_m1]',
        separationDims: ['_dimm'],
        subscripts: ['_m1'],
        varType: 'data'
      }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", {
        directDataArgs: { file: 'm.csv', tab: ',', timeRowOrCol: '1', startCell: 'B2' },
        refId: '_m[_m2]',
        separationDims: ['_dimm'],
        subscripts: ['_m2'],
        varType: 'data'
      }),
      v('m[DimM]', "GET DIRECT DATA('m.csv',',','1','B2')", {
        directDataArgs: { file: 'm.csv', tab: ',', timeRowOrCol: '1', startCell: 'B2' },
        refId: '_m[_m3]',
        separationDims: ['_dimm'],
        subscripts: ['_m3'],
        varType: 'data'
      }),
      v('n', 'm[M2]', {
        refId: '_n',
        references: ['_m[_m2]']
      }),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", {
        directDataArgs: { file: 'mt.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_o[_m1]',
        separationDims: ['_dimm'],
        subscripts: ['_m1'],
        varType: 'data'
      }),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", {
        directDataArgs: { file: 'mt.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_o[_m2]',
        separationDims: ['_dimm'],
        subscripts: ['_m2'],
        varType: 'data'
      }),
      v('o[DimM]', "GET DIRECT DATA('mt.csv',',','A','B2')", {
        directDataArgs: { file: 'mt.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_o[_m3]',
        separationDims: ['_dimm'],
        subscripts: ['_m3'],
        varType: 'data'
      }),
      v('p', 'o[M2]', {
        refId: '_p',
        references: ['_o[_m2]']
      }),
      v('q[SubM]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_q[_m2]',
        separationDims: ['_subm'],
        subscripts: ['_m2'],
        varType: 'data'
      }),
      v('q[SubM]', "GET DIRECT DATA('e_data.csv',',','A','B2')", {
        directDataArgs: { file: 'e_data.csv', tab: ',', timeRowOrCol: 'A', startCell: 'B2' },
        refId: '_q[_m3]',
        separationDims: ['_subm'],
        subscripts: ['_m3'],
        varType: 'data'
      }),
      v('r', 'q[M3]', {
        refId: '_r',
        references: ['_q[_m3]']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "directlookups" model', () => {
    const vars = readSubscriptsAndEquations('directlookups')
    expect(vars).toEqual([
      v('a[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','e2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'e2' },
        refId: '_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('a[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','e2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'e2' },
        refId: '_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('a[DimA]', "GET DIRECT LOOKUPS('lookup_data.csv',',','1','e2')", {
        directDataArgs: { file: 'lookup_data.csv', tab: ',', timeRowOrCol: '1', startCell: 'e2' },
        refId: '_a[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'data'
      }),
      v('b', 'a[A1](Time)', {
        refId: '_b',
        referencedLookupVarNames: ['_a'],
        references: ['_time']
      }),
      v('c', 'LOOKUP INVERT(a[A1],0.5)', {
        refId: '_c',
        referencedFunctionNames: ['__lookup_invert'],
        references: ['_a[_a1]']
      }),
      v('d', 'LOOKUP FORWARD(a[A1],2028.1)', {
        refId: '_d',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_a[_a1]']
      }),
      v('e', 'LOOKUP FORWARD(a[A1],2028)', {
        refId: '_e',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_a[_a1]']
      }),
      v('f', 'a[A1](2028.1)', {
        refId: '_f',
        referencedLookupVarNames: ['_a']
      }),
      v('FINAL TIME', '2050', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g', '', {
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        refId: '_g',
        varType: 'lookup'
      }),
      v('h', 'LOOKUP FORWARD(g,1)', {
        refId: '_h',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('INITIAL TIME', '2020', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "directsubs" model', () => {
    const vars = readSubscriptsAndEquations('directsubs')
    expect(vars).toEqual([
      v('a[DimA]', '10,20,30', {
        refId: '_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('a[DimA]', '10,20,30', {
        refId: '_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('a[DimA]', '10,20,30', {
        refId: '_a[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('b[DimB]', '1,2,3', {
        refId: '_b[_b1]',
        separationDims: ['_dimb'],
        subscripts: ['_b1'],
        varType: 'const'
      }),
      v('b[DimB]', '1,2,3', {
        refId: '_b[_b2]',
        separationDims: ['_dimb'],
        subscripts: ['_b2'],
        varType: 'const'
      }),
      v('b[DimB]', '1,2,3', {
        refId: '_b[_b3]',
        separationDims: ['_dimb'],
        subscripts: ['_b3'],
        varType: 'const'
      }),
      v('c[DimC]', 'a[DimA]+1', {
        refId: '_c',
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]'],
        subscripts: ['_dimc']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "elmcount" model', () => {
    const vars = readSubscriptsAndEquations('elmcount')
    expect(vars).toEqual([
      v('a', 'ELMCOUNT(DimA)', {
        refId: '_a',
        referencedFunctionNames: ['__elmcount']
      }),
      v('b[DimA]', '10*ELMCOUNT(DimA)+a', {
        refId: '_b',
        referencedFunctionNames: ['__elmcount'],
        references: ['_a'],
        subscripts: ['_dima']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "except" model', () => {
    const vars = readSubscriptsAndEquations('except')
    expect(vars).toEqual([
      v('a[DimA]', '1', {
        refId: '_a',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('b[SubA]', '2', {
        refId: '_b[_a2]',
        separationDims: ['_suba'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('b[SubA]', '2', {
        refId: '_b[_a3]',
        separationDims: ['_suba'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('c[DimA,DimC]', '3', {
        refId: '_c',
        subscripts: ['_dima', '_dimc'],
        varType: 'const'
      }),
      v('d[SubA,C1]', '4', {
        refId: '_d[_a2,_c1]',
        separationDims: ['_suba'],
        subscripts: ['_a2', '_c1'],
        varType: 'const'
      }),
      v('d[SubA,C1]', '4', {
        refId: '_d[_a3,_c1]',
        separationDims: ['_suba'],
        subscripts: ['_a3', '_c1'],
        varType: 'const'
      }),
      v('e[DimA,SubC]', '5', {
        refId: '_e[_dima,_c2]',
        separationDims: ['_subc'],
        subscripts: ['_dima', '_c2'],
        varType: 'const'
      }),
      v('e[DimA,SubC]', '5', {
        refId: '_e[_dima,_c3]',
        separationDims: ['_subc'],
        subscripts: ['_dima', '_c3'],
        varType: 'const'
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        refId: '_except3[_e1,_f1,_g1]',
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f1', '_g1'],
        varType: 'const'
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        refId: '_except3[_e1,_f1,_g2]',
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f1', '_g2'],
        varType: 'const'
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        refId: '_except3[_e1,_f2,_g1]',
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f2', '_g1'],
        varType: 'const'
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        refId: '_except3[_e1,_f2,_g2]',
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e1', '_f2', '_g2'],
        varType: 'const'
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        refId: '_except3[_e2,_f1,_g1]',
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e2', '_f1', '_g1'],
        varType: 'const'
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        refId: '_except3[_e2,_f1,_g2]',
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e2', '_f1', '_g2'],
        varType: 'const'
      }),
      v('except3[DimE,DimF,DimG]:EXCEPT:[E2,F2,G2]', '3', {
        refId: '_except3[_e2,_f2,_g1]',
        separationDims: ['_dime', '_dimf', '_dimg'],
        subscripts: ['_e2', '_f2', '_g1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f1,_g1,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g1', '_h1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f1,_g1,_h2]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g1', '_h2'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f1,_g2,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g2', '_h1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f1,_g2,_h2]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f1', '_g2', '_h2'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f2,_g1,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g1', '_h1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f2,_g1,_h2]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g1', '_h2'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f2,_g2,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g2', '_h1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e1,_f2,_g2,_h2]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e1', '_f2', '_g2', '_h2'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e2,_f1,_g1,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g1', '_h1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e2,_f1,_g1,_h2]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g1', '_h2'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e2,_f1,_g2,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g2', '_h1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e2,_f1,_g2,_h2]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f1', '_g2', '_h2'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e2,_f2,_g1,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f2', '_g1', '_h1'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e2,_f2,_g1,_h2]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f2', '_g1', '_h2'],
        varType: 'const'
      }),
      v('except4[DimE,DimF,DimG,DimH]:EXCEPT:[E2,F2,G2,H2]', '4', {
        refId: '_except4[_e2,_f2,_g2,_h1]',
        separationDims: ['_dime', '_dimf', '_dimg', '_dimh'],
        subscripts: ['_e2', '_f2', '_g2', '_h1'],
        varType: 'const'
      }),
      v('f[A1,C1]', '6', {
        refId: '_f',
        subscripts: ['_a1', '_c1'],
        varType: 'const'
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g[DimA]:EXCEPT:[A1]', '7', {
        refId: '_g[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('g[DimA]:EXCEPT:[A1]', '7', {
        refId: '_g[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('h[DimA]:EXCEPT:[SubA]', '8', {
        refId: '_h',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('input', '0', {
        refId: '_input',
        varType: 'const'
      }),
      v('j[DimD]', '10,20', {
        refId: '_j[_d1]',
        separationDims: ['_dimd'],
        subscripts: ['_d1'],
        varType: 'const'
      }),
      v('j[DimD]', '10,20', {
        refId: '_j[_d2]',
        separationDims: ['_dimd'],
        subscripts: ['_d2'],
        varType: 'const'
      }),
      v('k[DimA]:EXCEPT:[A1]', 'a[DimA]+j[DimD]', {
        refId: '_k[_a2]',
        references: ['_a', '_j[_d1]'],
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('k[DimA]:EXCEPT:[A1]', 'a[DimA]+j[DimD]', {
        refId: '_k[_a3]',
        references: ['_a', '_j[_d1]'],
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('o[SubA]:EXCEPT:[SubA2]', '9', {
        refId: '_o',
        separationDims: ['_suba'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a1,_c2]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c2'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a1,_c3]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c3'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a2,_c1]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c1'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a2,_c2]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c2'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a2,_c3]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c3'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a3,_c1]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c1'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a3,_c2]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c2'],
        varType: 'const'
      }),
      v('p[DimA,DimC]:EXCEPT:[A1,C1]', '10', {
        refId: '_p[_a3,_c3]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c3'],
        varType: 'const'
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        refId: '_q[_a1,_c1]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c1'],
        varType: 'const'
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        refId: '_q[_a1,_c2]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c2'],
        varType: 'const'
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        refId: '_q[_a1,_c3]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_c3'],
        varType: 'const'
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        refId: '_q[_a2,_c1]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c1'],
        varType: 'const'
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        refId: '_q[_a2,_c3]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_c3'],
        varType: 'const'
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        refId: '_q[_a3,_c1]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c1'],
        varType: 'const'
      }),
      v('q[DimA,DimC]:EXCEPT:[SubA,C2]', '11', {
        refId: '_q[_a3,_c3]',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a3', '_c3'],
        varType: 'const'
      }),
      v('r[DimA,DimC]:EXCEPT:[DimA,C1]', '12', {
        refId: '_r[_dima,_c2]',
        separationDims: ['_dimc'],
        subscripts: ['_dima', '_c2'],
        varType: 'const'
      }),
      v('r[DimA,DimC]:EXCEPT:[DimA,C1]', '12', {
        refId: '_r[_dima,_c3]',
        separationDims: ['_dimc'],
        subscripts: ['_dima', '_c3'],
        varType: 'const'
      }),
      v('s[A3]', '13', {
        refId: '_s[_a3]',
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('s[SubA]:EXCEPT:[A3]', '14', {
        refId: '_s[_a2]',
        separationDims: ['_suba'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('SAVEPER', '1', {
        refId: '_saveper',
        varType: 'const'
      }),
      v('t[SubA,SubC]', '15', {
        refId: '_t[_a2,_c2]',
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c2'],
        varType: 'const'
      }),
      v('t[SubA,SubC]', '15', {
        refId: '_t[_a2,_c3]',
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c3'],
        varType: 'const'
      }),
      v('t[SubA,SubC]', '15', {
        refId: '_t[_a3,_c2]',
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a3', '_c2'],
        varType: 'const'
      }),
      v('t[SubA,SubC]', '15', {
        refId: '_t[_a3,_c3]',
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a3', '_c3'],
        varType: 'const'
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('u[DimA]:EXCEPT:[A1]', 'a[DimA]', {
        refId: '_u[_a2]',
        references: ['_a'],
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      v('u[DimA]:EXCEPT:[A1]', 'a[DimA]', {
        refId: '_u[_a3]',
        references: ['_a'],
        separationDims: ['_dima'],
        subscripts: ['_a3']
      }),
      v('v[SubA]:EXCEPT:[A1]', 'a[SubA]', {
        refId: '_v[_a2]',
        references: ['_a'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('v[SubA]:EXCEPT:[A1]', 'a[SubA]', {
        refId: '_v[_a3]',
        references: ['_a'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('w[DimA]:EXCEPT:[SubA]', 'a[DimA]', {
        refId: '_w',
        references: ['_a'],
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('x[DimA]:EXCEPT:[SubA]', 'c[DimA,C1]', {
        refId: '_x',
        references: ['_c'],
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        refId: '_y[_a2,_c2]',
        references: ['_c'],
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c2']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        refId: '_y[_a2,_c3]',
        references: ['_c'],
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a2', '_c3']
      }),
      v('y[SubA,SubC]:EXCEPT:[A3,C3]', 'c[SubA,SubC]', {
        refId: '_y[_a3,_c2]',
        references: ['_c'],
        separationDims: ['_suba', '_subc'],
        subscripts: ['_a3', '_c2']
      }),
      v('z ref a', '25', {
        refId: '_z_ref_a',
        varType: 'const'
      }),
      v('z ref b', '5', {
        refId: '_z_ref_b',
        varType: 'const'
      }),
      v('z total', 'SUM(z[SubA!])', {
        refId: '_z_total',
        referencedFunctionNames: ['__sum'],
        references: ['_z[_a2]', '_z[_a3]']
      }),
      v('z[DimA]:EXCEPT:[SubA]', '10', {
        refId: '_z[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('z[SubA]', 'z ref a*z ref b', {
        refId: '_z[_a2]',
        references: ['_z_ref_a', '_z_ref_b'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('z[SubA]', 'z ref a*z ref b', {
        refId: '_z[_a3]',
        references: ['_z_ref_a', '_z_ref_b'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  // it('should work for Vensim "except2" model', () => {
  //   const vars = readSubscriptsAndEquations('except2')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  it('should work for Vensim "extdata" model', () => {
    const vars = readSubscriptsAndEquations('extdata')
    expect(vars).toEqual([
      v('A Totals', 'SUM(A Values[DimA!])', {
        refId: '_a_totals',
        referencedFunctionNames: ['__sum'],
        references: ['_a_values']
      }),
      v('A Values[DimA]', '', {
        refId: '_a_values',
        subscripts: ['_dima'],
        varType: 'data'
      }),
      v('B Selection[DimB]', 'IF THEN ELSE(DimB=Chosen B,1,0)', {
        refId: '_b_selection',
        references: ['_chosen_b'],
        subscripts: ['_dimb']
      }),
      v('B1 Totals', 'SUM(BC Values[B1,DimC!])', {
        refId: '_b1_totals',
        referencedFunctionNames: ['__sum'],
        references: ['_bc_values']
      }),
      v('BC Values[DimB,DimC]', '', {
        refId: '_bc_values',
        subscripts: ['_dimb', '_dimc'],
        varType: 'data'
      }),
      v('C Selection[DimC]', 'IF THEN ELSE(DimC=Chosen C,1,0)', {
        refId: '_c_selection',
        references: ['_chosen_c'],
        subscripts: ['_dimc']
      }),
      v('Chosen B', '3', {
        refId: '_chosen_b',
        varType: 'const'
      }),
      v('Chosen C', '1', {
        refId: '_chosen_c',
        varType: 'const'
      }),
      v('Chosen E', '2', {
        refId: '_chosen_e',
        varType: 'const'
      }),
      v('D Totals', 'SUM(D Values[DimD!])', {
        refId: '_d_totals',
        referencedFunctionNames: ['__sum'],
        references: ['_d_values']
      }),
      v('D Values[DimD]', '', {
        refId: '_d_values',
        subscripts: ['_dimd'],
        varType: 'data'
      }),
      v('E Selection[DimE]', 'IF THEN ELSE(DimE=Chosen E,1,0)', {
        refId: '_e_selection',
        references: ['_chosen_e'],
        subscripts: ['_dime']
      }),
      v('E Values[E1]', '', {
        refId: '_e_values[_e1]',
        subscripts: ['_e1'],
        varType: 'data'
      }),
      v('E Values[E2]', '', {
        refId: '_e_values[_e2]',
        subscripts: ['_e2'],
        varType: 'data'
      }),
      v('E1 Values', 'E Values[E1]', {
        refId: '_e1_values',
        references: ['_e_values[_e1]']
      }),
      v('E2 Values', 'E Values[E2]', {
        refId: '_e2_values',
        references: ['_e_values[_e2]']
      }),
      v('EBC Values[DimE,DimB,DimC]', '', {
        refId: '_ebc_values',
        subscripts: ['_dimb', '_dimc', '_dime'],
        varType: 'data'
      }),
      v('FINAL TIME', '10', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('Simple 1', '', {
        refId: '_simple_1',
        varType: 'data'
      }),
      v('Simple 2', '', {
        refId: '_simple_2',
        varType: 'data'
      }),
      v('Simple Totals', 'Simple 1+Simple 2', {
        refId: '_simple_totals',
        references: ['_simple_1', '_simple_2']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Total EBC', 'VECTOR SELECT(E Selection[DimE!],Total EBC for Selected BC[DimE!],0,VSSUM,VSERRATLEASTONE)', {
        refId: '_total_ebc',
        referencedFunctionNames: ['__vector_select'],
        references: ['_e_selection', '_total_ebc_for_selected_bc', '_vssum', '_vserratleastone']
      }),
      v(
        'Total EBC for Selected BC[DimE]',
        'VECTOR SELECT(B Selection[DimB!],Total EBC for Selected C[DimE,DimB!],0,VSSUM,VSERRATLEASTONE)',
        {
          refId: '_total_ebc_for_selected_bc',
          referencedFunctionNames: ['__vector_select'],
          references: ['_b_selection', '_total_ebc_for_selected_c', '_vssum', '_vserratleastone'],
          subscripts: ['_dime']
        }
      ),
      v(
        'Total EBC for Selected C[DimE,DimB]',
        'VECTOR SELECT(C Selection[DimC!],EBC Values[DimE,DimB,DimC!],0,VSSUM,VSERRATLEASTONE)',
        {
          refId: '_total_ebc_for_selected_c',
          referencedFunctionNames: ['__vector_select'],
          references: ['_c_selection', '_ebc_values', '_vssum', '_vserratleastone'],
          subscripts: ['_dimb', '_dime']
        }
      ),
      v('VSERRATLEASTONE', '1', {
        refId: '_vserratleastone',
        varType: 'const'
      }),
      v('VSSUM', '0', {
        refId: '_vssum',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  // it('should work for Vensim "flatten" model', () => {
  //   const vars = readSubscriptsAndEquations('flatten')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  it('should work for Vensim "gamma_ln" model', () => {
    const vars = readSubscriptsAndEquations('gamma_ln')
    expect(vars).toEqual([
      v('a', 'GAMMA LN(10)', {
        refId: '_a',
        referencedFunctionNames: ['__gamma_ln']
      }),
      v('b', 'GAMMA LN(0.5)', {
        refId: '_b',
        referencedFunctionNames: ['__gamma_ln']
      }),
      v('c', 'GAMMA LN(1)', {
        refId: '_c',
        referencedFunctionNames: ['__gamma_ln']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "getdata" model', () => {
    const vars = readSubscriptsAndEquations('getdata')
    expect(vars).toEqual([
      v('Backward', '-1', {
        refId: '_backward',
        varType: 'const'
      }),
      v('FINAL TIME', '10', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('Forward', '1', {
        refId: '_forward',
        varType: 'const'
      }),
      v('Half year', '0.5', {
        refId: '_half_year',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v(
        'Initial value at time plus one year backward[DimA]',
        'INITIAL(GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+One year),Backward))',
        {
          hasInitValue: true,
          initReferences: ['_values', '_final_time', '_time', '_one_year', '_backward'],
          refId: '_initial_value_at_time_plus_one_year_backward',
          referencedFunctionNames: ['__initial', '__get_data_between_times', '__min'],
          subscripts: ['_dima'],
          varType: 'initial'
        }
      ),
      v(
        'Initial value at time plus one year forward[DimA]',
        'INITIAL(GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+One year),Forward))',
        {
          hasInitValue: true,
          initReferences: ['_values', '_final_time', '_time', '_one_year', '_forward'],
          refId: '_initial_value_at_time_plus_one_year_forward',
          referencedFunctionNames: ['__initial', '__get_data_between_times', '__min'],
          subscripts: ['_dima'],
          varType: 'initial'
        }
      ),
      v(
        'Initial value at time plus one year interpolate[DimA]',
        'INITIAL(GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+One year),Interpolate))',
        {
          hasInitValue: true,
          initReferences: ['_values', '_final_time', '_time', '_one_year', '_interpolate'],
          refId: '_initial_value_at_time_plus_one_year_interpolate',
          referencedFunctionNames: ['__initial', '__get_data_between_times', '__min'],
          subscripts: ['_dima'],
          varType: 'initial'
        }
      ),
      v(
        'Initial value for A1 at time plus one year backward',
        'INITIAL(GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+One year),Backward))',
        {
          hasInitValue: true,
          initReferences: ['_values', '_final_time', '_time', '_one_year', '_backward'],
          refId: '_initial_value_for_a1_at_time_plus_one_year_backward',
          referencedFunctionNames: ['__initial', '__get_data_between_times', '__min'],
          varType: 'initial'
        }
      ),
      v(
        'Initial value for A1 at time plus one year forward',
        'INITIAL(GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+One year),Forward))',
        {
          hasInitValue: true,
          initReferences: ['_values', '_final_time', '_time', '_one_year', '_forward'],
          refId: '_initial_value_for_a1_at_time_plus_one_year_forward',
          referencedFunctionNames: ['__initial', '__get_data_between_times', '__min'],
          varType: 'initial'
        }
      ),
      v(
        'Initial value for A1 at time plus one year interpolate',
        'INITIAL(GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+One year),Interpolate))',
        {
          hasInitValue: true,
          initReferences: ['_values', '_final_time', '_time', '_one_year', '_interpolate'],
          refId: '_initial_value_for_a1_at_time_plus_one_year_interpolate',
          referencedFunctionNames: ['__initial', '__get_data_between_times', '__min'],
          varType: 'initial'
        }
      ),
      v('Interpolate', '0', {
        refId: '_interpolate',
        varType: 'const'
      }),
      v('One year', '1', {
        refId: '_one_year',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v(
        'Value at time plus half year backward[DimA]',
        'GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+Half year),Backward)',
        {
          refId: '_value_at_time_plus_half_year_backward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_half_year', '_backward'],
          subscripts: ['_dima']
        }
      ),
      v(
        'Value at time plus half year forward[DimA]',
        'GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+Half year),Forward)',
        {
          refId: '_value_at_time_plus_half_year_forward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_half_year', '_forward'],
          subscripts: ['_dima']
        }
      ),
      v(
        'Value at time plus one year backward[DimA]',
        'GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+One year),Backward)',
        {
          refId: '_value_at_time_plus_one_year_backward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_one_year', '_backward'],
          subscripts: ['_dima']
        }
      ),
      v(
        'Value at time plus one year forward[DimA]',
        'GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+One year),Forward)',
        {
          refId: '_value_at_time_plus_one_year_forward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_one_year', '_forward'],
          subscripts: ['_dima']
        }
      ),
      v(
        'Value at time plus one year interpolate[DimA]',
        'GET DATA BETWEEN TIMES(Values[DimA],MIN(FINAL TIME,Time+One year),Interpolate)',
        {
          refId: '_value_at_time_plus_one_year_interpolate',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_one_year', '_interpolate'],
          subscripts: ['_dima']
        }
      ),
      v(
        'Value for A1 at time minus half year backward',
        'GET DATA BETWEEN TIMES(Values[A1],MAX(INITIAL TIME,Time-Half year),Backward)',
        {
          refId: '_value_for_a1_at_time_minus_half_year_backward',
          referencedFunctionNames: ['__get_data_between_times', '__max'],
          references: ['_values', '_initial_time', '_time', '_half_year', '_backward']
        }
      ),
      v(
        'Value for A1 at time minus half year forward',
        'GET DATA BETWEEN TIMES(Values[A1],MAX(INITIAL TIME,Time-Half year),Forward)',
        {
          refId: '_value_for_a1_at_time_minus_half_year_forward',
          referencedFunctionNames: ['__get_data_between_times', '__max'],
          references: ['_values', '_initial_time', '_time', '_half_year', '_forward']
        }
      ),
      v(
        'Value for A1 at time minus one year backward',
        'GET DATA BETWEEN TIMES(Values[A1],MAX(INITIAL TIME,Time-One year),Backward)',
        {
          refId: '_value_for_a1_at_time_minus_one_year_backward',
          referencedFunctionNames: ['__get_data_between_times', '__max'],
          references: ['_values', '_initial_time', '_time', '_one_year', '_backward']
        }
      ),
      v(
        'Value for A1 at time minus one year forward',
        'GET DATA BETWEEN TIMES(Values[A1],MAX(INITIAL TIME,Time-One year),Forward)',
        {
          refId: '_value_for_a1_at_time_minus_one_year_forward',
          referencedFunctionNames: ['__get_data_between_times', '__max'],
          references: ['_values', '_initial_time', '_time', '_one_year', '_forward']
        }
      ),
      v(
        'Value for A1 at time minus one year interpolate',
        'GET DATA BETWEEN TIMES(Values[A1],MAX(INITIAL TIME,Time-One year),Interpolate)',
        {
          refId: '_value_for_a1_at_time_minus_one_year_interpolate',
          referencedFunctionNames: ['__get_data_between_times', '__max'],
          references: ['_values', '_initial_time', '_time', '_one_year', '_interpolate']
        }
      ),
      v(
        'Value for A1 at time plus half year backward',
        'GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+Half year),Backward)',
        {
          refId: '_value_for_a1_at_time_plus_half_year_backward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_half_year', '_backward']
        }
      ),
      v(
        'Value for A1 at time plus half year forward',
        'GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+Half year),Forward)',
        {
          refId: '_value_for_a1_at_time_plus_half_year_forward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_half_year', '_forward']
        }
      ),
      v(
        'Value for A1 at time plus one year backward',
        'GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+One year),Backward)',
        {
          refId: '_value_for_a1_at_time_plus_one_year_backward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_one_year', '_backward']
        }
      ),
      v(
        'Value for A1 at time plus one year forward',
        'GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+One year),Forward)',
        {
          refId: '_value_for_a1_at_time_plus_one_year_forward',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_one_year', '_forward']
        }
      ),
      v(
        'Value for A1 at time plus one year interpolate',
        'GET DATA BETWEEN TIMES(Values[A1],MIN(FINAL TIME,Time+One year),Interpolate)',
        {
          refId: '_value_for_a1_at_time_plus_one_year_interpolate',
          referencedFunctionNames: ['__get_data_between_times', '__min'],
          references: ['_values', '_final_time', '_time', '_one_year', '_interpolate']
        }
      ),
      v('Values[DimA]', '', {
        refId: '_values',
        subscripts: ['_dima'],
        varType: 'data'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "index" model', () => {
    const vars = readSubscriptsAndEquations('index')
    expect(vars).toEqual([
      v('a[DimA]', 'b[DimA]+10', {
        refId: '_a',
        references: ['_b[_a1]', '_b[_a2]', '_b[_a3]'],
        subscripts: ['_dima']
      }),
      v('b[A1]', '1', {
        refId: '_b[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('b[A2]', '2', {
        refId: '_b[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('b[A3]', '3', {
        refId: '_b[_a3]',
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('c[DimA]', 'b[A1]+1', {
        refId: '_c',
        references: ['_b[_a1]'],
        subscripts: ['_dima']
      }),
      v('d[DimA]', 'b[A1]+b[DimA]', {
        refId: '_d',
        references: ['_b[_a1]', '_b[_a2]', '_b[_a3]'],
        subscripts: ['_dima']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "initial" model', () => {
    const vars = readSubscriptsAndEquations('initial')
    expect(vars).toEqual([
      v('amplitude', '2', {
        refId: '_amplitude',
        varType: 'const'
      }),
      v('FINAL TIME', '100', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('INITIAL x', 'INITIAL(x)', {
        hasInitValue: true,
        initReferences: ['_x'],
        refId: '_initial_x',
        referencedFunctionNames: ['__initial'],
        varType: 'initial'
      }),
      v('Period', '20', {
        refId: '_period',
        varType: 'const'
      }),
      v('relative x', 'x/INITIAL x', {
        refId: '_relative_x',
        references: ['_x', '_initial_x']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('x', 'amplitude*COS(6.28*Time/Period)', {
        refId: '_x',
        referencedFunctionNames: ['__cos'],
        references: ['_amplitude', '_time', '_period']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "interleaved" model', () => {
    const vars = readSubscriptsAndEquations('interleaved')
    expect(vars).toEqual([
      v('a[A1]', 'x', {
        refId: '_a[_a1]',
        references: ['_x'],
        subscripts: ['_a1']
      }),
      v('a[A2]', 'y', {
        refId: '_a[_a2]',
        references: ['_y'],
        subscripts: ['_a2']
      }),
      v('b[DimA]', 'a[DimA]', {
        refId: '_b',
        references: ['_a[_a1]', '_a[_a2]'],
        subscripts: ['_dima']
      }),
      v('FINAL TIME', '100', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', 'a[A1]', {
        refId: '_y',
        references: ['_a[_a1]']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "longeqns" model', () => {
    const vars = readSubscriptsAndEquations('longeqns')
    expect(vars).toEqual([
      v('EqnA[DimX,DimY]', '1', {
        refId: '_eqna',
        subscripts: ['_dimx', '_dimy'],
        varType: 'const'
      }),
      v('EqnB[DimX,DimW]', '1', {
        refId: '_eqnb',
        subscripts: ['_dimw', '_dimx'],
        varType: 'const'
      }),
      v(
        'EqnC[DimX,DimY,DimZ]',
        'EqnA[DimX,DimY]*(-SUM(EqnB[DimX,DimW\n!])-(SUM(EqnB[DimX,DimW!])-SUM(EqnB[DimX,DimW\n!]))*EqnA[DimX,DimY])',
        {
          refId: '_eqnc',
          referencedFunctionNames: ['__sum'],
          references: ['_eqna', '_eqnb'],
          subscripts: ['_dimx', '_dimy', '_dimz']
        }
      ),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('Result', 'EqnC[X1,Y1,Z1]', {
        refId: '_result',
        references: ['_eqnc']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "lookup" model', () => {
    const vars = readSubscriptsAndEquations('lookup')
    expect(vars).toEqual([
      v('a', '', {
        points: [
          [0, 0],
          [0.7, 0],
          [0.8, 0.1],
          [0.9, 0.9],
          [1, -1],
          [2, 1]
        ],
        range: [
          [0, 0],
          [2, 1.2]
        ],
        refId: '_a',
        varType: 'lookup'
      }),
      v('b', 'a(i)', {
        refId: '_b',
        referencedFunctionNames: ['__a'],
        references: ['_i']
      }),
      v('c[A1]', '', {
        points: [
          [0, 10],
          [1, 20]
        ],
        refId: '_c[_a1]',
        subscripts: ['_a1'],
        varType: 'lookup'
      }),
      v('c[A2]', '', {
        points: [
          [0, 20],
          [1, 30]
        ],
        refId: '_c[_a2]',
        subscripts: ['_a2'],
        varType: 'lookup'
      }),
      v('c[A3]', '', {
        points: [
          [0, 30],
          [1, 40]
        ],
        refId: '_c[_a3]',
        subscripts: ['_a3'],
        varType: 'lookup'
      }),
      v('d', 'WITH LOOKUP(i,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))', {
        lookupArgVarName: '__lookup1',
        refId: '_d',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup1'],
        references: ['_i']
      }),
      v('e[DimA]', 'c[DimA](i)', {
        refId: '_e',
        referencedLookupVarNames: ['_c'],
        references: ['_i'],
        subscripts: ['_dima']
      }),
      v('f', 'c[A1](i)', {
        refId: '_f',
        referencedLookupVarNames: ['_c'],
        references: ['_i']
      }),
      v('FINAL TIME', '10', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g', '', {
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        refId: '_g',
        varType: 'lookup'
      }),
      v('g at 0 backward', 'LOOKUP BACKWARD(g,0)', {
        refId: '_g_at_0_backward',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_g']
      }),
      v('g at 0 forward', 'LOOKUP FORWARD(g,0)', {
        refId: '_g_at_0_forward',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('g at 0pt5 backward', 'LOOKUP BACKWARD(g,0.5)', {
        refId: '_g_at_0pt5_backward',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_g']
      }),
      v('g at 0pt5 forward', 'LOOKUP FORWARD(g,0.5)', {
        refId: '_g_at_0pt5_forward',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('g at 1pt0 backward', 'LOOKUP BACKWARD(g,1.0)', {
        refId: '_g_at_1pt0_backward',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_g']
      }),
      v('g at 1pt0 forward', 'LOOKUP FORWARD(g,1.0)', {
        refId: '_g_at_1pt0_forward',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('g at 1pt5 backward', 'LOOKUP BACKWARD(g,1.5)', {
        refId: '_g_at_1pt5_backward',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_g']
      }),
      v('g at 1pt5 forward', 'LOOKUP FORWARD(g,1.5)', {
        refId: '_g_at_1pt5_forward',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('g at 2pt0 backward', 'LOOKUP BACKWARD(g,2.0)', {
        refId: '_g_at_2pt0_backward',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_g']
      }),
      v('g at 2pt0 forward', 'LOOKUP FORWARD(g,2.0)', {
        refId: '_g_at_2pt0_forward',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('g at 2pt5 backward', 'LOOKUP BACKWARD(g,2.5)', {
        refId: '_g_at_2pt5_backward',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_g']
      }),
      v('g at 2pt5 forward', 'LOOKUP FORWARD(g,2.5)', {
        refId: '_g_at_2pt5_forward',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('g at minus 1 backward', 'LOOKUP BACKWARD(g,-1)', {
        refId: '_g_at_minus_1_backward',
        referencedFunctionNames: ['__lookup_backward'],
        references: ['_g']
      }),
      v('g at minus 1 forward', 'LOOKUP FORWARD(g,-1)', {
        refId: '_g_at_minus_1_forward',
        referencedFunctionNames: ['__lookup_forward'],
        references: ['_g']
      }),
      v('i', 'Time/10', {
        refId: '_i',
        references: ['_time']
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('withlookup at 0', 'WITH LOOKUP(0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup2',
        refId: '_withlookup_at_0',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup2']
      }),
      v('withlookup at 0pt5', 'WITH LOOKUP(0.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup3',
        refId: '_withlookup_at_0pt5',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup3']
      }),
      v('withlookup at 1pt0', 'WITH LOOKUP(1.0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup4',
        refId: '_withlookup_at_1pt0',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup4']
      }),
      v('withlookup at 1pt5', 'WITH LOOKUP(1.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup5',
        refId: '_withlookup_at_1pt5',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup5']
      }),
      v('withlookup at 2pt0', 'WITH LOOKUP(2.0,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup6',
        refId: '_withlookup_at_2pt0',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup6']
      }),
      v('withlookup at 2pt5', 'WITH LOOKUP(2.5,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup7',
        refId: '_withlookup_at_2pt5',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup7']
      }),
      v('withlookup at minus 1', 'WITH LOOKUP(-1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup8',
        refId: '_withlookup_at_minus_1',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup8']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      }),
      v('_lookup1', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [0.1, 0.01],
          [0.5, 0.7],
          [1, 1],
          [1.5, 1.2],
          [2, 1.3]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup1',
        varType: 'lookup'
      }),
      v('_lookup2', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup2',
        varType: 'lookup'
      }),
      v('_lookup3', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup3',
        varType: 'lookup'
      }),
      v('_lookup4', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup4',
        varType: 'lookup'
      }),
      v('_lookup5', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup5',
        varType: 'lookup'
      }),
      v('_lookup6', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup6',
        varType: 'lookup'
      }),
      v('_lookup7', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup7',
        varType: 'lookup'
      }),
      v('_lookup8', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup8',
        varType: 'lookup'
      })
    ])
  })

  it('should work for Vensim "mapping" model', () => {
    const vars = readSubscriptsAndEquations('mapping')
    expect(vars).toEqual([
      v('a[DimA]', 'b[DimB]*10', {
        refId: '_a',
        references: ['_b[_b1]', '_b[_b2]'],
        subscripts: ['_dima']
      }),
      v('b[DimB]', '1,2', {
        refId: '_b[_b1]',
        separationDims: ['_dimb'],
        subscripts: ['_b1'],
        varType: 'const'
      }),
      v('b[DimB]', '1,2', {
        refId: '_b[_b2]',
        separationDims: ['_dimb'],
        subscripts: ['_b2'],
        varType: 'const'
      }),
      v('c[DimC]', '1,2,3', {
        refId: '_c[_c1]',
        separationDims: ['_dimc'],
        subscripts: ['_c1'],
        varType: 'const'
      }),
      v('c[DimC]', '1,2,3', {
        refId: '_c[_c2]',
        separationDims: ['_dimc'],
        subscripts: ['_c2'],
        varType: 'const'
      }),
      v('c[DimC]', '1,2,3', {
        refId: '_c[_c3]',
        separationDims: ['_dimc'],
        subscripts: ['_c3'],
        varType: 'const'
      }),
      v('d[DimD]', 'c[DimC]*10', {
        refId: '_d',
        references: ['_c[_c1]', '_c[_c2]', '_c[_c3]'],
        subscripts: ['_dimd']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "multimap" model', () => {
    const vars = readSubscriptsAndEquations('multimap')
    expect(vars).toEqual([
      v('a[DimA]', '1,2,3', {
        refId: '_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('a[DimA]', '1,2,3', {
        refId: '_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('a[DimA]', '1,2,3', {
        refId: '_a[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('b[DimB]', 'a[DimA]', {
        refId: '_b',
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]'],
        subscripts: ['_dimb']
      }),
      v('c[DimC]', 'a[DimA]', {
        refId: '_c',
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]'],
        subscripts: ['_dimc']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', '1', {
        refId: '_saveper',
        varType: 'const'
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "npv" model', () => {
    const vars = readSubscriptsAndEquations('npv')
    expect(vars).toEqual([
      v('discount rate', 'interest rate/12/100', {
        refId: '_discount_rate',
        references: ['_interest_rate']
      }),
      v('factor', '1', {
        refId: '_factor',
        varType: 'const'
      }),
      v('FINAL TIME', '100', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('init val', '0', {
        refId: '_init_val',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('interest rate', '10', {
        refId: '_interest_rate',
        varType: 'const'
      }),
      v('investment', '100', {
        refId: '_investment',
        varType: 'const'
      }),
      v('NPV vs initial time', 'NPV(stream,discount rate,init val,factor)', {
        npvVarName: '__aux1',
        refId: '_npv_vs_initial_time',
        references: ['__level2', '__level1', '__aux1']
      }),
      v('revenue', '3', {
        refId: '_revenue',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('start time', '12', {
        refId: '_start_time',
        varType: 'const'
      }),
      v('stream', '-investment/TIME STEP*PULSE(start time,TIME STEP)+STEP(revenue,start time)', {
        refId: '_stream',
        referencedFunctionNames: ['__pulse', '__step'],
        references: ['_investment', '_time_step', '_start_time', '_revenue']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      }),
      v('_level1', 'INTEG((-_level1*discount rate)/(1+discount rate*TIME STEP),1)', {
        hasInitValue: true,
        includeInOutput: false,
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_discount_rate', '_time_step'],
        varType: 'level'
      }),
      v('_level2', 'INTEG(stream*_level1,init val)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init_val'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['_stream', '__level1'],
        varType: 'level'
      }),
      v('_aux1', '(_level2+stream*TIME STEP*_level1)*factor', {
        includeInOutput: false,
        refId: '__aux1',
        references: ['__level2', '_stream', '_time_step', '__level1', '_factor']
      })
    ])
  })

  it('should work for Vensim "power" model', () => {
    const vars = readSubscriptsAndEquations('power')
    expect(vars).toEqual([
      v('a', 'POWER(base,2)', {
        refId: '_a',
        referencedFunctionNames: ['__power'],
        references: ['_base']
      }),
      v('b', 'POWER(base,0.5)', {
        refId: '_b',
        referencedFunctionNames: ['__power'],
        references: ['_base']
      }),
      v('base', '2', {
        refId: '_base',
        varType: 'const'
      }),
      v('c', 'POWER(base,1.5)', {
        refId: '_c',
        referencedFunctionNames: ['__power'],
        references: ['_base']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  // it('should work for Vensim "preprocess" model', () => {
  //   const vars = readSubscriptsAndEquations('preprocess')
  //   logPrettyVars(vars)
  //   expect(vars).toEqual([])
  // })

  // TODO: This test depends on the dependency trimming code that isn't yet implemented
  // in the new reader, so skip it for now
  it.skip('should work for Vensim "prune" model', () => {
    const vars = readSubscriptsAndEquations('prune')
    expect(vars).toEqual([
      v('A Totals', 'SUM(A Values[DimA!])', {
        refId: '_a_totals',
        referencedFunctionNames: ['__sum'],
        references: ['_a_values']
      }),
      v('A Values[DimA]', '', {
        refId: '_a_values',
        subscripts: ['_dima'],
        varType: 'data'
      }),
      v('B1 Totals', 'SUM(BC Values[B1,DimC!])', {
        refId: '_b1_totals',
        referencedFunctionNames: ['__sum'],
        references: ['_bc_values']
      }),
      v('BC Values[DimB,DimC]', '', {
        refId: '_bc_values',
        subscripts: ['_dimb', '_dimc'],
        varType: 'data'
      }),
      v('Constant Partial 1', '1', {
        refId: '_constant_partial_1',
        varType: 'const'
      }),
      v('Constant Partial 2', '2', {
        refId: '_constant_partial_2',
        varType: 'const'
      }),
      v('D Totals', 'SUM(D Values[DimD!])', {
        refId: '_d_totals',
        referencedFunctionNames: ['__sum'],
        references: ['_d_values']
      }),
      v('D Values[DimD]', '', {
        refId: '_d_values',
        subscripts: ['_dimd'],
        varType: 'data'
      }),
      v('E Values[E1]', '', {
        refId: '_e_values[_e1]',
        subscripts: ['_e1'],
        varType: 'data'
      }),
      v('E Values[E2]', '', {
        refId: '_e_values[_e2]',
        subscripts: ['_e2'],
        varType: 'data'
      }),
      v('E1 Values', 'E Values[E1]', {
        refId: '_e1_values',
        references: ['_e_values[_e1]']
      }),
      v('E2 Values', 'E Values[E2]', {
        refId: '_e2_values',
        references: ['_e_values[_e2]']
      }),
      v('FINAL TIME', '10', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('Initial Partial[C1]', 'INITIAL(Constant Partial 1)', {
        hasInitValue: true,
        initReferences: ['_constant_partial_1'],
        refId: '_initial_partial[_c1]',
        referencedFunctionNames: ['__initial'],
        subscripts: ['_c1'],
        varType: 'initial'
      }),
      v('Initial Partial[C2]', 'INITIAL(Constant Partial 2)', {
        hasInitValue: true,
        initReferences: ['_constant_partial_2'],
        refId: '_initial_partial[_c2]',
        referencedFunctionNames: ['__initial'],
        subscripts: ['_c2'],
        varType: 'initial'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('Input 1', '10', {
        refId: '_input_1',
        varType: 'const'
      }),
      v('Input 1 and 2 Total', 'Input 1+Input 2', {
        refId: '_input_1_and_2_total',
        references: ['_input_1', '_input_2']
      }),
      v('Input 2', '20', {
        refId: '_input_2',
        varType: 'const'
      }),
      v('Input 2 and 3 Total', 'Input 2+Input 3', {
        refId: '_input_2_and_3_total',
        references: ['_input_2', '_input_3']
      }),
      v('Input 3', '30', {
        refId: '_input_3',
        varType: 'const'
      }),
      v('Look1', '', {
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        refId: '_look1',
        varType: 'lookup'
      }),
      v('Look1 Value at t1', 'Look1(1)', {
        refId: '_look1_value_at_t1',
        referencedFunctionNames: ['__look1']
      }),
      v('Look2', '', {
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        refId: '_look2',
        varType: 'lookup'
      }),
      v('Look2 Value at t1', 'Look2(1)', {
        refId: '_look2_value_at_t1',
        referencedFunctionNames: ['__look2']
      }),
      v('Partial[C2]', 'Initial Partial[C2]', {
        refId: '_partial',
        references: ['_initial_partial[_c2]'],
        subscripts: ['_c2']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('Simple 1', '', {
        refId: '_simple_1',
        varType: 'data'
      }),
      v('Simple 2', '', {
        refId: '_simple_2',
        varType: 'data'
      }),
      v('Simple Totals', 'Simple 1+Simple 2', {
        refId: '_simple_totals',
        references: ['_simple_1', '_simple_2']
      }),
      v('Test 1 F', '2', {
        refId: '_test_1_f',
        varType: 'const'
      }),
      v('Test 1 Result', 'IF THEN ELSE(Input 1=10,Test 1 T,Test 1 F)', {
        refId: '_test_1_result',
        references: ['_test_1_t']
      }),
      v('Test 1 T', '1', {
        refId: '_test_1_t',
        varType: 'const'
      }),
      v('Test 10 Cond', '1', {
        refId: '_test_10_cond',
        varType: 'const'
      }),
      v('Test 10 F', '2', {
        refId: '_test_10_f',
        varType: 'const'
      }),
      v('Test 10 Result', 'IF THEN ELSE(ABS(Test 10 Cond),Test 10 T,Test 10 F)', {
        refId: '_test_10_result',
        referencedFunctionNames: ['__abs'],
        references: ['_test_10_cond', '_test_10_t', '_test_10_f']
      }),
      v('Test 10 T', '1', {
        refId: '_test_10_t',
        varType: 'const'
      }),
      v('Test 11 Cond', '0', {
        refId: '_test_11_cond',
        varType: 'const'
      }),
      v('Test 11 F', '2', {
        refId: '_test_11_f',
        varType: 'const'
      }),
      v('Test 11 Result', 'IF THEN ELSE(Test 11 Cond:AND:ABS(Test 11 Cond),Test 11 T,Test 11 F)', {
        refId: '_test_11_result',
        references: ['_test_11_f']
      }),
      v('Test 11 T', '1', {
        refId: '_test_11_t',
        varType: 'const'
      }),
      v('Test 12 Cond', '1', {
        refId: '_test_12_cond',
        varType: 'const'
      }),
      v('Test 12 F', '2', {
        refId: '_test_12_f',
        varType: 'const'
      }),
      v('Test 12 Result', 'IF THEN ELSE(Test 12 Cond:OR:ABS(Test 12 Cond),Test 12 T,Test 12 F)', {
        refId: '_test_12_result',
        references: ['_test_12_t']
      }),
      v('Test 12 T', '1', {
        refId: '_test_12_t',
        varType: 'const'
      }),
      v('Test 13 Cond', '1', {
        refId: '_test_13_cond',
        varType: 'const'
      }),
      v('Test 13 F', '2', {
        refId: '_test_13_f',
        varType: 'const'
      }),
      v('Test 13 Result', 'IF THEN ELSE(Test 13 Cond,Test 13 T1+Test 13 T2,Test 13 F)*10.0', {
        refId: '_test_13_result',
        references: ['_test_13_t1', '_test_13_t2']
      }),
      v('Test 13 T1', '1', {
        refId: '_test_13_t1',
        varType: 'const'
      }),
      v('Test 13 T2', '7', {
        refId: '_test_13_t2',
        varType: 'const'
      }),
      v('Test 2 F', '2', {
        refId: '_test_2_f',
        varType: 'const'
      }),
      v('Test 2 Result', 'IF THEN ELSE(0,Test 2 T,Test 2 F)', {
        refId: '_test_2_result',
        references: ['_test_2_f']
      }),
      v('Test 2 T', '1', {
        refId: '_test_2_t',
        varType: 'const'
      }),
      v('Test 3 F', '2', {
        refId: '_test_3_f',
        varType: 'const'
      }),
      v('Test 3 Result', 'IF THEN ELSE(1,Test 3 T,Test 3 F)', {
        refId: '_test_3_result',
        references: ['_test_3_t']
      }),
      v('Test 3 T', '1', {
        refId: '_test_3_t',
        varType: 'const'
      }),
      v('Test 4 Cond', '0', {
        refId: '_test_4_cond',
        varType: 'const'
      }),
      v('Test 4 F', '2', {
        refId: '_test_4_f',
        varType: 'const'
      }),
      v('Test 4 Result', 'IF THEN ELSE(Test 4 Cond,Test 4 T,Test 4 F)', {
        refId: '_test_4_result',
        references: ['_test_4_f']
      }),
      v('Test 4 T', '1', {
        refId: '_test_4_t',
        varType: 'const'
      }),
      v('Test 5 Cond', '1', {
        refId: '_test_5_cond',
        varType: 'const'
      }),
      v('Test 5 F', '2', {
        refId: '_test_5_f',
        varType: 'const'
      }),
      v('Test 5 Result', 'IF THEN ELSE(Test 5 Cond,Test 5 T,Test 5 F)', {
        refId: '_test_5_result',
        references: ['_test_5_t']
      }),
      v('Test 5 T', '1', {
        refId: '_test_5_t',
        varType: 'const'
      }),
      v('Test 6 Cond', '0', {
        refId: '_test_6_cond',
        varType: 'const'
      }),
      v('Test 6 F', '2', {
        refId: '_test_6_f',
        varType: 'const'
      }),
      v('Test 6 Result', 'IF THEN ELSE(Test 6 Cond=1,Test 6 T,Test 6 F)', {
        refId: '_test_6_result',
        references: ['_test_6_f']
      }),
      v('Test 6 T', '1', {
        refId: '_test_6_t',
        varType: 'const'
      }),
      v('Test 7 Cond', '1', {
        refId: '_test_7_cond',
        varType: 'const'
      }),
      v('Test 7 F', '2', {
        refId: '_test_7_f',
        varType: 'const'
      }),
      v('Test 7 Result', 'IF THEN ELSE(Test 7 Cond=1,Test 7 T,Test 7 F)', {
        refId: '_test_7_result',
        references: ['_test_7_t']
      }),
      v('Test 7 T', '1', {
        refId: '_test_7_t',
        varType: 'const'
      }),
      v('Test 8 Cond', '0', {
        refId: '_test_8_cond',
        varType: 'const'
      }),
      v('Test 8 F', '2', {
        refId: '_test_8_f',
        varType: 'const'
      }),
      v('Test 8 Result', 'IF THEN ELSE(Test 8 Cond>0,Test 8 T,Test 8 F)', {
        refId: '_test_8_result',
        references: ['_test_8_f']
      }),
      v('Test 8 T', '1', {
        refId: '_test_8_t',
        varType: 'const'
      }),
      v('Test 9 Cond', '1', {
        refId: '_test_9_cond',
        varType: 'const'
      }),
      v('Test 9 F', '2', {
        refId: '_test_9_f',
        varType: 'const'
      }),
      v('Test 9 Result', 'IF THEN ELSE(Test 9 Cond>0,Test 9 T,Test 9 F)', {
        refId: '_test_9_result',
        references: ['_test_9_t']
      }),
      v('Test 9 T', '1', {
        refId: '_test_9_t',
        varType: 'const'
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('With Look1 at t1', 'WITH LOOKUP(1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup1',
        refId: '_with_look1_at_t1',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup1']
      }),
      v('With Look2 at t1', 'WITH LOOKUP(1,([(0,0)-(2,2)],(0,0),(1,1),(2,2)))', {
        lookupArgVarName: '__lookup2',
        refId: '_with_look2_at_t1',
        referencedFunctionNames: ['__with_lookup'],
        referencedLookupVarNames: ['__lookup2']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      }),
      v('_lookup1', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup1',
        varType: 'lookup'
      }),
      v('_lookup2', '', {
        includeInOutput: false,
        points: [
          [0, 0],
          [1, 1],
          [2, 2]
        ],
        range: [
          [0, 0],
          [2, 2]
        ],
        refId: '__lookup2',
        varType: 'lookup'
      })
    ])
  })

  it('should work for Vensim "pulsetrain" model', () => {
    const vars = readSubscriptsAndEquations('pulsetrain')
    expect(vars).toEqual([
      v('duration', '1', {
        refId: '_duration',
        varType: 'const'
      }),
      v('FINAL TIME', '40', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('first pulse time', '10', {
        refId: '_first_pulse_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('last pulse time', '30', {
        refId: '_last_pulse_time',
        varType: 'const'
      }),
      v('p', 'PULSE TRAIN(first pulse time,duration,repeat interval,last pulse time)', {
        refId: '_p',
        referencedFunctionNames: ['__pulse_train'],
        references: ['_first_pulse_time', '_duration', '_repeat_interval', '_last_pulse_time']
      }),
      v('repeat interval', '5', {
        refId: '_repeat_interval',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '0.25', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "quantum" model', () => {
    const vars = readSubscriptsAndEquations('quantum')
    expect(vars).toEqual([
      v('a', 'QUANTUM(1.9,1.0)', {
        refId: '_a',
        referencedFunctionNames: ['__quantum']
      }),
      v('b', 'QUANTUM(0.9,1.0)', {
        refId: '_b',
        referencedFunctionNames: ['__quantum']
      }),
      v('c', 'QUANTUM(-0.9,1.0)', {
        refId: '_c',
        referencedFunctionNames: ['__quantum']
      }),
      v('d', 'QUANTUM(-1.9,1.0)', {
        refId: '_d',
        referencedFunctionNames: ['__quantum']
      }),
      v('e', 'QUANTUM(112.3,10.0)', {
        refId: '_e',
        referencedFunctionNames: ['__quantum']
      }),
      v('f', 'QUANTUM(50,12)', {
        refId: '_f',
        referencedFunctionNames: ['__quantum']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g', 'QUANTUM(423,63)', {
        refId: '_g',
        referencedFunctionNames: ['__quantum']
      }),
      v('h', 'QUANTUM(10,10)', {
        refId: '_h',
        referencedFunctionNames: ['__quantum']
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "ref" model', () => {
    const vars = readSubscriptsAndEquations('ref')
    expect(vars).toEqual([
      v('ce[t1]', '1', {
        refId: '_ce[_t1]',
        subscripts: ['_t1'],
        varType: 'const'
      }),
      v('ce[tNext]', 'ecc[tPrev]+1', {
        refId: '_ce[_t2]',
        references: ['_ecc[_t1]'],
        separationDims: ['_tnext'],
        subscripts: ['_t2']
      }),
      v('ce[tNext]', 'ecc[tPrev]+1', {
        refId: '_ce[_t3]',
        references: ['_ecc[_t2]'],
        separationDims: ['_tnext'],
        subscripts: ['_t3']
      }),
      v('ecc[t1]', 'ce[t1]+1', {
        refId: '_ecc[_t1]',
        references: ['_ce[_t1]'],
        subscripts: ['_t1']
      }),
      v('ecc[tNext]', 'ce[tNext]+1', {
        refId: '_ecc[_t2]',
        references: ['_ce[_t2]'],
        separationDims: ['_tnext'],
        subscripts: ['_t2']
      }),
      v('ecc[tNext]', 'ce[tNext]+1', {
        refId: '_ecc[_t3]',
        references: ['_ce[_t3]'],
        separationDims: ['_tnext'],
        subscripts: ['_t3']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  // TODO: This test is sensitive to the dependency trimming code that we don't yet
  // have in the new reader, so we should skip in that case.  There's only one place
  // where the new reader differs from the old (in `IF THEN ELSE(switch=1,1,0)`
  // where the condition resolves to a constant).  We should add an option to disable
  // the pruning code so that we can test this more deterministically.
  it('should work for Vensim "sample" model', () => {
    const vars = readSubscriptsAndEquations('sample')
    expect(vars).toEqual([
      v('a', 'SAMPLE IF TRUE(MODULO(Time,5)=0,Time,0)', {
        hasInitValue: true,
        refId: '_a',
        referencedFunctionNames: ['__sample_if_true', '__modulo'],
        references: ['_time']
      }),
      v('b', 'a', {
        refId: '_b',
        references: ['_a']
      }),
      v('F', 'SAMPLE IF TRUE(Time=5,2,IF THEN ELSE(switch=1,1,0))', {
        hasInitValue: true,
        refId: '_f',
        referencedFunctionNames: ['__sample_if_true'],
        references: ['_time']
      }),
      v('FINAL TIME', '10', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('G', 'INTEG(rate,2*COS(scale))', {
        hasInitValue: true,
        initReferences: ['_scale'],
        refId: '_g',
        referencedFunctionNames: ['__integ', '__cos'],
        references: ['_rate'],
        varType: 'level'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('rate', 'STEP(10,10)', {
        refId: '_rate',
        referencedFunctionNames: ['__step']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('scale', '1', {
        refId: '_scale',
        varType: 'const'
      }),
      v('switch', '1', {
        refId: '_switch',
        varType: 'const'
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "sir" model', () => {
    const vars = readSubscriptsAndEquations('sir')
    expect(vars).toEqual([
      v('Average Duration of Illness d', '2', {
        refId: '_average_duration_of_illness_d',
        varType: 'const'
      }),
      v('Contact Rate c', 'Initial Contact Rate', {
        refId: '_contact_rate_c',
        references: ['_initial_contact_rate']
      }),
      v('FINAL TIME', '200', {
        refId: '_final_time',
        varType: 'const'
      }),
      v(
        'Infection Rate',
        'Contact Rate c*Infectivity i*Susceptible Population S*Infectious Population I/Total Population P',
        {
          refId: '_infection_rate',
          references: [
            '_contact_rate_c',
            '_infectivity_i',
            '_susceptible_population_s',
            '_infectious_population_i',
            '_total_population_p'
          ]
        }
      ),
      v('Infectious Population I', 'INTEG(Infection Rate-Recovery Rate,1)', {
        hasInitValue: true,
        refId: '_infectious_population_i',
        referencedFunctionNames: ['__integ'],
        references: ['_infection_rate', '_recovery_rate'],
        varType: 'level'
      }),
      v('Infectivity i', '0.25', {
        refId: '_infectivity_i',
        varType: 'const'
      }),
      v('Initial Contact Rate', '2.5', {
        refId: '_initial_contact_rate',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('Recovered Population R', 'INTEG(Recovery Rate,0)', {
        hasInitValue: true,
        refId: '_recovered_population_r',
        referencedFunctionNames: ['__integ'],
        references: ['_recovery_rate'],
        varType: 'level'
      }),
      v('Recovery Rate', 'Infectious Population I/Average Duration of Illness d', {
        refId: '_recovery_rate',
        references: ['_infectious_population_i', '_average_duration_of_illness_d']
      }),
      v(
        'Reproduction Rate',
        'Contact Rate c*Infectivity i*Average Duration of Illness d*Susceptible Population S/Total Population P',
        {
          refId: '_reproduction_rate',
          references: [
            '_contact_rate_c',
            '_infectivity_i',
            '_average_duration_of_illness_d',
            '_susceptible_population_s',
            '_total_population_p'
          ]
        }
      ),
      v('SAVEPER', '2', {
        refId: '_saveper',
        varType: 'const'
      }),
      v(
        'Susceptible Population S',
        'INTEG(-Infection Rate,Total Population P-Infectious Population I-Recovered Population R)',
        {
          hasInitValue: true,
          initReferences: ['_total_population_p', '_infectious_population_i', '_recovered_population_r'],
          refId: '_susceptible_population_s',
          referencedFunctionNames: ['__integ'],
          references: ['_infection_rate'],
          varType: 'level'
        }
      ),
      v('TIME STEP', '0.0625', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Total Population P', '10000', {
        refId: '_total_population_p',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "smooth" model', () => {
    const vars = readSubscriptsAndEquations('smooth')
    expect(vars).toEqual([
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('delay 2[SubA]', '2', {
        refId: '_delay_2[_a2]',
        separationDims: ['_suba'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay 2[SubA]', '2', {
        refId: '_delay_2[_a3]',
        separationDims: ['_suba'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay 3[DimA]', '2', {
        refId: '_delay_3',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('FINAL TIME', '40', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('input', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('input 2[SubA]', '3+PULSE(10,10)', {
        refId: '_input_2[_a2]',
        referencedFunctionNames: ['__pulse'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('input 2[SubA]', '3+PULSE(10,10)', {
        refId: '_input_2[_a3]',
        referencedFunctionNames: ['__pulse'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('input 2x3[SubA,DimB]', '3+PULSE(10,10)', {
        refId: '_input_2x3[_a2,_dimb]',
        referencedFunctionNames: ['__pulse'],
        separationDims: ['_suba'],
        subscripts: ['_a2', '_dimb']
      }),
      v('input 2x3[SubA,DimB]', '3+PULSE(10,10)', {
        refId: '_input_2x3[_a3,_dimb]',
        referencedFunctionNames: ['__pulse'],
        separationDims: ['_suba'],
        subscripts: ['_a3', '_dimb']
      }),
      v('input 3[DimA]', '3+PULSE(10,10)', {
        refId: '_input_3',
        referencedFunctionNames: ['__pulse'],
        subscripts: ['_dima']
      }),
      v('input 3x3[DimA,DimB]', '3+PULSE(10,10)', {
        refId: '_input_3x3',
        referencedFunctionNames: ['__pulse'],
        subscripts: ['_dima', '_dimb']
      }),
      v('s1', 'SMOOTH(input,delay)', {
        refId: '_s1',
        references: ['__level1'],
        smoothVarRefId: '__level1'
      }),
      v('s10[SubA,B1]', 'SMOOTH(input 2[SubA],delay)', {
        refId: '_s10[_a2,_b1]',
        references: ['__level_s10_1[_a2]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s10_1[_a2]',
        subscripts: ['_a2', '_b1']
      }),
      v('s10[SubA,B1]', 'SMOOTH(input 2[SubA],delay)', {
        refId: '_s10[_a3,_b1]',
        references: ['__level_s10_1[_a3]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s10_1[_a3]',
        subscripts: ['_a3', '_b1']
      }),
      v('s2[DimA]', 'SMOOTH(input,delay)', {
        refId: '_s2',
        references: ['__level2'],
        smoothVarRefId: '__level2',
        subscripts: ['_dima']
      }),
      v('s3[DimA]', 'SMOOTH(input 3[DimA],delay 3[DimA])', {
        refId: '_s3',
        references: ['__level3'],
        smoothVarRefId: '__level3',
        subscripts: ['_dima']
      }),
      v('s4[SubA]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        refId: '_s4[_a2]',
        references: ['__level_s4_1[_a2]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s4_1[_a2]',
        subscripts: ['_a2']
      }),
      v('s4[SubA]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        refId: '_s4[_a3]',
        references: ['__level_s4_1[_a3]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s4_1[_a3]',
        subscripts: ['_a3']
      }),
      v('s5[SubA]', 'SMOOTH3(input 2[SubA],delay 2[SubA])', {
        refId: '_s5[_a2]',
        references: ['__level_s5_1[_a2]', '__level_s5_2[_a2]', '__level_s5_3[_a2]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s5_3[_a2]',
        subscripts: ['_a2']
      }),
      v('s5[SubA]', 'SMOOTH3(input 2[SubA],delay 2[SubA])', {
        refId: '_s5[_a3]',
        references: ['__level_s5_1[_a3]', '__level_s5_2[_a3]', '__level_s5_3[_a3]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s5_3[_a3]',
        subscripts: ['_a3']
      }),
      v('s6[DimB]', 'SMOOTH(input 3[DimA],delay 3[DimA])', {
        refId: '_s6',
        references: ['__level4'],
        smoothVarRefId: '__level4',
        subscripts: ['_dimb']
      }),
      v('s7[SubB]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        refId: '_s7[_b2]',
        references: ['__level_s7_1[_a2]'],
        separationDims: ['_subb'],
        smoothVarRefId: '__level_s7_1[_a2]',
        subscripts: ['_b2']
      }),
      v('s7[SubB]', 'SMOOTH(input 2[SubA],delay 2[SubA])', {
        refId: '_s7[_b3]',
        references: ['__level_s7_1[_a3]'],
        separationDims: ['_subb'],
        smoothVarRefId: '__level_s7_1[_a3]',
        subscripts: ['_b3']
      }),
      v('s8[DimA,DimB]', 'SMOOTH(input 3x3[DimA,DimB],delay)', {
        refId: '_s8',
        references: ['__level5'],
        smoothVarRefId: '__level5',
        subscripts: ['_dima', '_dimb']
      }),
      v('s9[SubA,DimB]', 'SMOOTH(input 2x3[SubA,DimB],delay)', {
        refId: '_s9[_a2,_dimb]',
        references: ['__level_s9_1[_a2,_dimb]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s9_1[_a2,_dimb]',
        subscripts: ['_a2', '_dimb']
      }),
      v('s9[SubA,DimB]', 'SMOOTH(input 2x3[SubA,DimB],delay)', {
        refId: '_s9[_a3,_dimb]',
        references: ['__level_s9_1[_a3,_dimb]'],
        separationDims: ['_suba'],
        smoothVarRefId: '__level_s9_1[_a3,_dimb]',
        subscripts: ['_a3', '_dimb']
      }),
      v('SAVEPER', '1', {
        refId: '_saveper',
        varType: 'const'
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      }),
      v('_level1', 'INTEG((input-_level1)/delay,input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        varType: 'level'
      }),
      v('_level_s10_1[a2]', 'INTEG((input 2[a2]-_level_s10_1[a2])/delay,input 2[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a2]'],
        refId: '__level_s10_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a2]', '_delay'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_s10_1[a3]', 'INTEG((input 2[a3]-_level_s10_1[a3])/delay,input 2[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a3]'],
        refId: '__level_s10_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a3]', '_delay'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level2', 'INTEG((input-_level2)/delay,input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        varType: 'level'
      }),
      v('_level3[DimA]', 'INTEG((input 3[DimA]-_level3[DimA])/delay 3[DimA],input 3[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_3'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['_input_3', '_delay_3'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level_s4_1[a2]', 'INTEG((input 2[a2]-_level_s4_1[a2])/delay 2[a2],input 2[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a2]'],
        refId: '__level_s4_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a2]', '_delay_2[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_s4_1[a3]', 'INTEG((input 2[a3]-_level_s4_1[a3])/delay 2[a3],input 2[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a3]'],
        refId: '__level_s4_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a3]', '_delay_2[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_s5_1[a2]', 'INTEG((input 2[a2]-_level_s5_1[a2])/(delay 2[a2]/3),input 2[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a2]'],
        refId: '__level_s5_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a2]', '_delay_2[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_s5_2[a2]', 'INTEG((_level_s5_1[a2]-_level_s5_2[a2])/(delay 2[a2]/3),input 2[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a2]'],
        refId: '__level_s5_2[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_s5_1[_a2]', '_delay_2[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_s5_3[a2]', 'INTEG((_level_s5_2[a2]-_level_s5_3[a2])/(delay 2[a2]/3),input 2[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a2]'],
        refId: '__level_s5_3[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_s5_2[_a2]', '_delay_2[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_s5_1[a3]', 'INTEG((input 2[a3]-_level_s5_1[a3])/(delay 2[a3]/3),input 2[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a3]'],
        refId: '__level_s5_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a3]', '_delay_2[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_s5_2[a3]', 'INTEG((_level_s5_1[a3]-_level_s5_2[a3])/(delay 2[a3]/3),input 2[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a3]'],
        refId: '__level_s5_2[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_s5_1[_a3]', '_delay_2[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_s5_3[a3]', 'INTEG((_level_s5_2[a3]-_level_s5_3[a3])/(delay 2[a3]/3),input 2[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a3]'],
        refId: '__level_s5_3[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__level_s5_2[_a3]', '_delay_2[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level4[DimA]', 'INTEG((input 3[DimA]-_level4[DimA])/delay 3[DimA],input 3[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_3'],
        refId: '__level4',
        referencedFunctionNames: ['__integ'],
        references: ['_input_3', '_delay_3'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level_s7_1[a2]', 'INTEG((input 2[a2]-_level_s7_1[a2])/delay 2[a2],input 2[a2])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a2]'],
        refId: '__level_s7_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a2]', '_delay_2[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_s7_1[a3]', 'INTEG((input 2[a3]-_level_s7_1[a3])/delay 2[a3],input 2[a3])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2[_a3]'],
        refId: '__level_s7_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2[_a3]', '_delay_2[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level5[DimA,DimB]', 'INTEG((input 3x3[DimA,DimB]-_level5[DimA,DimB])/delay,input 3x3[DimA,DimB])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_3x3'],
        refId: '__level5',
        referencedFunctionNames: ['__integ'],
        references: ['_input_3x3', '_delay'],
        subscripts: ['_dima', '_dimb'],
        varType: 'level'
      }),
      v('_level_s9_1[a2,DimB]', 'INTEG((input 2x3[a2,DimB]-_level_s9_1[a2,DimB])/delay,input 2x3[a2,DimB])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2x3[_a2,_dimb]'],
        refId: '__level_s9_1[_a2,_dimb]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2x3[_a2,_dimb]', '_delay'],
        subscripts: ['_a2', '_dimb'],
        varType: 'level'
      }),
      v('_level_s9_1[a3,DimB]', 'INTEG((input 2x3[a3,DimB]-_level_s9_1[a3,DimB])/delay,input 2x3[a3,DimB])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input_2x3[_a3,_dimb]'],
        refId: '__level_s9_1[_a3,_dimb]',
        referencedFunctionNames: ['__integ'],
        references: ['_input_2x3[_a3,_dimb]', '_delay'],
        subscripts: ['_a3', '_dimb'],
        varType: 'level'
      })
    ])
  })

  it('should work for Vensim "smooth3" model', () => {
    const vars = readSubscriptsAndEquations('smooth3')
    expect(vars).toEqual([
      v('a', '1', {
        refId: '_a',
        varType: 'const'
      }),
      v('apt', '1', {
        refId: '_apt',
        varType: 'const'
      }),
      v('b', '2', {
        refId: '_b',
        varType: 'const'
      }),
      v('ca[A1]', '1000+RAMP(100,1,10)', {
        refId: '_ca[_a1]',
        referencedFunctionNames: ['__ramp'],
        subscripts: ['_a1']
      }),
      v('ca[A2]', '1000+RAMP(300,1,10)', {
        refId: '_ca[_a2]',
        referencedFunctionNames: ['__ramp'],
        subscripts: ['_a2']
      }),
      v('ca[A3]', '1000+RAMP(600,1,10)', {
        refId: '_ca[_a3]',
        referencedFunctionNames: ['__ramp'],
        subscripts: ['_a3']
      }),
      v('cs[DimA]', 'MIN(SMOOTH3(sr,apt),ca[DimA]/TIME STEP)', {
        refId: '_cs',
        referencedFunctionNames: ['__min'],
        references: ['__level1', '__level2', '__level3', '_ca[_a1]', '_ca[_a2]', '_ca[_a3]', '_time_step'],
        smoothVarRefId: '__level3',
        subscripts: ['_dima']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('FINAL TIME', '40', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('input', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('S1', 'scale*SMOOTH3(input,delay)', {
        refId: '_s1',
        references: ['_scale', '__level4', '__level5', '__level6'],
        smoothVarRefId: '__level6'
      }),
      v('S2', 'scale*S2 Level 3', {
        refId: '_s2',
        references: ['_scale', '_s2_level_3']
      }),
      v('S2 Delay', 'delay/3', {
        refId: '_s2_delay',
        references: ['_delay']
      }),
      v('S2 Level 1', 'INTEG((input-S2 Level 1)/S2 Delay,input)', {
        hasInitValue: true,
        initReferences: ['_input'],
        refId: '_s2_level_1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_s2_delay'],
        varType: 'level'
      }),
      v('S2 Level 2', 'INTEG((S2 Level 1-S2 Level 2)/S2 Delay,input)', {
        hasInitValue: true,
        initReferences: ['_input'],
        refId: '_s2_level_2',
        referencedFunctionNames: ['__integ'],
        references: ['_s2_level_1', '_s2_delay'],
        varType: 'level'
      }),
      v('S2 Level 3', 'INTEG((S2 Level 2-S2 Level 3)/S2 Delay,input)', {
        hasInitValue: true,
        initReferences: ['_input'],
        refId: '_s2_level_3',
        referencedFunctionNames: ['__integ'],
        references: ['_s2_level_2', '_s2_delay'],
        varType: 'level'
      }),
      v('S3', 'SMOOTH3(s3 input,MAX(a,b))', {
        refId: '_s3',
        references: ['__level7', '__level8', '__level9'],
        smoothVarRefId: '__level9'
      }),
      v('s3 input', '3+PULSE(10,10)', {
        refId: '_s3_input',
        referencedFunctionNames: ['__pulse']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('scale', '6', {
        refId: '_scale',
        varType: 'const'
      }),
      v('sr', 'COS(Time/5)', {
        refId: '_sr',
        referencedFunctionNames: ['__cos'],
        references: ['_time']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      }),
      v('_level1', 'INTEG((sr-_level1)/(apt/3),sr)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_sr'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_sr', '_apt'],
        varType: 'level'
      }),
      v('_level2', 'INTEG((_level1-_level2)/(apt/3),sr)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_sr'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_apt'],
        varType: 'level'
      }),
      v('_level3', 'INTEG((_level2-_level3)/(apt/3),sr)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_sr'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_apt'],
        varType: 'level'
      }),
      v('_level4', 'INTEG((input-_level4)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level4',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        varType: 'level'
      }),
      v('_level5', 'INTEG((_level4-_level5)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level5',
        referencedFunctionNames: ['__integ'],
        references: ['__level4', '_delay'],
        varType: 'level'
      }),
      v('_level6', 'INTEG((_level5-_level6)/(delay/3),input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level6',
        referencedFunctionNames: ['__integ'],
        references: ['__level5', '_delay'],
        varType: 'level'
      }),
      v('_level7', 'INTEG((s3 input-_level7)/(MAX(a,b)/3),s3 input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_s3_input'],
        refId: '__level7',
        referencedFunctionNames: ['__integ', '__max'],
        references: ['_s3_input', '_a', '_b'],
        varType: 'level'
      }),
      v('_level8', 'INTEG((_level7-_level8)/(MAX(a,b)/3),s3 input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_s3_input'],
        refId: '__level8',
        referencedFunctionNames: ['__integ', '__max'],
        references: ['__level7', '_a', '_b'],
        varType: 'level'
      }),
      v('_level9', 'INTEG((_level8-_level9)/(MAX(a,b)/3),s3 input)', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_s3_input'],
        refId: '__level9',
        referencedFunctionNames: ['__integ', '__max'],
        references: ['__level8', '_a', '_b'],
        varType: 'level'
      })
    ])
  })

  it('should work for Vensim "specialchars" model', () => {
    const vars = readSubscriptsAndEquations('specialchars')
    expect(vars).toEqual([
      v('"100% true"', '4', {
        refId: '__100__true_',
        varType: 'const'
      }),
      v('DOLLAR SIGN$', '1', {
        refId: '_dollar_sign_',
        varType: 'const'
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('"M&Ms"', '3', {
        refId: '__m_ms_',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v("time's up", '2', {
        refId: '_time_s_up',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "subalias" model', () => {
    const vars = readSubscriptsAndEquations('subalias')
    expect(vars).toEqual([
      v('e[DimE]', '10,20,30', {
        refId: '_e[_f1]',
        separationDims: ['_dime'],
        subscripts: ['_f1'],
        varType: 'const'
      }),
      v('e[DimE]', '10,20,30', {
        refId: '_e[_f2]',
        separationDims: ['_dime'],
        subscripts: ['_f2'],
        varType: 'const'
      }),
      v('e[DimE]', '10,20,30', {
        refId: '_e[_f3]',
        separationDims: ['_dime'],
        subscripts: ['_f3'],
        varType: 'const'
      }),
      v('f[DimF]', '1,2,3', {
        refId: '_f[_f1]',
        separationDims: ['_dimf'],
        subscripts: ['_f1'],
        varType: 'const'
      }),
      v('f[DimF]', '1,2,3', {
        refId: '_f[_f2]',
        separationDims: ['_dimf'],
        subscripts: ['_f2'],
        varType: 'const'
      }),
      v('f[DimF]', '1,2,3', {
        refId: '_f[_f3]',
        separationDims: ['_dimf'],
        subscripts: ['_f3'],
        varType: 'const'
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "subscript" model', () => {
    const vars = readSubscriptsAndEquations('subscript')
    expect(vars).toEqual([
      v('a[DimA]', 'b[DimB]', {
        refId: '_a',
        references: ['_b[_b1]', '_b[_b2]', '_b[_b3]'],
        subscripts: ['_dima']
      }),
      v('b[DimB]', '1,2,3', {
        refId: '_b[_b1]',
        separationDims: ['_dimb'],
        subscripts: ['_b1'],
        varType: 'const'
      }),
      v('b[DimB]', '1,2,3', {
        refId: '_b[_b2]',
        separationDims: ['_dimb'],
        subscripts: ['_b2'],
        varType: 'const'
      }),
      v('b[DimB]', '1,2,3', {
        refId: '_b[_b3]',
        separationDims: ['_dimb'],
        subscripts: ['_b3'],
        varType: 'const'
      }),
      v('c[DimB]', 'b[DimB]', {
        refId: '_c',
        references: ['_b[_b1]', '_b[_b2]', '_b[_b3]'],
        subscripts: ['_dimb']
      }),
      v('d[A1]', 'b[B1]', {
        refId: '_d',
        references: ['_b[_b1]'],
        subscripts: ['_a1']
      }),
      v('e[B1]', 'b[B1]', {
        refId: '_e',
        references: ['_b[_b1]'],
        subscripts: ['_b1']
      }),
      v('f[DimA,B1]', '1', {
        refId: '_f[_dima,_b1]',
        subscripts: ['_dima', '_b1'],
        varType: 'const'
      }),
      v('f[DimA,B2]', '2', {
        refId: '_f[_dima,_b2]',
        subscripts: ['_dima', '_b2'],
        varType: 'const'
      }),
      v('f[DimA,B3]', '3', {
        refId: '_f[_dima,_b3]',
        subscripts: ['_dima', '_b3'],
        varType: 'const'
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g[B1,DimA]', 'f[DimA,B1]', {
        refId: '_g[_dima,_b1]',
        references: ['_f[_dima,_b1]'],
        subscripts: ['_dima', '_b1']
      }),
      v('g[B2,DimA]', 'f[DimA,B2]', {
        refId: '_g[_dima,_b2]',
        references: ['_f[_dima,_b2]'],
        subscripts: ['_dima', '_b2']
      }),
      v('g[B3,DimA]', 'f[DimA,B3]', {
        refId: '_g[_dima,_b3]',
        references: ['_f[_dima,_b3]'],
        subscripts: ['_dima', '_b3']
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('o[DimA,DimB]', 'f[DimA,DimB]', {
        refId: '_o',
        references: ['_f[_dima,_b1]', '_f[_dima,_b2]', '_f[_dima,_b3]'],
        subscripts: ['_dima', '_dimb']
      }),
      v('p[DimB,DimA]', 'f[DimA,DimB]', {
        refId: '_p',
        references: ['_f[_dima,_b1]', '_f[_dima,_b2]', '_f[_dima,_b3]'],
        subscripts: ['_dima', '_dimb']
      }),
      v('r[DimA]', 'IF THEN ELSE(DimA=Selected A,1,0)', {
        refId: '_r',
        references: ['_selected_a'],
        subscripts: ['_dima']
      }),
      v('s[DimA]', 'DimB', {
        refId: '_s',
        subscripts: ['_dima']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('Selected A', '2', {
        refId: '_selected_a',
        varType: 'const'
      }),
      v('t[DimC]', '1', {
        refId: '_t',
        subscripts: ['_dimc'],
        varType: 'const'
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('u[C1]', '1', {
        refId: '_u[_c1]',
        subscripts: ['_c1'],
        varType: 'const'
      }),
      v('u[C2]', '2', {
        refId: '_u[_c2]',
        subscripts: ['_c2'],
        varType: 'const'
      }),
      v('u[C3]', '3', {
        refId: '_u[_c3]',
        subscripts: ['_c3'],
        varType: 'const'
      }),
      v('u[C4]', '4', {
        refId: '_u[_c4]',
        subscripts: ['_c4'],
        varType: 'const'
      }),
      v('u[C5]', '5', {
        refId: '_u[_c5]',
        subscripts: ['_c5'],
        varType: 'const'
      }),
      v('v[DimA]', 'IF THEN ELSE(DimA=A2,1,0)', {
        refId: '_v',
        subscripts: ['_dima']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "sum" model', () => {
    const vars = readSubscriptsAndEquations('sum')
    expect(vars).toEqual([
      v('a 2[SubA]', '1,2', {
        refId: '_a_2[_a2]',
        separationDims: ['_suba'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('a 2[SubA]', '1,2', {
        refId: '_a_2[_a3]',
        separationDims: ['_suba'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('a[DimA]', '1,2,3', {
        refId: '_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('a[DimA]', '1,2,3', {
        refId: '_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('a[DimA]', '1,2,3', {
        refId: '_a[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('b 2[SubA]', '4,5', {
        refId: '_b_2[_a2]',
        separationDims: ['_suba'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('b 2[SubA]', '4,5', {
        refId: '_b_2[_a3]',
        separationDims: ['_suba'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('b[DimA]', '4,5,6', {
        refId: '_b[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('b[DimA]', '4,5,6', {
        refId: '_b[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('b[DimA]', '4,5,6', {
        refId: '_b[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('c', 'SUM(a[DimA!])+1', {
        refId: '_c',
        referencedFunctionNames: ['__sum'],
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]']
      }),
      v('d', 'SUM(a[DimA!])+SUM(b[DimA!])', {
        refId: '_d',
        referencedFunctionNames: ['__sum'],
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]', '_b[_a1]', '_b[_a2]', '_b[_a3]']
      }),
      v('e', 'SUM(a[DimA!]*b[DimA!]/TIME STEP)', {
        refId: '_e',
        referencedFunctionNames: ['__sum'],
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]', '_b[_a1]', '_b[_a2]', '_b[_a3]', '_time_step']
      }),
      v('f[DimA,DimC]', '1', {
        refId: '_f',
        subscripts: ['_dima', '_dimc'],
        varType: 'const'
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g[DimA,DimC]', 'SUM(f[DimA!,DimC!])', {
        refId: '_g',
        referencedFunctionNames: ['__sum'],
        references: ['_f'],
        subscripts: ['_dima', '_dimc']
      }),
      v('h[DimC]', '10,20,30', {
        refId: '_h[_c1]',
        separationDims: ['_dimc'],
        subscripts: ['_c1'],
        varType: 'const'
      }),
      v('h[DimC]', '10,20,30', {
        refId: '_h[_c2]',
        separationDims: ['_dimc'],
        subscripts: ['_c2'],
        varType: 'const'
      }),
      v('h[DimC]', '10,20,30', {
        refId: '_h[_c3]',
        separationDims: ['_dimc'],
        subscripts: ['_c3'],
        varType: 'const'
      }),
      v('i', 'SUM(a[DimA!]+h[DimC!])', {
        refId: '_i',
        referencedFunctionNames: ['__sum'],
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]', '_h[_c1]', '_h[_c2]', '_h[_c3]']
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('j[DimA]', 'a[DimA]/SUM(b[DimA!])', {
        refId: '_j',
        referencedFunctionNames: ['__sum'],
        references: ['_a[_a1]', '_a[_a2]', '_a[_a3]', '_b[_a1]', '_b[_a2]', '_b[_a3]'],
        subscripts: ['_dima']
      }),
      v('k[SubA]', 'SUM(b 2[SubA!])', {
        refId: '_k[_a2]',
        referencedFunctionNames: ['__sum'],
        references: ['_b_2[_a2]', '_b_2[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('k[SubA]', 'SUM(b 2[SubA!])', {
        refId: '_k[_a3]',
        referencedFunctionNames: ['__sum'],
        references: ['_b_2[_a2]', '_b_2[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('l[SubA]', 'a 2[SubA]/SUM(b 2[SubA!])', {
        refId: '_l[_a2]',
        referencedFunctionNames: ['__sum'],
        references: ['_a_2[_a2]', '_b_2[_a2]', '_b_2[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('l[SubA]', 'a 2[SubA]/SUM(b 2[SubA!])', {
        refId: '_l[_a3]',
        referencedFunctionNames: ['__sum'],
        references: ['_a_2[_a3]', '_b_2[_a2]', '_b_2[_a3]'],
        separationDims: ['_suba'],
        subscripts: ['_a3']
      }),
      v('m[D1,E1]', '11', {
        refId: '_m[_d1,_e1]',
        subscripts: ['_d1', '_e1'],
        varType: 'const'
      }),
      v('m[D1,E2]', '12', {
        refId: '_m[_d1,_e2]',
        subscripts: ['_d1', '_e2'],
        varType: 'const'
      }),
      v('m[D2,E1]', '21', {
        refId: '_m[_d2,_e1]',
        subscripts: ['_d2', '_e1'],
        varType: 'const'
      }),
      v('m[D2,E2]', '22', {
        refId: '_m[_d2,_e2]',
        subscripts: ['_d2', '_e2'],
        varType: 'const'
      }),
      v('msum[DimD]', 'SUM(m[DimD,DimE!])', {
        refId: '_msum',
        referencedFunctionNames: ['__sum'],
        references: ['_m[_d1,_e1]', '_m[_d1,_e2]', '_m[_d2,_e1]', '_m[_d2,_e2]'],
        subscripts: ['_dimd']
      }),
      v('n[D1,E1,F1]', '111', {
        refId: '_n[_d1,_e1,_f1]',
        subscripts: ['_d1', '_e1', '_f1'],
        varType: 'const'
      }),
      v('n[D1,E1,F2]', '112', {
        refId: '_n[_d1,_e1,_f2]',
        subscripts: ['_d1', '_e1', '_f2'],
        varType: 'const'
      }),
      v('n[D1,E2,F1]', '121', {
        refId: '_n[_d1,_e2,_f1]',
        subscripts: ['_d1', '_e2', '_f1'],
        varType: 'const'
      }),
      v('n[D1,E2,F2]', '122', {
        refId: '_n[_d1,_e2,_f2]',
        subscripts: ['_d1', '_e2', '_f2'],
        varType: 'const'
      }),
      v('n[D2,E1,F1]', '211', {
        refId: '_n[_d2,_e1,_f1]',
        subscripts: ['_d2', '_e1', '_f1'],
        varType: 'const'
      }),
      v('n[D2,E1,F2]', '212', {
        refId: '_n[_d2,_e1,_f2]',
        subscripts: ['_d2', '_e1', '_f2'],
        varType: 'const'
      }),
      v('n[D2,E2,F1]', '221', {
        refId: '_n[_d2,_e2,_f1]',
        subscripts: ['_d2', '_e2', '_f1'],
        varType: 'const'
      }),
      v('n[D2,E2,F2]', '222', {
        refId: '_n[_d2,_e2,_f2]',
        subscripts: ['_d2', '_e2', '_f2'],
        varType: 'const'
      }),
      v('nsum[DimD,DimE]', 'SUM(n[DimD,DimE,DimF!])', {
        refId: '_nsum',
        referencedFunctionNames: ['__sum'],
        references: [
          '_n[_d1,_e1,_f1]',
          '_n[_d1,_e1,_f2]',
          '_n[_d1,_e2,_f1]',
          '_n[_d1,_e2,_f2]',
          '_n[_d2,_e1,_f1]',
          '_n[_d2,_e1,_f2]',
          '_n[_d2,_e2,_f1]',
          '_n[_d2,_e2,_f2]'
        ],
        subscripts: ['_dimd', '_dime']
      }),
      v('o[D1,DimE,F1]', '111', {
        refId: '_o[_d1,_dime,_f1]',
        subscripts: ['_d1', '_dime', '_f1'],
        varType: 'const'
      }),
      v('o[D1,DimE,F2]', '112', {
        refId: '_o[_d1,_dime,_f2]',
        subscripts: ['_d1', '_dime', '_f2'],
        varType: 'const'
      }),
      v('o[D2,DimE,F1]', '211', {
        refId: '_o[_d2,_dime,_f1]',
        subscripts: ['_d2', '_dime', '_f1'],
        varType: 'const'
      }),
      v('o[D2,DimE,F2]', '212', {
        refId: '_o[_d2,_dime,_f2]',
        subscripts: ['_d2', '_dime', '_f2'],
        varType: 'const'
      }),
      v('osum[DimD,DimE]', 'SUM(o[DimD,DimE,DimF!])', {
        refId: '_osum',
        referencedFunctionNames: ['__sum'],
        references: ['_o[_d1,_dime,_f1]', '_o[_d1,_dime,_f2]', '_o[_d2,_dime,_f1]', '_o[_d2,_dime,_f2]'],
        subscripts: ['_dimd', '_dime']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "sumif" model', () => {
    const vars = readSubscriptsAndEquations('sumif')
    expect(vars).toEqual([
      v(
        'A Values Avg',
        'ZIDZ(SUM(IF THEN ELSE(A Values[DimA!]=:NA:,0,A Values[DimA!])),SUM(IF THEN ELSE(A Values[DimA!]=:NA:,0,1)))',
        {
          refId: '_a_values_avg',
          referencedFunctionNames: ['__zidz', '__sum'],
          references: ['_a_values']
        }
      ),
      v('A Values Total', 'SUM(A Values[DimA!])', {
        refId: '_a_values_total',
        referencedFunctionNames: ['__sum'],
        references: ['_a_values']
      }),
      v('A Values[DimA]', '', {
        refId: '_a_values',
        subscripts: ['_dima'],
        varType: 'data'
      }),
      v('FINAL TIME', '10', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })

  it('should work for Vensim "trend" model', () => {
    const vars = readSubscriptsAndEquations('trend')
    expect(vars).toEqual([
      v('average time', '6', {
        refId: '_average_time',
        varType: 'const'
      }),
      v('average value', 'INTEG((input-average value)/average time,input/(1+initial trend*average time))', {
        hasInitValue: true,
        initReferences: ['_input', '_initial_trend', '_average_time'],
        refId: '_average_value',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_average_time'],
        varType: 'level'
      }),
      v('description', '0', {
        refId: '_description',
        varType: 'const'
      }),
      v('FINAL TIME', '100', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('initial trend', '10', {
        refId: '_initial_trend',
        varType: 'const'
      }),
      v('input', '1+0.5*SIN(2*3.14159*Time/period)', {
        refId: '_input',
        referencedFunctionNames: ['__sin'],
        references: ['_time', '_period']
      }),
      v('period', '20', {
        refId: '_period',
        varType: 'const'
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('TREND of input', 'TREND(input,average time,initial trend)', {
        refId: '_trend_of_input',
        references: ['__level1', '__aux1'],
        trendVarName: '__aux1'
      }),
      v('trend1', 'ZIDZ(input-average value,average time*ABS(average value))', {
        refId: '_trend1',
        referencedFunctionNames: ['__zidz', '__abs'],
        references: ['_input', '_average_value', '_average_time']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      }),
      v('_level1', 'INTEG((input-_level1)/average time,input/(1+initial trend*average time))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input', '_initial_trend', '_average_time'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_average_time'],
        varType: 'level'
      }),
      v('_aux1', 'ZIDZ(input-_level1,average time*ABS(_level1))', {
        includeInOutput: false,
        refId: '__aux1',
        referencedFunctionNames: ['__zidz', '__abs'],
        references: ['_input', '__level1', '_average_time']
      })
    ])
  })

  it('should work for Vensim "vector" model', () => {
    const vars = readSubscriptsAndEquations('vector')
    expect(vars).toEqual([
      v('a[DimA]', '0,1,1', {
        refId: '_a[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('a[DimA]', '0,1,1', {
        refId: '_a[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('a[DimA]', '0,1,1', {
        refId: '_a[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('ASCENDING', '1', {
        refId: '_ascending',
        varType: 'const'
      }),
      v('b[DimB]', '1,2', {
        refId: '_b[_b1]',
        separationDims: ['_dimb'],
        subscripts: ['_b1'],
        varType: 'const'
      }),
      v('b[DimB]', '1,2', {
        refId: '_b[_b2]',
        separationDims: ['_dimb'],
        subscripts: ['_b2'],
        varType: 'const'
      }),
      v('c[DimA]', '10+VECTOR ELM MAP(b[B1],a[DimA])', {
        refId: '_c',
        referencedFunctionNames: ['__vector_elm_map'],
        references: ['_b[_b1]', '_a[_a1]', '_a[_a2]', '_a[_a3]'],
        subscripts: ['_dima']
      }),
      v('d[A1,B1]', '1', {
        refId: '_d[_a1,_b1]',
        subscripts: ['_a1', '_b1'],
        varType: 'const'
      }),
      v('d[A1,B2]', '4', {
        refId: '_d[_a1,_b2]',
        subscripts: ['_a1', '_b2'],
        varType: 'const'
      }),
      v('d[A2,B1]', '2', {
        refId: '_d[_a2,_b1]',
        subscripts: ['_a2', '_b1'],
        varType: 'const'
      }),
      v('d[A2,B2]', '5', {
        refId: '_d[_a2,_b2]',
        subscripts: ['_a2', '_b2'],
        varType: 'const'
      }),
      v('d[A3,B1]', '3', {
        refId: '_d[_a3,_b1]',
        subscripts: ['_a3', '_b1'],
        varType: 'const'
      }),
      v('d[A3,B2]', '6', {
        refId: '_d[_a3,_b2]',
        subscripts: ['_a3', '_b2'],
        varType: 'const'
      }),
      v('DESCENDING', '0', {
        refId: '_descending',
        varType: 'const'
      }),
      v('e[A1,B1]', '0', {
        refId: '_e[_a1,_b1]',
        subscripts: ['_a1', '_b1'],
        varType: 'const'
      }),
      v('e[A1,B2]', '1', {
        refId: '_e[_a1,_b2]',
        subscripts: ['_a1', '_b2'],
        varType: 'const'
      }),
      v('e[A2,B1]', '1', {
        refId: '_e[_a2,_b1]',
        subscripts: ['_a2', '_b1'],
        varType: 'const'
      }),
      v('e[A2,B2]', '0', {
        refId: '_e[_a2,_b2]',
        subscripts: ['_a2', '_b2'],
        varType: 'const'
      }),
      v('e[A3,B1]', '0', {
        refId: '_e[_a3,_b1]',
        subscripts: ['_a3', '_b1'],
        varType: 'const'
      }),
      v('e[A3,B2]', '1', {
        refId: '_e[_a3,_b2]',
        subscripts: ['_a3', '_b2'],
        varType: 'const'
      }),
      v('f[DimA,DimB]', 'VECTOR ELM MAP(d[DimA,B1],a[DimA])', {
        refId: '_f',
        referencedFunctionNames: ['__vector_elm_map'],
        references: ['_d[_a1,_b1]', '_d[_a2,_b1]', '_d[_a3,_b1]', '_a[_a1]', '_a[_a2]', '_a[_a3]'],
        subscripts: ['_dima', '_dimb']
      }),
      v('FINAL TIME', '1', {
        refId: '_final_time',
        varType: 'const'
      }),
      v('g[DimA,DimB]', 'VECTOR ELM MAP(d[DimA,B1],e[DimA,DimB])', {
        refId: '_g',
        referencedFunctionNames: ['__vector_elm_map'],
        references: [
          '_d[_a1,_b1]',
          '_d[_a2,_b1]',
          '_d[_a3,_b1]',
          '_e[_a1,_b1]',
          '_e[_a1,_b2]',
          '_e[_a2,_b1]',
          '_e[_a2,_b2]',
          '_e[_a3,_b1]',
          '_e[_a3,_b2]'
        ],
        subscripts: ['_dima', '_dimb']
      }),
      v('h[DimA]', '2100,2010,2020', {
        refId: '_h[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('h[DimA]', '2100,2010,2020', {
        refId: '_h[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('h[DimA]', '2100,2010,2020', {
        refId: '_h[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('INITIAL TIME', '0', {
        refId: '_initial_time',
        varType: 'const'
      }),
      v('l[DimA]', 'VECTOR SORT ORDER(h[DimA],ASCENDING)', {
        refId: '_l',
        referencedFunctionNames: ['__vector_sort_order'],
        references: ['_h[_a1]', '_h[_a2]', '_h[_a3]', '_ascending'],
        subscripts: ['_dima']
      }),
      v('m[DimA]', 'VECTOR SORT ORDER(h[DimA],0)', {
        refId: '_m',
        referencedFunctionNames: ['__vector_sort_order'],
        references: ['_h[_a1]', '_h[_a2]', '_h[_a3]'],
        subscripts: ['_dima']
      }),
      v('o[A1,B1]', '1', {
        refId: '_o[_a1,_b1]',
        subscripts: ['_a1', '_b1'],
        varType: 'const'
      }),
      v('o[A1,B2]', '2', {
        refId: '_o[_a1,_b2]',
        subscripts: ['_a1', '_b2'],
        varType: 'const'
      }),
      v('o[A2,B1]', '4', {
        refId: '_o[_a2,_b1]',
        subscripts: ['_a2', '_b1'],
        varType: 'const'
      }),
      v('o[A2,B2]', '3', {
        refId: '_o[_a2,_b2]',
        subscripts: ['_a2', '_b2'],
        varType: 'const'
      }),
      v('o[A3,B1]', '5', {
        refId: '_o[_a3,_b1]',
        subscripts: ['_a3', '_b1'],
        varType: 'const'
      }),
      v('o[A3,B2]', '5', {
        refId: '_o[_a3,_b2]',
        subscripts: ['_a3', '_b2'],
        varType: 'const'
      }),
      v('p[DimA,DimB]', 'VECTOR SORT ORDER(o[DimA,DimB],ASCENDING)', {
        refId: '_p',
        referencedFunctionNames: ['__vector_sort_order'],
        references: [
          '_o[_a1,_b1]',
          '_o[_a1,_b2]',
          '_o[_a2,_b1]',
          '_o[_a2,_b2]',
          '_o[_a3,_b1]',
          '_o[_a3,_b2]',
          '_ascending'
        ],
        subscripts: ['_dima', '_dimb']
      }),
      v('q[DimB]', 'VECTOR SELECT(e[DimA!,DimB],c[DimA!],0,VSSUM,VSERRNONE)', {
        refId: '_q',
        referencedFunctionNames: ['__vector_select'],
        references: [
          '_e[_a1,_b1]',
          '_e[_a1,_b2]',
          '_e[_a2,_b1]',
          '_e[_a2,_b2]',
          '_e[_a3,_b1]',
          '_e[_a3,_b2]',
          '_c',
          '_vssum',
          '_vserrnone'
        ],
        subscripts: ['_dimb']
      }),
      v('r[DimA]', 'VECTOR SELECT(e[DimA,DimB!],d[DimA,DimB!],:NA:,VSMAX,VSERRNONE)', {
        refId: '_r',
        referencedFunctionNames: ['__vector_select'],
        references: [
          '_e[_a1,_b1]',
          '_e[_a1,_b2]',
          '_e[_a2,_b1]',
          '_e[_a2,_b2]',
          '_e[_a3,_b1]',
          '_e[_a3,_b2]',
          '_d[_a1,_b1]',
          '_d[_a1,_b2]',
          '_d[_a2,_b1]',
          '_d[_a2,_b2]',
          '_d[_a3,_b1]',
          '_d[_a3,_b2]',
          '_vsmax',
          '_vserrnone'
        ],
        subscripts: ['_dima']
      }),
      v('s[DimB]', 'SUM(c[DimA!]*e[DimA!,DimB])', {
        refId: '_s',
        referencedFunctionNames: ['__sum'],
        references: ['_c', '_e[_a1,_b1]', '_e[_a1,_b2]', '_e[_a2,_b1]', '_e[_a2,_b2]', '_e[_a3,_b1]', '_e[_a3,_b2]'],
        subscripts: ['_dimb']
      }),
      v('SAVEPER', 'TIME STEP', {
        refId: '_saveper',
        references: ['_time_step']
      }),
      v('TIME STEP', '1', {
        refId: '_time_step',
        varType: 'const'
      }),
      v('u', 'VMAX(x[DimX!])', {
        refId: '_u',
        referencedFunctionNames: ['__vmax'],
        references: ['_x[_five]', '_x[_four]', '_x[_one]', '_x[_three]', '_x[_two]']
      }),
      v('v', 'VMAX(x[SubX!])', {
        refId: '_v',
        referencedFunctionNames: ['__vmax'],
        references: ['_x[_four]', '_x[_three]', '_x[_two]']
      }),
      v('VSERRATLEASTONE', '1', {
        refId: '_vserratleastone',
        varType: 'const'
      }),
      v('VSERRNONE', '0', {
        refId: '_vserrnone',
        varType: 'const'
      }),
      v('VSMAX', '3', {
        refId: '_vsmax',
        varType: 'const'
      }),
      v('VSSUM', '0', {
        refId: '_vssum',
        varType: 'const'
      }),
      v('w', 'VMIN(x[DimX!])', {
        refId: '_w',
        referencedFunctionNames: ['__vmin'],
        references: ['_x[_five]', '_x[_four]', '_x[_one]', '_x[_three]', '_x[_two]']
      }),
      v('x[DimX]', '1,2,3,4,5', {
        refId: '_x[_one]',
        separationDims: ['_dimx'],
        subscripts: ['_one'],
        varType: 'const'
      }),
      v('x[DimX]', '1,2,3,4,5', {
        refId: '_x[_two]',
        separationDims: ['_dimx'],
        subscripts: ['_two'],
        varType: 'const'
      }),
      v('x[DimX]', '1,2,3,4,5', {
        refId: '_x[_three]',
        separationDims: ['_dimx'],
        subscripts: ['_three'],
        varType: 'const'
      }),
      v('x[DimX]', '1,2,3,4,5', {
        refId: '_x[_four]',
        separationDims: ['_dimx'],
        subscripts: ['_four'],
        varType: 'const'
      }),
      v('x[DimX]', '1,2,3,4,5', {
        refId: '_x[_five]',
        separationDims: ['_dimx'],
        subscripts: ['_five'],
        varType: 'const'
      }),
      v('y[DimA]', 'VECTOR ELM MAP(x[three],(DimA-1))', {
        refId: '_y',
        referencedFunctionNames: ['__vector_elm_map'],
        references: ['_x[_three]'],
        subscripts: ['_dima']
      }),
      v('Time', '', {
        refId: '_time',
        varType: 'const'
      })
    ])
  })
})
