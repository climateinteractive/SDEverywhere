import { describe, expect, it } from 'vitest'

import { canonicalName, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'
import { default as VariableImpl } from './variable'

import type { ParsedModel, Variable } from '../_tests/test-support'
import { parseInlineVensimModel, parseVensimModel, sampleModelDir } from '../_tests/test-support'

/**
 * This is a shorthand for the following steps to read equations:
 *   - parseVensimModel
 *   - readSubscriptRanges
 *   - resolveSubscriptRanges
 *   - readVariables
 */
function readSubscriptsAndEquationsFromSource(
  source: {
    modelText?: string
    modelName?: string
    modelDir?: string
  },
  opts: {
    reduceVariables: 'default' | 'aggressive'
  }
): Variable[] {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  let parsedModel: ParsedModel
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
    reduceVariables: opts.reduceVariables,
    stopAfterReduceVariables: true,
    stopAfterAnalyze: true
  })

  return Model.variables.map(v => {
    // XXX: Strip out the new `parsedEqn` field, since we don't need it for comparing
    delete v.parsedEqn
    // XXX: Strip out the `origModelFormula` field, since we don't need it for comparing
    delete v.origModelFormula
    return v
  })
}

function readInlineModel(reduceVariables: 'default' | 'aggressive', modelText: string, modelDir?: string): Variable[] {
  const vars = readSubscriptsAndEquationsFromSource({ modelText, modelDir }, { reduceVariables })

  // Exclude the `Time` variable so that we have one less thing to check
  return vars.filter(v => v.varName !== '_time')
}

/**
 * Return the reduced formula for each variable in the model, in the order that the variables
 * are defined.  This is a lighter-weight alternative to comparing whole `Variable` instances,
 * for tests that only care about how far the reduction got.
 */
function readInlineModelFormulas(reduceVariables: 'default' | 'aggressive', modelText: string): string[][] {
  return readInlineModel(reduceVariables, modelText).map(v => [v.varName, v.modelFormula])
}

/**
 * Read the given model and run the full analysis (including the dependency sort) rather than
 * stopping after the reduction step.  This is used to verify that a genuine dependency cycle
 * is still reported by the sort.
 */
function readInlineModelWithFullAnalysis(reduceVariables: 'default' | 'aggressive', modelText: string): void {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  const parsedModel = parseInlineVensimModel(modelText)
  Model.read(
    parsedModel,
    /*spec=*/ {},
    /*extData=*/ undefined,
    /*directData=*/ undefined,
    /*modelDirname=*/ undefined,
    {
      reduceVariables
    }
  )
}

// function readSubscriptsAndEquations(modelName: string): Variable[] {
//   return readSubscriptsAndEquationsFromSource({ modelName })
// }

function v(lhs: string, formula: string, overrides?: Partial<Variable>): Variable {
  const variable = new VariableImpl()
  variable.modelLHS = lhs
  variable.modelFormula = formula
  variable.varName = canonicalName(lhs.split('[')[0])
  variable.varType = 'aux'
  variable.hasInitValue = false
  variable.includeInOutput = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(variable as any).reduced = true
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = variable as Record<string, any>
      r[key] = value
    }
  }
  return variable as Variable
}

describe('reduceVariables (default mode: reduce conditionals only)', () => {
  it('should reduce a simple equation when the condition resolves to a constant', () => {
    const vars = readInlineModel(
      'default',
      `
        x = 1 ~~|
        y = IF THEN ELSE(x, (x + 2) * 3, 5) ~~|
      `
    )
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x'
      }),
      v('y', '((x+2)*3)', {
        refId: '_y'
      })
    ])
  })

  it('should not reduce an equation that does not involve a conditional', () => {
    const vars = readInlineModel(
      'default',
      `
        x = 1 ~~|
        y = (x + 2) * 3 ~~|
      `
    )
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x'
      }),
      v('y', '(x+2)*3', {
        refId: '_y'
      })
    ])
  })

  it('should not reduce an equation when the condition cannot be reduced', () => {
    const vars = readInlineModel(
      'default',
      `
        x = Time ~~|
        y = Time + 2 ~~|
        z = (x + y) * 3 ~~|
      `
    )
    expect(vars).toEqual([
      v('x', 'Time', {
        refId: '_x'
      }),
      v('y', 'Time+2', {
        refId: '_y'
      }),
      v('z', '(x+y)*3', {
        refId: '_z'
      })
    ])
  })
})

describe('reduceVariables (aggressive mode: reduce everything)', () => {
  it('should reduce a simple equation to a constant', () => {
    const vars = readInlineModel(
      'aggressive',
      `
        x = 1 ~~|
        y = (x + 2) * 3 ~~|
      `
    )
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x'
      }),
      v('y', '9', {
        refId: '_y'
      })
    ])
  })

  it('should not reduce an equation when variables cannot be reduced', () => {
    const vars = readInlineModel(
      'aggressive',
      `
        x = Time ~~|
        y = Time + 2 ~~|
        z = (x + y) * 3 ~~|
      `
    )
    expect(vars).toEqual([
      v('x', 'Time', {
        refId: '_x'
      }),
      v('y', 'Time+2', {
        refId: '_y'
      }),
      v('z', '(x+y)*3', {
        refId: '_z'
      })
    ])
  })

  it('should stop at a feedback loop between a level and an aux variable', () => {
    // This is the classic shape of a stock-and-flow feedback loop, and is the reason
    // aggressive reduction previously failed on any real model: reducing `gas uptake`
    // requires visiting `gas in atm`, whose rate refers back to `gas uptake`.
    const formulas = readInlineModelFormulas(
      'aggressive',
      `
        gas emissions = 300 ~~|
        time constant = 8 ~~|
        gas in atm = INTEG(gas emissions - gas uptake, 4900) ~~|
        gas uptake = gas in atm / time constant ~~|
      `
    )
    expect(formulas).toEqual([
      ['_gas_emissions', '300'],
      ['_time_constant', '8'],
      // The constant is substituted, but the variable in the loop is left alone
      ['_gas_in_atm', 'INTEG(300-gas uptake,4900)'],
      ['_gas_uptake', 'gas in atm/8']
    ])
  })

  it('should stop at a variable that refers to itself', () => {
    const formulas = readInlineModelFormulas(
      'aggressive',
      `
        x = 1 ~~|
        y = SAMPLE IF TRUE(Time > x, y + 1, 0) ~~|
      `
    )
    expect(formulas).toEqual([
      ['_x', '1'],
      ['_y', 'SAMPLE IF TRUE(Time>1,y+1,0)']
    ])
  })

  it('should leave a genuine dependency cycle to be reported by the dependency sort', () => {
    // A cycle between two aux variables is a real error in the model, but it is the
    // dependency sort that should report it (with the full chain), not the reduction step
    expect(() =>
      readInlineModelWithFullAnalysis(
        'aggressive',
        `
          X = Y ~~|
          Y = X + 1 ~~|
        `
      )
    ).toThrow('Found cyclic dependency during toposort:\n_y →\n_x →\n_y')
  })
})
