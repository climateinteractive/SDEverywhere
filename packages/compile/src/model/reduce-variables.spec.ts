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
    // XXX: Strip out the legacy ANTLR eqnCtx to avoid vitest hang when comparing
    delete v.eqnCtx
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

// function readSubscriptsAndEquations(modelName: string): Variable[] {
//   return readSubscriptsAndEquationsFromSource({ modelName })
// }

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
  ;(variable as any).reduced = true
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      const r = variable as Record<string, any>
      r[key] = value
    }
  }
  return variable as Variable
}

describe.skipIf(process.env.SDE_NONPUBLIC_USE_NEW_PARSE === '0')(
  'reduceVariables (default mode: reduce conditionals only)',
  () => {
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
  }
)

describe.skipIf(process.env.SDE_NONPUBLIC_USE_NEW_PARSE === '0')(
  'reduceVariables (aggressive mode: reduce everything)',
  () => {
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
  }
)
