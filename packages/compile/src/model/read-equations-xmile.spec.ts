import { describe, expect, it } from 'vitest'

import { canonicalName, cartesianProductOf, resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'
import { default as VariableImpl } from './variable'

import type { ParsedModel, Variable } from '../_tests/test-support'
import { parseInlineXmileModel, parseXmileModel, sampleModelDir, xmile } from '../_tests/test-support'

/**
 * This is a shorthand for the following steps to read equations:
 *   - parseXmileModel
 *   - readSubscriptRanges
 *   - resolveSubscriptRanges
 *   - readVariables
 *   - analyze (this includes readEquations)
 */
function readSubscriptsAndEquationsFromSource(
  source: {
    modelText?: string
    modelName?: string
    modelDir?: string
  },
  opts?: {
    specialSeparationDims?: { [key: string]: string }
    separateAllVarsWithDims?: string[][]
  }
): Variable[] {
  // XXX: These steps are needed due to subs/dims and variables being in module-level storage
  resetHelperState()
  resetSubscriptsAndDimensions()
  Model.resetModelState()

  let parsedModel: ParsedModel
  if (source.modelText) {
    parsedModel = parseInlineXmileModel(source.modelText)
  } else {
    parsedModel = parseXmileModel(source.modelName)
  }

  const spec = {
    specialSeparationDims: opts?.specialSeparationDims,
    separateAllVarsWithDims: opts?.separateAllVarsWithDims
  }

  let modelDir = source.modelDir
  if (modelDir === undefined) {
    if (source.modelName) {
      modelDir = sampleModelDir(source.modelName)
    }
  }

  Model.read(parsedModel, spec, /*extData=*/ undefined, /*directData=*/ undefined, modelDir, {
    reduceVariables: false,
    stopAfterAnalyze: true
  })

  return Model.variables.map(v => {
    // XXX: Strip out the new parsedEqn field, since we don't need it for comparing
    delete v.parsedEqn
    return v
  })
}

function readInlineModel(
  modelText: string,
  modelDir?: string,
  opts?: {
    specialSeparationDims?: { [key: string]: string }
    separateAllVarsWithDims?: string[][]
  }
): Variable[] {
  const vars = readSubscriptsAndEquationsFromSource({ modelText, modelDir }, opts)

  // Exclude the `Time` variable so that we have one less thing to check
  return vars.filter(v => v.varName !== '_time')
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
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      const r = variable as Record<string, any>
      r[key] = value
    }
  }
  return variable as Variable
}

describe('readEquations (from XMILE model)', () => {
  it('should work for simple equation with explicit parentheses', () => {
    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>(x + 2) * 3</eqn>
</aux>
`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = IF THEN ELSE(x = time, 1, 0) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>IF x = time THEN 1 ELSE 0</eqn>
</aux>
`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x = 1 ~~|
    //   y[DimA] = IF THEN ELSE(DimA = x, 1, 0) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>IF DimA = x THEN 1 ELSE 0</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   y[DimA] = IF THEN ELSE(DimA = A2, 1, 0) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
    const xmileVars = `\
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>IF THEN ELSE(DimA = A2, 1, 0)</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('y[DimA]', 'IF THEN ELSE(DimA=A2,1,0)', {
        refId: '_y',
        subscripts: ['_dima']
      })
    ])
  })

  it('should work for equation that uses specialSeparationDims', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(
    //   `
    //   DimA: A1, A2 ~~|
    //   y[DimA] = 0 ~~|
    // `,
    //   undefined,
    //   {
    //     specialSeparationDims: {
    //       _y: '_dima'
    //     }
    //   }
    // )

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
    const xmileVars = `\
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl, undefined, {
      specialSeparationDims: {
        _y: '_dima'
      }
    })
    expect(vars).toEqual([
      v('y[DimA]', '0', {
        refId: '_y[_a1]',
        varType: 'const',
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('y[DimA]', '0', {
        refId: '_y[_a2]',
        varType: 'const',
        separationDims: ['_dima'],
        subscripts: ['_a2']
      })
    ])
  })

  it('should work for equations that are affected by separateAllVarsWithDims', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(
    //   `
    //   DimA: A1, A2 ~~|
    //   DimB: B1, B2 ~~|
    //   DimC: C1, C2 ~~|
    //   x[DimA] = 0 ~~|
    //   y[DimB] = 0 ~~|
    //   z[DimA, DimB, DimC] = 0 ~~|
    // `,
    //   undefined,
    //   {
    //     separateAllVarsWithDims: [['_dima', '_dimc'], ['_dimb']]
    //   }
    // )

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
<dim name="DimC">
  <elem name="C1"/>
  <elem name="C2"/>
</dim>
`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="z">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
    <dim name="DimC"/>
  </dimensions>
  <eqn>0</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl, undefined, {
      separateAllVarsWithDims: [['_dima', '_dimc'], ['_dimb']]
    })
    expect(vars).toEqual([
      // x should not be separated ('_dima' is not listed in `separateAllVarsWithDims`)
      v('x[DimA]', '0', {
        refId: '_x',
        varType: 'const',
        subscripts: ['_dima']
      }),
      // y should be separated ('_dimb' is listed in `separateAllVarsWithDims`)
      v('y[DimB]', '0', {
        refId: '_y[_b1]',
        varType: 'const',
        separationDims: ['_dimb'],
        subscripts: ['_b1']
      }),
      v('y[DimB]', '0', {
        refId: '_y[_b2]',
        varType: 'const',
        separationDims: ['_dimb'],
        subscripts: ['_b2']
      }),
      // z should be separated only on DimA and DimC
      v('z[DimA,DimB,DimC]', '0', {
        refId: '_z[_a1,_dimb,_c1]',
        varType: 'const',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_dimb', '_c1']
      }),
      v('z[DimA,DimB,DimC]', '0', {
        refId: '_z[_a1,_dimb,_c2]',
        varType: 'const',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a1', '_dimb', '_c2']
      }),
      v('z[DimA,DimB,DimC]', '0', {
        refId: '_z[_a2,_dimb,_c1]',
        varType: 'const',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_dimb', '_c1']
      }),
      v('z[DimA,DimB,DimC]', '0', {
        refId: '_z[_a2,_dimb,_c2]',
        varType: 'const',
        separationDims: ['_dima', '_dimc'],
        subscripts: ['_a2', '_dimb', '_c2']
      })
    ])
  })

  it('should work for equations when specialSeparationDims and separateAllVarsWithDims are used together', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(
    //   `
    //   DimA: A1, A2 ~~|
    //   DimB: B1, B2 ~~|
    //   x1[DimA] = 0 ~~|
    //   x2[DimA] = 0 ~~|
    //   y[DimB] = 0 ~~|
    // `,
    //   undefined,
    //   {
    //     specialSeparationDims: { _x1: '_dima' },
    //     separateAllVarsWithDims: [['_dimb']]
    //   }
    // )

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
    const xmileVars = `\
<aux name="x1">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="x2">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <eqn>0</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl, undefined, {
      specialSeparationDims: { _x1: '_dima' },
      separateAllVarsWithDims: [['_dimb']]
    })
    expect(vars).toEqual([
      // x1 should be separated ('_x1[_dima]' is listed in `specialSeparationDims`)
      v('x1[DimA]', '0', {
        refId: '_x1[_a1]',
        varType: 'const',
        separationDims: ['_dima'],
        subscripts: ['_a1']
      }),
      v('x1[DimA]', '0', {
        refId: '_x1[_a2]',
        varType: 'const',
        separationDims: ['_dima'],
        subscripts: ['_a2']
      }),
      // x2 should not be separated ('_x2[_dima]' is listed in `specialSeparationDims`)
      v('x2[DimA]', '0', {
        refId: '_x2',
        varType: 'const',
        subscripts: ['_dima']
      }),
      // y should be separated ('_dimb' is listed in `separateAllVarsWithDims`)
      v('y[DimB]', '0', {
        refId: '_y[_b1]',
        varType: 'const',
        separationDims: ['_dimb'],
        subscripts: ['_b1']
      }),
      v('y[DimB]', '0', {
        refId: '_y[_b2]',
        varType: 'const',
        separationDims: ['_dimb'],
        subscripts: ['_b2']
      })
    ])
  })

  // TODO: Figure out equivalent XMILE model for this
  it.skip('should work for data variable definition', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(
    //   `
    //   x ~~|
    //   `
    // )

    const xmileVars = `\
<aux name="x">
  <eqn></eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'data'
      })
    ])
  })

  it('should work for lookup definition', () => {
    // Somewhat equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) ) ~~|
    // `)

    const xmileVars = `\
<gf name="x" type="continuous">
  <xpts>0,0.4,0.5,0.8,1</xpts>
  <ypts>0,0.1,0.5,0.9,1</ypts>
</gf>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', '', {
        refId: '_x',
        varType: 'lookup',
        range: [],
        points: [
          [0, 0],
          [0.4, 0.1],
          [0.5, 0.5],
          [0.8, 0.9],
          [1, 1]
        ]
      })
    ])
  })

  it('should work for lookup call', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x( (0,0),(2,1.3) ) ~~|
    //   y = x(2) ~~|
    // `)

    const xmileVars = `\
<gf name="x" type="continuous">
  <xpts>0,2</xpts>
  <ypts>0,1.3</ypts>
</gf>
<aux name="y">
  <eqn>x(2)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  // TODO: This test is skipped because apply-to-all lookups are not fully supported in SDE yet
  it.skip('should work for lookup call (with apply-to-all lookup variable)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x[DimA]( (0,0),(2,1.3) ) ~~|
    //   y = x[A1](2) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
    const xmileVars = `\
<gf name="x" type="continuous">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <xpts>0,2</xpts>
  <ypts>0,1.3</ypts>
</gf>
<aux name="y">
  <eqn>x[A1](2)</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    console.log(vars)
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

  // TODO: This test is skipped until we support XMILE spec 4.5.3:
  //   4.5.3 Apply-to-All Arrays with Non-Apply-to-All Graphical Functions
  it.skip('should work for lookup call (with separated lookup variable)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x[A1]( (0,0),(2,1.3) ) ~~|
    //   x[A2]( (1,1),(4,3) ) ~~|
    //   y = x[A1](2) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <gf>
      <xpts>0,2</xpts>
      <ypts>0,1.3</ypts>
    </gf>
  </element>
  <element subscript="A2">
    <gf>
      <xpts>1,4</xpts>
      <ypts>1,3</ypts>
    </gf>
  </element>
</aux>
<aux name="y">
  <eqn>x[A1](2)</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
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

  //
  // NOTE: The following "should work for {0,1,2,3}D variable" tests are aligned with the ones
  // in `gen-equation-{c,js}.spec.ts` (they exercise the same test models/equations).  Having both
  // sets of tests makes it easier to see whether a bug is in the "read equations" phase or
  // in the "code gen" phase or both.
  //

  describe('when LHS has no subscripts', () => {
    it('should work when RHS variable has no subscripts', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   x = 1 ~~|
      //   y = x ~~|
      // `)

      const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x</eqn>
</aux>`
      const mdl = xmile('', xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x', '1', {
          refId: '_x',
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', [])
        //   -> ['_x']
        v('y', 'x', {
          refId: '_y',
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (1D) and is accessed with specific subscript', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   x[DimA] = 1 ~~|
      //   y = x[A1] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x[A1]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_a1'])
        //   -> ['_x']
        v('y', 'x[A1]', {
          refId: '_y',
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with specific subscript', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   x[DimA] = 1, 2 ~~|
      //   y = x[A1] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[A1]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_a1'])
        //   -> ['_x[_a1]']
        v('y', 'x[A1]', {
          refId: '_y',
          references: ['_x[_a1]']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (1D) and is accessed with marked dimension', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   x[DimA] = 1 ~~|
      //   y = SUM(x[DimA!]) ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>SUM(x[*])</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)

      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima!'])
        //   -> ['_x']
        v('y', 'SUM(x[DimA!])', {
          refId: '_y',
          referencedFunctionNames: ['__sum'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with marked dimension', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   x[DimA] = 1, 2 ~~|
      //   y = SUM(x[DimA!]) ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>SUM(x[*])</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima!'])
        //   -> ['_x[_a1]', '_x[_a2]']
        v('y', 'SUM(x[DimA!])', {
          refId: '_y',
          referencedFunctionNames: ['__sum'],
          references: ['_x[_a1]', '_x[_a2]']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (2D) and is accessed with specific subscripts', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[DimA, DimB] = 1 ~~|
      //   y = x[A1, B2] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x[A1, B2]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_a1', '_b2'])
        //   -> ['_x']
        v('y', 'x[A1,B2]', {
          refId: '_y',
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (2D) and is accessed with specific subscripts', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[DimA, DimB] = 1, 2; 3, 4; ~~|
      //   y = x[A1, B2] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="A1,B1">
    <eqn>1</eqn>
  </element>
  <element subscript="A1,B2">
    <eqn>2</eqn>
  </element>
  <element subscript="A2,B1">
    <eqn>3</eqn>
  </element>
  <element subscript="A2,B2">
    <eqn>4</eqn>
  </element>
</aux>
<aux name="y">
  <eqn>x[A1, B2]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1,B1]', '1', {
          refId: '_x[_a1,_b1]',
          subscripts: ['_a1', '_b1'],
          varType: 'const'
        }),
        v('x[A1,B2]', '2', {
          refId: '_x[_a1,_b2]',
          subscripts: ['_a1', '_b2'],
          varType: 'const'
        }),
        v('x[A2,B1]', '3', {
          refId: '_x[_a2,_b1]',
          subscripts: ['_a2', '_b1'],
          varType: 'const'
        }),
        v('x[A2,B2]', '4', {
          refId: '_x[_a2,_b2]',
          subscripts: ['_a2', '_b2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_a1', '_b2'])
        //   -> ['_x[_a1,_b2]']
        v('y', 'x[A1,B2]', {
          refId: '_y',
          references: ['_x[_a1,_b2]']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (3D) and is accessed with specific subscripts', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   DimC: C1, C2 ~~|
      //   x[DimA, DimC, DimB] = 1 ~~|
      //   y = x[A1, C2, B2] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
<dim name="DimC">
  <elem name="C1"/>
  <elem name="C2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimC"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>x[A1, C2, B2]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimC,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimc', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_a1', '_c2', '_b2'])
        //   -> ['_x']
        v('y', 'x[A1,C2,B2]', {
          refId: '_y',
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (3D) and is accessed with specific subscripts', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   DimC: C1, C2 ~~|
      //   x[DimA, DimC, DimB] :EXCEPT: [DimA, DimC, B1] = 1 ~~|
      //   x[DimA, DimC, B1] = 2 ~~|
      //   y = x[A1, C2, B2] ~~|
      // `)

      // XXX: XMILE doesn't seem to have a shorthand like `:EXCEPT:` so we will
      // build the combinations manually here
      const dimA = ['A1', 'A2']
      const dimB = ['B1', 'B2']
      const dimC = ['C1', 'C2']
      const dims = [dimA, dimC, dimB]
      const combos = cartesianProductOf(dims)
      const elements = combos.map((combo: string[]) => {
        const subscripts = combo.join(',')
        const value = subscripts.endsWith('B1') ? '2' : '1'
        return `\
  <element subscript="${subscripts}">
    <eqn>${value}</eqn>
  </element>`
      })
      console.log()

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
<dim name="DimC">
  <elem name="C1"/>
  <elem name="C2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimC"/>
    <dim name="DimB"/>
  </dimensions>
${elements.join('\n')}
</aux>
<aux name="y">
  <eqn>x[A1, C2, B2]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      // TODO: Verify the `x` variable instances
      expect(vars.find(v => v.varName === '_y')).toEqual(
        v('y', 'x[A1,C2,B2]', {
          refId: '_y',
          references: ['_x[_a1,_c2,_b2]']
        })
      )
    })
  })

  describe('when LHS is apply-to-all (1D)', () => {
    it('should work when RHS variable has no subscripts', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x = 1 ~~|
      //   y[DimA] = x ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x', '1', {
          refId: '_x',
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', [])
        //   -> ['_x']
        v('y[DimA]', 'x', {
          refId: '_y',
          subscripts: ['_dima'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (1D) and is accessed with specific subscript', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1 ~~|
      //   y[DimA] = x[A2] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[A2]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_a2'])
        //   -> ['_x']
        v('y[DimA]', 'x[A2]', {
          refId: '_y',
          subscripts: ['_dima'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (1D) and is accessed with same dimension that appears in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1 ~~|
      //   y[DimA] = x[DimA] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima'])
        //   -> ['_x']
        v('y[DimA]', 'x[DimA]', {
          refId: '_y',
          subscripts: ['_dima'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with specific subscript', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1, 2, 3 ~~|
      //   y[DimA] = x[A2] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[A2]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        v('x[A3]', '3', {
          refId: '_x[_a3]',
          subscripts: ['_a3'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_a2'])
        //   -> ['_x[_a2]']
        v('y[DimA]', 'x[A2]', {
          refId: '_y',
          subscripts: ['_dima'],
          references: ['_x[_a2]']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with same dimension that appears in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1, 2, 3 ~~|
      //   y[DimA] = x[DimA] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        v('x[A3]', '3', {
          refId: '_x[_a3]',
          subscripts: ['_a3'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima'])
        //   -> ['_x[_a1]', '_x[_a2]', '_x[_a3]']
        v('y[DimA]', 'x[DimA]', {
          refId: '_y',
          subscripts: ['_dima'],
          references: ['_x[_a1]', '_x[_a2]', '_x[_a3]']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) with separated definitions and is accessed with same dimension that appears in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   x[A1] = 1 ~~|
      //   x[A2] = 2 ~~|
      //   y[DimA] = x[DimA] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima'])
        //   -> ['_x[_a1]', '_x[_a2]']
        v('y[DimA]', 'x[DimA]', {
          refId: '_y',
          subscripts: ['_dima'],
          references: ['_x[_a1]', '_x[_a2]']
        })
      ])
    })

    // This is adapted from the "except" sample model (see equation for `k`)
    // TODO: This test is skipped because it's not clear if XMILE supports mapped subdimensions
    it.skip('should work when RHS variable is NON-apply-to-all (1D) and is accessed with mapped version of LHS dimension', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   SubA: A2, A3 ~~|
      //   DimB: B1, B2 -> (DimA: SubA, A1) ~~|
      //   a[DimA] = 1, 2, 3 ~~|
      //   b[DimB] = 4, 5 ~~|
      //   y[DimA] = a[DimA] + b[DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="SubA">
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="a">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="b">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="B1">
    <eqn>4</eqn>
  </element>
  <element subscript="B2">
    <eqn>5</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>a[DimA] + b[DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('a[A1]', '1', {
          refId: '_a[_a1]',
          separationDims: ['_dima'],
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('a[A2]', '2', {
          refId: '_a[_a2]',
          separationDims: ['_dima'],
          subscripts: ['_a2'],
          varType: 'const'
        }),
        v('a[A3]', '3', {
          refId: '_a[_a3]',
          separationDims: ['_dima'],
          subscripts: ['_a3'],
          varType: 'const'
        }),
        v('b[B1]', '4', {
          refId: '_b[_b1]',
          separationDims: ['_dimb'],
          subscripts: ['_b1'],
          varType: 'const'
        }),
        v('b[B2]', '5', {
          refId: '_b[_b2]',
          separationDims: ['_dimb'],
          subscripts: ['_b2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_a', ['_dima'])
        //   -> ['_a[_a1]', '_a[_a2]', '_a[_a3]']
        // expandedRefIdsForVar(_y, '_b', ['_dimb'])
        //   -> ['_b[_b1]', '_b[_b2]']
        v('y[DimA]', 'a[DimA]+b[DimB]', {
          refId: '_y',
          subscripts: ['_dima'],
          references: ['_a[_a1]', '_a[_a2]', '_a[_a3]', '_b[_b1]', '_b[_b2]']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (1D) and is accessed with marked dimension that is different from one on LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[DimA] = 1 ~~|
      //   y[DimB] = SUM(x[DimA!]) ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <eqn>SUM(x[*])</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima!'])
        //   -> ['_x']
        v('y[DimB]', 'SUM(x[DimA!])', {
          refId: '_y',
          subscripts: ['_dimb'],
          referencedFunctionNames: ['__sum'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (1D) and is accessed with marked dimension that is same as one on LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   x[DimA] = 1 ~~|
      //   y[DimA] = SUM(x[DimA!]) ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>SUM(x[*])</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima!'])
        //   -> ['_x']
        v('y[DimA]', 'SUM(x[DimA!])', {
          refId: '_y',
          subscripts: ['_dima'],
          referencedFunctionNames: ['__sum'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with marked dimension that is different from one on LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[DimA] = 1, 2 ~~|
      //   y[DimB] = SUM(x[DimA!]) ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <eqn>SUM(x[*])</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima!'])
        //   -> ['_x[_a1]', '_x[_a2]']
        v('y[DimB]', 'SUM(x[DimA!])', {
          refId: '_y',
          subscripts: ['_dimb'],
          referencedFunctionNames: ['__sum'],
          references: ['_x[_a1]', '_x[_a2]']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with marked dimension that is same as one on LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   x[DimA] = 1, 2 ~~|
      //   y[DimA] = SUM(x[DimA!]) ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>SUM(x[*])</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima!'])
        //   -> ['_x[_a1]', '_x[_a2]']
        v('y[DimA]', 'SUM(x[DimA!])', {
          refId: '_y',
          subscripts: ['_dima'],
          referencedFunctionNames: ['__sum'],
          references: ['_x[_a1]', '_x[_a2]']
        })
      ])
    })

    // it.skip('should work when RHS variable is apply-to-all (2D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })

    // it.skip('should work when RHS variable is NON-apply-to-all (2D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })

    it('should work when RHS variable is apply-to-all (2D) and is accessed with one normal dimension and one marked dimension that resolve to same family', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: DimA ~~|
      //   x[DimA,DimB] = 1 ~~|
      //   y[DimA] = SUM(x[DimA,DimA!]) ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>SUM(x[DimA,*])</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima!'])
        //   -> ['_x']
        v('y[DimA]', 'SUM(x[DimA,DimB!])', {
          refId: '_y',
          subscripts: ['_dima'],
          referencedFunctionNames: ['__sum'],
          references: ['_x']
        })
      ])
    })

    // it.skip('should work when RHS variable is apply-to-all (3D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })

    // it.skip('should work when RHS variable is NON-apply-to-all (3D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })
  })

  describe('when LHS is NON-apply-to-all (1D)', () => {
    it('should work when RHS variable has no subscripts', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x = 1 ~~|
      //   y[DimA] :EXCEPT: [A1] = x ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A2">
    <eqn>x</eqn>
  </element>
  <element subscript="A3">
    <eqn>x</eqn>
  </element>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x', '1', {
          refId: '_x',
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_a2], '_x', [])
        //   -> ['_x']
        v('y[A2]', 'x', {
          refId: '_y[_a2]',
          subscripts: ['_a2'],
          references: ['_x']
        }),
        // expandedRefIdsForVar(_y[_a3], '_x', [])
        //   -> ['_x']
        v('y[A3]', 'x', {
          refId: '_y[_a3]',
          subscripts: ['_a3'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (1D) and is accessed with specific subscript', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1 ~~|
      //   y[DimA] :EXCEPT: [A1] = x[A2] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A2">
    <eqn>x[A2]</eqn>
  </element>
  <element subscript="A3">
    <eqn>x[A2]</eqn>
  </element>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_a2], '_x', ['_a2'])
        //   -> ['_x']
        v('y[A2]', 'x[A2]', {
          refId: '_y[_a2]',
          subscripts: ['_a2'],
          references: ['_x']
        }),
        // expandedRefIdsForVar(_y[_a3], '_x', ['_a2'])
        //   -> ['_x']
        v('y[A3]', 'x[A2]', {
          refId: '_y[_a3]',
          subscripts: ['_a3'],
          references: ['_x']
        })
      ])
    })

    // TODO: This test is skipped because it's failing; not sure if this is a valid construct in XMILE
    it.skip('should work when RHS variable is apply-to-all (1D) and is accessed with same dimension that appears in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1 ~~|
      //   y[DimA] :EXCEPT: [A1] = x[DimA] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>x[DimA]</eqn>
  </element>
  <element subscript="A3">
    <eqn>x[DimA]</eqn>
  </element>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        v('y[A1]', '1', {
          refId: '_y[_a1]',
          subscripts: ['_a1'],
          references: ['_x']
        }),
        // expandedRefIdsForVar(_y[_a2], '_x', ['_dima'])
        //   -> ['_x']
        v('y[A2]', 'x[DimA]', {
          refId: '_y[_a2]',
          subscripts: ['_a2'],
          references: ['_x']
        }),
        // expandedRefIdsForVar(_y[_a3], '_x', ['_dima'])
        //   -> ['_x']
        v('y[A3]', 'x[DimA]', {
          refId: '_y[_a3]',
          subscripts: ['_a3'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with specific subscript', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1, 2, 3 ~~|
      //   y[DimA] :EXCEPT: [A1] = x[A2] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A2">
    <eqn>x[A2]</eqn>
  </element>
  <element subscript="A3">
    <eqn>x[A2]</eqn>
  </element>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        v('x[A3]', '3', {
          refId: '_x[_a3]',
          subscripts: ['_a3'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_a2], '_x', ['_a2'])
        //   -> ['_x[_a2]']
        v('y[A2]', 'x[A2]', {
          refId: '_y[_a2]',
          subscripts: ['_a2'],
          references: ['_x[_a2]']
        }),
        // expandedRefIdsForVar(_y[_a3], '_x', ['_a2'])
        //   -> ['_x[_a2]']
        v('y[A3]', 'x[A2]', {
          refId: '_y[_a3]',
          subscripts: ['_a3'],
          references: ['_x[_a2]']
        })
      ])
    })

    // TODO: This test is skipped because it's failing; not sure if this is a valid construct in XMILE
    it.skip('should work when RHS variable is NON-apply-to-all (1D) and is accessed with same dimension that appears in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   x[DimA] = 1, 2, 3 ~~|
      //   y[DimA] :EXCEPT: [A1] = x[DimA] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A2">
    <eqn>x[DimA]</eqn>
  </element>
  <element subscript="A3">
    <eqn>x[DimA]</eqn>
  </element>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        v('x[A3]', '3', {
          refId: '_x[_a3]',
          subscripts: ['_a3'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_a2], '_x', ['_dima'])
        //   -> ['_x[_a2]']
        v('y[A2]', 'x[DimA]', {
          refId: '_y[_a2]',
          subscripts: ['_a2'],
          references: ['_x[_a2]']
        }),
        // expandedRefIdsForVar(_y[_a3], '_x', ['_dima'])
        //   -> ['_x[_a3]']
        v('y[A3]', 'x[DimA]', {
          refId: '_y[_a3]',
          subscripts: ['_a3'],
          references: ['_x[_a3]']
        })
      ])
    })

    // This is adapted from the "except" sample model (see equation for `k`)
    // TODO: This test is skipped because it's not clear if XMILE supports mapped subdimensions
    it.skip('should work when RHS variable is NON-apply-to-all (1D) and is accessed with mapped version of LHS dimension', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   SubA: A2, A3 ~~|
      //   DimB: B1, B2 -> (DimA: SubA, A1) ~~|
      //   a[DimA] = 1, 2, 3 ~~|
      //   b[DimB] = 4, 5 ~~|
      //   y[DimA] :EXCEPT: [A1] = a[DimA] + b[DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="SubA">
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="a">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="b">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="B1">
    <eqn>4</eqn>
  </element>
  <element subscript="B2">
    <eqn>5</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A2">
    <eqn>a[DimA] + b[DimB]</eqn>
  </element>
  <element subscript="A3">
    <eqn>a[DimA] + b[DimB]</eqn>
  </element>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('a[A1]', '1', {
          refId: '_a[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('a[A2]', '2', {
          refId: '_a[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        v('a[A3]', '3', {
          refId: '_a[_a3]',
          subscripts: ['_a3'],
          varType: 'const'
        }),
        v('b[B1]', '4', {
          refId: '_b[_b1]',
          subscripts: ['_b1'],
          varType: 'const'
        }),
        v('b[B2]', '5', {
          refId: '_b[_b2]',
          subscripts: ['_b2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_a2], '_a', ['_dima'])
        //   -> ['_a[_a2]']
        // expandedRefIdsForVar(_y[_a2], '_b', ['_dimb'])
        //   -> ['_b[_b1]']
        v('y[A2]', 'a[DimA]+b[DimB]', {
          refId: '_y[_a2]',
          subscripts: ['_a2'],
          references: ['_a[_a2]', '_b[_b1]']
        }),
        // expandedRefIdsForVar(_y[_a3], '_a', ['_dima'])
        //   -> ['_a[_a3]']
        // expandedRefIdsForVar(_y[_a3], '_b', ['_dimb'])
        //   -> ['_b[_b1]']
        v('y[A3]', 'a[DimA]+b[DimB]', {
          refId: '_y[_a3]',
          subscripts: ['_a3'],
          references: ['_a[_a3]', '_b[_b1]']
        })
      ])
    })

    // This is adapted from the "ref" sample model (with updated naming for clarity)
    // TODO: This test is skipped because it's not clear if XMILE supports this kind of mapping
    it.skip('should work for complex mapping example', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   Target: (t1-t3) ~~|
      //   tNext: (t2-t3) -> tPrev ~~|
      //   tPrev: (t1-t2) -> tNext ~~|
      //   x[t1] = y[t1] + 1 ~~|
      //   x[tNext] = y[tNext] + 1 ~~|
      //   y[t1] = 1 ~~|
      //   y[tNext] = x[tPrev] + 1 ~~|
      // `)

      const xmileDims = `\
<dim name="Target">
  <elem name="t1"/>
  <elem name="t2"/>
  <elem name="t3"/>
</dim>
<dim name="tNext">
  <elem name="t2"/>
  <elem name="t3"/>
</dim>
<dim name="tPrev">
  <elem name="t1"/>
  <elem name="t2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="Target"/>
  </dimensions>
  <element subscript="t1">
    <eqn>y[t1] + 1</eqn>
  </element>
  <element subscript="t2">
    <eqn>y[t2] + 1</eqn>
  </element>
  <element subscript="t3">
    <eqn>y[t3] + 1</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="Target"/>
  </dimensions>
  <element subscript="t1">
    <eqn>1</eqn>
  </element>
  <element subscript="t2">
    <eqn>x[t1] + 1</eqn>
  </element>
  <element subscript="t3">
    <eqn>x[t2] + 1</eqn>
  </element>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[t1]', 'y[t1]+1', {
          refId: '_x[_t1]',
          subscripts: ['_t1'],
          references: ['_y[_t1]']
        }),
        v('x[tNext]', 'y[tNext]+1', {
          refId: '_x[_t2]',
          separationDims: ['_tnext'],
          subscripts: ['_t2'],
          references: ['_y[_t2]']
        }),
        v('x[tNext]', 'y[tNext]+1', {
          refId: '_x[_t3]',
          separationDims: ['_tnext'],
          subscripts: ['_t3'],
          references: ['_y[_t3]']
        }),
        v('y[t1]', '1', {
          refId: '_y[_t1]',
          subscripts: ['_t1'],
          varType: 'const'
        }),
        v('y[tNext]', 'x[tPrev]+1', {
          refId: '_y[_t2]',
          references: ['_x[_t1]'],
          separationDims: ['_tnext'],
          subscripts: ['_t2']
        }),
        v('y[tNext]', 'x[tPrev]+1', {
          refId: '_y[_t3]',
          references: ['_x[_t2]'],
          separationDims: ['_tnext'],
          subscripts: ['_t3']
        })
      ])
    })
  })

  describe('when LHS is apply-to-all (2D)', () => {
    // it.skip('should work when RHS variable has no subscripts', () => {
    //   // TODO
    // })

    // it.skip('should work when RHS variable is apply-to-all (1D) and is accessed with specific subscript', () => {
    //   // TODO
    // })

    // it.skip('should work when RHS variable is NON-apply-to-all (1D) and is accessed with specific subscript', () => {
    //   // TODO
    // })

    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with LHS dimensions that resolve to the same family', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB <-> DimA ~~|
      //   x[DimA] = 1, 2 ~~|
      //   y[DimA, DimB] = x[DimA] + x[DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>x[DimA] + x[DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_dima,_dimb], '_x', ['_dima'])
        //   -> ['_x[_a1]', '_x[_a2]']
        // expandedRefIdsForVar(_y[_dima,_dimb], '_x', ['_dimb'])
        //   -> ['_x[_a1]', '_x[_a2]']
        v('y[DimA,DimB]', 'x[DimA]+x[DimB]', {
          refId: '_y',
          subscripts: ['_dima', '_dimb'],
          references: ['_x[_a1]', '_x[_a2]']
        })
      ])
    })

    // it.skip('should work when RHS variable is apply-to-all (2D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })

    // it.skip('should work when RHS variable is NON-apply-to-all (2D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })

    it('should work when RHS variable is apply-to-all (2D) and is accessed with same dimensions that appear in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[DimA, DimB] = 1 ~~|
      //   y[DimB, DimA] = x[DimA, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_dimb,_dima], '_x', ['_dima', '_dimb'])
        //   -> ['_x']
        v('y[DimB,DimA]', 'x[DimA,DimB]', {
          refId: '_y',
          subscripts: ['_dimb', '_dima'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is apply-to-all (2D) and is accessed with LHS dimensions that resolve to the same family', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB <-> DimA ~~|
      //   x[DimA, DimB] = 1 ~~|
      //   y[DimB, DimA] = x[DimA, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_dimb,_dima], '_x', ['_dima', '_dimb'])
        //   -> ['_x']
        v('y[DimB,DimA]', 'x[DimA,DimB]', {
          refId: '_y',
          subscripts: ['_dimb', '_dima'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (2D) and is accessed with same dimensions that appear in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[DimA, DimB] = 1, 2; 3, 4; ~~|
      //   y[DimB, DimA] = x[DimA, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="A1,B1">
    <eqn>1</eqn>
  </element>
  <element subscript="A1,B2">
    <eqn>2</eqn>
  </element>
  <element subscript="A2,B1">
    <eqn>3</eqn>
  </element>
  <element subscript="A2,B2">
    <eqn>4</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1,B1]', '1', {
          refId: '_x[_a1,_b1]',
          subscripts: ['_a1', '_b1'],
          varType: 'const'
        }),
        v('x[A1,B2]', '2', {
          refId: '_x[_a1,_b2]',
          subscripts: ['_a1', '_b2'],
          varType: 'const'
        }),
        v('x[A2,B1]', '3', {
          refId: '_x[_a2,_b1]',
          subscripts: ['_a2', '_b1'],
          varType: 'const'
        }),
        v('x[A2,B2]', '4', {
          refId: '_x[_a2,_b2]',
          subscripts: ['_a2', '_b2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_dimb,_dima], '_x', ['_dima', '_dimb'])
        //   -> ['_x[_a1,_b1]', '_x[_a1,_b2]', '_x[_a2,_b1]', '_x[_a2,_b2]']
        v('y[DimB,DimA]', 'x[DimA,DimB]', {
          refId: '_y',
          subscripts: ['_dimb', '_dima'],
          references: ['_x[_a1,_b1]', '_x[_a1,_b2]', '_x[_a2,_b1]', '_x[_a2,_b2]']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (2D) with separated definitions (for subscript in first position) and is accessed with same dimensions that appear in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[A1, DimB] = 1 ~~|
      //   x[A2, DimB] = 2 ~~|
      //   y[DimB, DimA] = x[DimA, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="A1,DimB">
    <eqn>1</eqn>
  </element>
  <element subscript="A2,DimB">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1,DimB]', '1', {
          refId: '_x[_a1,_dimb]',
          subscripts: ['_a1', '_dimb'],
          varType: 'const'
        }),
        v('x[A2,DimB]', '2', {
          refId: '_x[_a2,_dimb]',
          subscripts: ['_a2', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_dimb,_dima], '_x', ['_dima', '_dimb'])
        //   -> ['_x[_a1,_dimb]', '_x[_a2,_dimb]']
        v('y[DimB,DimA]', 'x[DimA,DimB]', {
          refId: '_y',
          subscripts: ['_dimb', '_dima'],
          references: ['_x[_a1,_dimb]', '_x[_a2,_dimb]']
        })
      ])
    })

    // it.skip('should work when RHS variable is apply-to-all (3D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })

    // it.skip('should work when RHS variable is NON-apply-to-all (3D) and is accessed with specific subscripts', () => {
    //   // TODO
    // })
  })

  describe('when LHS is NON-apply-to-all (2D)', () => {
    // The LHS in this test is partially separated (expanded only for first dimension position)
    it('should work when RHS variable is apply-to-all (2D) and is accessed with same dimensions that appear in LHS', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   SubA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   x[DimA, DimB] = 1 ~~|
      //   y[SubA, DimB] = x[SubA, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="SubA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="SubA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>x[SubA, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_a1,_dimb], '_x', ['_suba', '_dimb'])
        //   -> ['_x']
        v('y[SubA,DimB]', 'x[SubA,DimB]', {
          refId: '_y[_a1,_dimb]',
          separationDims: ['_suba'],
          subscripts: ['_a1', '_dimb'],
          references: ['_x']
        }),
        // expandedRefIdsForVar(_y[_a2,_dimb], '_x', ['_suba', '_dimb'])
        //   -> ['_x']
        v('y[SubA,DimB]', 'x[SubA,DimB]', {
          refId: '_y[_a2,_dimb]',
          separationDims: ['_suba'],
          subscripts: ['_a2', '_dimb'],
          references: ['_x']
        })
      ])
    })

    // This test is based on the example from #179 (simplified to use subdimensions to ensure separation)
    it('should work when RHS variable is NON-apply-to-all (1D) and is accessed with 2 different dimensions from LHS that map to the same family', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   SubA: A1, A2 ~~|
      //   SubB <-> SubA ~~|
      //   x[SubA] = 1, 2 ~~|
      //   y[SubA, SubB] = x[SubA] + x[SubB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="SubA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="SubB">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="SubA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="SubA"/>
    <dim name="SubB"/>
  </dimensions>
  <eqn>x[SubA] + x[SubB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1]', '1', {
          refId: '_x[_a1]',
          subscripts: ['_a1'],
          varType: 'const'
        }),
        v('x[A2]', '2', {
          refId: '_x[_a2]',
          subscripts: ['_a2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_a1,_a1], '_x', ['_suba'])
        //   -> ['_x[_a1]']
        // expandedRefIdsForVar(_y[_a1,_a1], '_x', ['_subb'])
        //   -> ['_x[_a1]']
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a1,_a1]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a1', '_a1'],
          references: ['_x[_a1]']
        }),
        // expandedRefIdsForVar(_y[_a1,_a2], '_x', ['_suba'])
        //   -> ['_x[_a1]']
        // expandedRefIdsForVar(_y[_a1,_a2], '_x', ['_subb'])
        //   -> ['_x[_a2]']
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a1,_a2]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a1', '_a2'],
          references: ['_x[_a1]', '_x[_a2]']
        }),
        // expandedRefIdsForVar(_y[_a2,_a1], '_x', ['_suba'])
        //   -> ['_x[_a2]']
        // expandedRefIdsForVar(_y[_a2,_a1], '_x', ['_subb'])
        //   -> ['_x[_a1]']
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a2,_a1]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a2', '_a1'],
          references: ['_x[_a2]', '_x[_a1]']
        }),
        // expandedRefIdsForVar(_y[_a2,_a2], '_x', ['_suba'])
        //   -> ['_x[_a2]']
        // expandedRefIdsForVar(_y[_a2,_a2], '_x', ['_subb'])
        //   -> ['_x[_a2]']
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a2,_a2]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a2', '_a2'],
          references: ['_x[_a2]']
        })
      ])
    })

    // This test is based on the example from #179 (simplified to use subdimensions to ensure separation).
    // It is similar to the previous one, except in this one, `x` is apply-to-all (and refers to the parent
    // dimension).
    it('should work when RHS variable is apply-to-all (1D) and is accessed with 2 different dimensions from LHS that map to the same family', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2, A3 ~~|
      //   SubA: A1, A2 ~~|
      //   SubB <-> SubA ~~|
      //   x[DimA] = 1 ~~|
      //   y[SubA, SubB] = x[SubA] + x[SubB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="SubA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="SubB">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="SubA"/>
    <dim name="SubB"/>
  </dimensions>
  <eqn>x[SubA] + x[SubB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA]', '1', {
          refId: '_x',
          subscripts: ['_dima'],
          varType: 'const'
        }),
        // For all 4 instances of `y`, the following should hold true:
        // expandedRefIdsForVar(_y[_aN,_aN], '_x', ['_suba'])
        //   -> ['_x']
        // expandedRefIdsForVar(_y[_aN,_aN], '_x', ['_subb'])
        //   -> ['_x']
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a1,_a1]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a1', '_a1'],
          references: ['_x']
        }),
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a1,_a2]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a1', '_a2'],
          references: ['_x']
        }),
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a2,_a1]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a2', '_a1'],
          references: ['_x']
        }),
        v('y[SubA,SubB]', 'x[SubA]+x[SubB]', {
          refId: '_y[_a2,_a2]',
          separationDims: ['_suba', '_subb'],
          subscripts: ['_a2', '_a2'],
          references: ['_x']
        })
      ])
    })
  })

  describe('when LHS is apply-to-all (3D)', () => {
    it('should work when RHS variable is apply-to-all (3D) and is accessed with same dimensions that appear in LHS (but in a different order)', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   DimC: C1, C2 ~~|
      //   x[DimA, DimC, DimB] = 1 ~~|
      //   y[DimC, DimB, DimA] = x[DimA, DimC, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
<dim name="DimC">
  <elem name="C1"/>
  <elem name="C2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimC"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimC"/>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA, DimC, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimC,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimc', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima', '_dimc', '_dimb'])
        //   -> ['_x']
        v('y[DimC,DimB,DimA]', 'x[DimA,DimC,DimB]', {
          refId: '_y',
          subscripts: ['_dimc', '_dimb', '_dima'],
          references: ['_x']
        })
      ])
    })

    it('should work when RHS variable is NON-apply-to-all (3D) and is accessed with same dimensions that appear in LHS (but in a different order)', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   DimC: C1, C2 ~~|
      //   x[DimA, C1, DimB] = 1 ~~|
      //   x[DimA, C2, DimB] = 2 ~~|
      //   y[DimC, DimB, DimA] = x[DimA, DimC, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
<dim name="DimC">
  <elem name="C1"/>
  <elem name="C2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimC"/>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="DimA,C1,DimB">
    <eqn>1</eqn>
  </element>
  <element subscript="DimA,C2,DimB">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimC"/>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA, DimC, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,C1,DimB]', '1', {
          refId: '_x[_dima,_c1,_dimb]',
          subscripts: ['_dima', '_c1', '_dimb'],
          varType: 'const'
        }),
        v('x[DimA,C2,DimB]', '2', {
          refId: '_x[_dima,_c2,_dimb]',
          subscripts: ['_dima', '_c2', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y, '_x', ['_dima', '_dimc', '_dimb'])
        //   -> ['_x[_dima,_c1,_dimb]', '_x[_dima,_c2,_dimb]']
        v('y[DimC,DimB,DimA]', 'x[DimA,DimC,DimB]', {
          refId: '_y',
          subscripts: ['_dimc', '_dimb', '_dima'],
          references: ['_x[_dima,_c1,_dimb]', '_x[_dima,_c2,_dimb]']
        })
      ])
    })
  })

  describe('when LHS is NON-apply-to-all (3D)', () => {
    it('should work when RHS variable is apply-to-all (3D) and is accessed with same dimensions that appear in LHS (but in a different order)', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   DimA: A1, A2 ~~|
      //   DimB: B1, B2 ~~|
      //   DimC: C1, C2, C3 ~~|
      //   SubC: C2, C3 ~~|
      //   x[DimA, DimC, DimB] = 1 ~~|
      //   y[SubC, DimB, DimA] = x[DimA, SubC, DimB] ~~|
      // `)

      const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
<dim name="DimC">
  <elem name="C1"/>
  <elem name="C2"/>
  <elem name="C3"/>
</dim>
<dim name="SubC">
  <elem name="C2"/>
  <elem name="C3"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimC"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>1</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="SubC"/>
    <dim name="DimB"/>
    <dim name="DimA"/>
  </dimensions>
  <eqn>x[DimA, SubC, DimB]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[DimA,DimC,DimB]', '1', {
          refId: '_x',
          subscripts: ['_dima', '_dimc', '_dimb'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_y[_c2,_dimb,_dima], '_x', ['_dima', '_dimc', '_dimb'])
        //   -> ['_x']
        v('y[SubC,DimB,DimA]', 'x[DimA,SubC,DimB]', {
          refId: '_y[_c2,_dimb,_dima]',
          separationDims: ['_subc'],
          subscripts: ['_c2', '_dimb', '_dima'],
          references: ['_x']
        }),
        // expandedRefIdsForVar(_y[_c3,_dimb,_dima], '_x', ['_dima', '_dimc', '_dimb'])
        //   -> ['_x']
        v('y[SubC,DimB,DimA]', 'x[DimA,SubC,DimB]', {
          refId: '_y[_c3,_dimb,_dima]',
          separationDims: ['_subc'],
          subscripts: ['_c3', '_dimb', '_dima'],
          references: ['_x']
        })
      ])
    })

    // This test is based on the example from #278
    it('should work when RHS variable is NON-apply-to-all (2D) and is accessed with 2 different dimensions from LHS that map to the same family', () => {
      // Equivalent Vensim model for reference:
      // const vars = readInlineModel(`
      //   Scenario: S1, S2 ~~|
      //   Sector: A1, A2, A3 ~~|
      //   Supplying Sector: A1, A2 -> Producing Sector ~~|
      //   Producing Sector: A1, A2 -> Supplying Sector ~~|
      //   x[A1,A1] = 101 ~~|
      //   x[A1,A2] = 102 ~~|
      //   x[A1,A3] = 103 ~~|
      //   x[A2,A1] = 201 ~~|
      //   x[A2,A2] = 202 ~~|
      //   x[A2,A3] = 203 ~~|
      //   x[A3,A1] = 301 ~~|
      //   x[A3,A2] = 302 ~~|
      //   x[A3,A3] = 303 ~~|
      //   y[S1] = 1000 ~~|
      //   y[S2] = 2000 ~~|
      //   z[Scenario, Supplying Sector, Producing Sector] =
      //     y[Scenario] + x[Supplying Sector, Producing Sector]
      //     ~~|
      // `)

      const xmileDims = `\
<dim name="Scenario">
  <elem name="S1"/>
  <elem name="S2"/>
</dim>
<dim name="Sector">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="Supplying Sector">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="Producing Sector">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
      const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="Sector"/>
    <dim name="Sector"/>
  </dimensions>
  <element subscript="A1,A1">
    <eqn>101</eqn>
  </element>
  <element subscript="A1,A2">
    <eqn>102</eqn>
  </element>
  <element subscript="A1,A3">
    <eqn>103</eqn>
  </element>
  <element subscript="A2,A1">
    <eqn>201</eqn>
  </element>
  <element subscript="A2,A2">
    <eqn>202</eqn>
  </element>
  <element subscript="A2,A3">
    <eqn>203</eqn>
  </element>
  <element subscript="A3,A1">
    <eqn>301</eqn>
  </element>
  <element subscript="A3,A2">
    <eqn>302</eqn>
  </element>
  <element subscript="A3,A3">
    <eqn>303</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="Scenario"/>
  </dimensions>
  <element subscript="S1">
    <eqn>1000</eqn>
  </element>
  <element subscript="S2">
    <eqn>2000</eqn>
  </element>
</aux>
<aux name="z">
  <dimensions>
    <dim name="Scenario"/>
    <dim name="Supplying Sector"/>
    <dim name="Producing Sector"/>
  </dimensions>
  <eqn>y[Scenario] + x[Supplying Sector, Producing Sector]</eqn>
</aux>`
      const mdl = xmile(xmileDims, xmileVars)
      const vars = readInlineModel(mdl)
      expect(vars).toEqual([
        v('x[A1,A1]', '101', {
          refId: '_x[_a1,_a1]',
          subscripts: ['_a1', '_a1'],
          varType: 'const'
        }),
        v('x[A1,A2]', '102', {
          refId: '_x[_a1,_a2]',
          subscripts: ['_a1', '_a2'],
          varType: 'const'
        }),
        v('x[A1,A3]', '103', {
          refId: '_x[_a1,_a3]',
          subscripts: ['_a1', '_a3'],
          varType: 'const'
        }),
        v('x[A2,A1]', '201', {
          refId: '_x[_a2,_a1]',
          subscripts: ['_a2', '_a1'],
          varType: 'const'
        }),
        v('x[A2,A2]', '202', {
          refId: '_x[_a2,_a2]',
          subscripts: ['_a2', '_a2'],
          varType: 'const'
        }),
        v('x[A2,A3]', '203', {
          refId: '_x[_a2,_a3]',
          subscripts: ['_a2', '_a3'],
          varType: 'const'
        }),
        v('x[A3,A1]', '301', {
          refId: '_x[_a3,_a1]',
          subscripts: ['_a3', '_a1'],
          varType: 'const'
        }),
        v('x[A3,A2]', '302', {
          refId: '_x[_a3,_a2]',
          subscripts: ['_a3', '_a2'],
          varType: 'const'
        }),
        v('x[A3,A3]', '303', {
          refId: '_x[_a3,_a3]',
          subscripts: ['_a3', '_a3'],
          varType: 'const'
        }),
        v('y[S1]', '1000', {
          refId: '_y[_s1]',
          subscripts: ['_s1'],
          varType: 'const'
        }),
        v('y[S2]', '2000', {
          refId: '_y[_s2]',
          subscripts: ['_s2'],
          varType: 'const'
        }),
        // expandedRefIdsForVar(_z[_scenario,_a1,_a1], '_y', ['_scenario'])
        //   -> ['_y[_s1]', '_y[_s2]']
        // expandedRefIdsForVar(_z[_scenario,_a1,_a1], '_x', ['_supplying_sector', '_producing_sector'])
        //   -> ['_x[_a1,_a1]']
        v('z[Scenario,Supplying Sector,Producing Sector]', 'y[Scenario]+x[Supplying Sector,Producing Sector]', {
          refId: '_z[_scenario,_a1,_a1]',
          subscripts: ['_scenario', '_a1', '_a1'],
          separationDims: ['_supplying_sector', '_producing_sector'],
          references: ['_y[_s1]', '_y[_s2]', '_x[_a1,_a1]'],
          varType: 'aux'
        }),
        // expandedRefIdsForVar(_z[_scenario,_a1,_a2], '_x', ['_supplying_sector', '_producing_sector'])
        //   -> ['_x[_a1,_a2]']
        v('z[Scenario,Supplying Sector,Producing Sector]', 'y[Scenario]+x[Supplying Sector,Producing Sector]', {
          refId: '_z[_scenario,_a1,_a2]',
          subscripts: ['_scenario', '_a1', '_a2'],
          separationDims: ['_supplying_sector', '_producing_sector'],
          references: ['_y[_s1]', '_y[_s2]', '_x[_a1,_a2]'],
          varType: 'aux'
        }),
        // expandedRefIdsForVar(_z[_scenario,_a2,_a1], '_x', ['_supplying_sector', '_producing_sector'])
        //   -> ['_x[_a2,_a1]']
        v('z[Scenario,Supplying Sector,Producing Sector]', 'y[Scenario]+x[Supplying Sector,Producing Sector]', {
          refId: '_z[_scenario,_a2,_a1]',
          subscripts: ['_scenario', '_a2', '_a1'],
          separationDims: ['_supplying_sector', '_producing_sector'],
          references: ['_y[_s1]', '_y[_s2]', '_x[_a2,_a1]'],
          varType: 'aux'
        }),
        // expandedRefIdsForVar(_z[_scenario,_a2,_a2], '_x', ['_supplying_sector', '_producing_sector'])
        //   -> ['_x[_a2,_a2]']
        v('z[Scenario,Supplying Sector,Producing Sector]', 'y[Scenario]+x[Supplying Sector,Producing Sector]', {
          refId: '_z[_scenario,_a2,_a2]',
          subscripts: ['_scenario', '_a2', '_a2'],
          separationDims: ['_supplying_sector', '_producing_sector'],
          references: ['_y[_s1]', '_y[_s2]', '_x[_a2,_a2]'],
          varType: 'aux'
        })
      ])
    })
  })

  //
  // NOTE: This is the end of the "should work for {0,1,2,3}D variable" tests.
  //

  // TODO: This test is skipped because Stella doesn't appear to include the ACTIVE INITIAL function
  it.skip('should work for ACTIVE INITIAL function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   Initial Target Capacity = 1 ~~|
    //   Capacity = 2 ~~|
    //   Target Capacity = ACTIVE INITIAL(Capacity, Initial Target Capacity) ~~|
    // `)

    const xmileVars = `\
<aux name="Initial Target Capacity">
  <eqn>1</eqn>
</aux>
<aux name="Capacity">
  <eqn>2</eqn>
</aux>
<aux name="Target Capacity">
  <eqn>ACTIVE INITIAL(Capacity, Initial Target Capacity)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  // TODO: This test is skipped for now; in Stella, the function is called `ALLOCATE` and we will need to see
  // if the Vensim `ALLOCATE AVAILABLE` function is compatible enough
  it.skip('should work for ALLOCATE AVAILABLE function (1D LHS, 1D demand, 2D pp, non-subscripted avail)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   branch: Boston, Dayton ~~|
    //   pprofile: ptype, ppriority ~~|
    //   supply available = 200 ~~|
    //   demand[branch] = 500,300 ~~|
    //   priority[Boston,pprofile] = 1,5 ~~|
    //   priority[Dayton,pprofile] = 1,7 ~~|
    //   shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[branch,ptype], supply available) ~~|
    // `)

    const xmileDims = `\
<dim name="branch">
  <elem name="Boston"/>
  <elem name="Dayton"/>
</dim>
<dim name="pprofile">
  <elem name="ptype"/>
  <elem name="ppriority"/>
</dim>
`
    const xmileVars = `\
<aux name="supply available">
  <eqn>200</eqn>
</aux>
<aux name="demand">
  <dimensions>
    <dim name="branch"/>
  </dimensions>
  <element subscript="Boston">
    <eqn>500</eqn>
  </element>
  <element subscript="Dayton">
    <eqn>300</eqn>
  </element>
</aux>
<aux name="priority">
  <dimensions>
    <dim name="branch"/>
    <dim name="pprofile"/>
  </dimensions>
  <element subscript="Boston,ptype">
    <eqn>1</eqn>
  </element>
  <element subscript="Boston,ppriority">
    <eqn>5</eqn>
  </element>
  <element subscript="Dayton,ptype">
    <eqn>1</eqn>
  </element>
  <element subscript="Dayton,ppriority">
    <eqn>7</eqn>
  </element>
</aux>
<aux name="shipments">
  <dimensions>
    <dim name="branch"/>
  </dimensions>
  <eqn>ALLOCATE AVAILABLE(demand[branch], priority[branch,ptype], supply available)</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
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
          '_priority[_boston,_ptype]',
          '_priority[_dayton,_ptype]',
          '_priority[_boston,_ppriority]',
          '_priority[_dayton,_ppriority]',
          '_supply_available'
        ],
        subscripts: ['_branch']
      })
    ])
  })

  // TODO: This test is skipped for now; in Stella, the function is called `ALLOCATE` and we will need to see
  // if the Vensim `ALLOCATE AVAILABLE` function is compatible enough
  it.skip('should work for ALLOCATE AVAILABLE function (1D LHS, 1D demand, 3D pp with specific first subscript, non-subscripted avail)', () => {
    const vars = readInlineModel(`
      branch: Boston, Dayton, Fresno ~~|
      item: Item1, Item2 ~~|
      pprofile: ptype, ppriority ~~|
      supply available = 200 ~~|
      demand[branch] = 500,300,750 ~~|
      priority[Item1,Boston,pprofile] = 3,5 ~~|
      priority[Item1,Dayton,pprofile] = 3,7 ~~|
      priority[Item1,Fresno,pprofile] = 3,3 ~~|
      priority[Item2,Boston,pprofile] = 3,6 ~~|
      priority[Item2,Dayton,pprofile] = 3,8 ~~|
      priority[Item2,Fresno,pprofile] = 3,4 ~~|
      item 1 shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[Item1,branch,ptype], supply available) ~~|
      item 2 shipments[branch] = ALLOCATE AVAILABLE(demand[branch], priority[Item2,branch,ptype], supply available) ~~|
    `)
    expect(vars).toEqual([
      v('supply available', '200', {
        refId: '_supply_available',
        varType: 'const'
      }),
      v('demand[branch]', '500,300,750', {
        refId: '_demand[_boston]',
        separationDims: ['_branch'],
        subscripts: ['_boston'],
        varType: 'const'
      }),
      v('demand[branch]', '500,300,750', {
        refId: '_demand[_dayton]',
        separationDims: ['_branch'],
        subscripts: ['_dayton'],
        varType: 'const'
      }),
      v('demand[branch]', '500,300,750', {
        refId: '_demand[_fresno]',
        separationDims: ['_branch'],
        subscripts: ['_fresno'],
        varType: 'const'
      }),
      v('priority[Item1,Boston,pprofile]', '3,5', {
        refId: '_priority[_item1,_boston,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_boston', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item1,Boston,pprofile]', '3,5', {
        refId: '_priority[_item1,_boston,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_boston', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item1,Dayton,pprofile]', '3,7', {
        refId: '_priority[_item1,_dayton,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_dayton', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item1,Dayton,pprofile]', '3,7', {
        refId: '_priority[_item1,_dayton,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_dayton', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item1,Fresno,pprofile]', '3,3', {
        refId: '_priority[_item1,_fresno,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_fresno', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item1,Fresno,pprofile]', '3,3', {
        refId: '_priority[_item1,_fresno,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_fresno', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item2,Boston,pprofile]', '3,6', {
        refId: '_priority[_item2,_boston,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_boston', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item2,Boston,pprofile]', '3,6', {
        refId: '_priority[_item2,_boston,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_boston', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item2,Dayton,pprofile]', '3,8', {
        refId: '_priority[_item2,_dayton,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_dayton', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item2,Dayton,pprofile]', '3,8', {
        refId: '_priority[_item2,_dayton,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_dayton', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item2,Fresno,pprofile]', '3,4', {
        refId: '_priority[_item2,_fresno,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_fresno', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item2,Fresno,pprofile]', '3,4', {
        refId: '_priority[_item2,_fresno,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_fresno', '_ppriority'],
        varType: 'const'
      }),
      v(
        'item 1 shipments[branch]',
        'ALLOCATE AVAILABLE(demand[branch],priority[Item1,branch,ptype],supply available)',
        {
          refId: '_item_1_shipments',
          referencedFunctionNames: ['__allocate_available'],
          references: [
            '_demand[_boston]',
            '_demand[_dayton]',
            '_demand[_fresno]',
            '_priority[_item1,_boston,_ptype]',
            '_priority[_item1,_dayton,_ptype]',
            '_priority[_item1,_fresno,_ptype]',
            '_priority[_item1,_boston,_ppriority]',
            '_priority[_item1,_dayton,_ppriority]',
            '_priority[_item1,_fresno,_ppriority]',
            '_supply_available'
          ],
          subscripts: ['_branch']
        }
      ),
      v(
        'item 2 shipments[branch]',
        'ALLOCATE AVAILABLE(demand[branch],priority[Item2,branch,ptype],supply available)',
        {
          refId: '_item_2_shipments',
          referencedFunctionNames: ['__allocate_available'],
          references: [
            '_demand[_boston]',
            '_demand[_dayton]',
            '_demand[_fresno]',
            '_priority[_item2,_boston,_ptype]',
            '_priority[_item2,_dayton,_ptype]',
            '_priority[_item2,_fresno,_ptype]',
            '_priority[_item2,_boston,_ppriority]',
            '_priority[_item2,_dayton,_ppriority]',
            '_priority[_item2,_fresno,_ppriority]',
            '_supply_available'
          ],
          subscripts: ['_branch']
        }
      )
    ])
  })

  // TODO: This test is skipped for now; in Stella, the function is called `ALLOCATE` and we will need to see
  // if the Vensim `ALLOCATE AVAILABLE` function is compatible enough
  it.skip('should work for ALLOCATE AVAILABLE function (2D LHS, 2D demand, 2D pp, non-subscripted avail)', () => {
    const vars = readInlineModel(`
      branch: Boston, Dayton, Fresno ~~|
      item: Item1, Item2 ~~|
      pprofile: ptype, ppriority ~~|
      supply available = 200 ~~|
      demand[item,branch] = 500,300,750;501,301,751; ~~|
      priority[Boston,pprofile] = 3,5 ~~|
      priority[Dayton,pprofile] = 3,7 ~~|
      priority[Fresno,pprofile] = 3,3 ~~|
      shipments[item,branch] = ALLOCATE AVAILABLE(demand[item,branch], priority[branch,ptype], supply available) ~~|
    `)
    expect(vars).toEqual([
      v('supply available', '200', {
        refId: '_supply_available',
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item1,_boston]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item1', '_boston'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item1,_dayton]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item1', '_dayton'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item1,_fresno]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item1', '_fresno'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item2,_boston]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item2', '_boston'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item2,_dayton]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item2', '_dayton'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item2,_fresno]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item2', '_fresno'],
        varType: 'const'
      }),
      v('priority[Boston,pprofile]', '3,5', {
        refId: '_priority[_boston,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_boston', '_ptype'],
        varType: 'const'
      }),
      v('priority[Boston,pprofile]', '3,5', {
        refId: '_priority[_boston,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_boston', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Dayton,pprofile]', '3,7', {
        refId: '_priority[_dayton,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_dayton', '_ptype'],
        varType: 'const'
      }),
      v('priority[Dayton,pprofile]', '3,7', {
        refId: '_priority[_dayton,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_dayton', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Fresno,pprofile]', '3,3', {
        refId: '_priority[_fresno,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_fresno', '_ptype'],
        varType: 'const'
      }),
      v('priority[Fresno,pprofile]', '3,3', {
        refId: '_priority[_fresno,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_fresno', '_ppriority'],
        varType: 'const'
      }),
      v('shipments[item,branch]', 'ALLOCATE AVAILABLE(demand[item,branch],priority[branch,ptype],supply available)', {
        refId: '_shipments',
        referencedFunctionNames: ['__allocate_available'],
        references: [
          '_demand[_item1,_boston]',
          '_demand[_item1,_dayton]',
          '_demand[_item1,_fresno]',
          '_demand[_item2,_boston]',
          '_demand[_item2,_dayton]',
          '_demand[_item2,_fresno]',
          '_priority[_boston,_ptype]',
          '_priority[_dayton,_ptype]',
          '_priority[_fresno,_ptype]',
          '_priority[_boston,_ppriority]',
          '_priority[_dayton,_ppriority]',
          '_priority[_fresno,_ppriority]',
          '_supply_available'
        ],
        subscripts: ['_item', '_branch']
      })
    ])
  })

  // TODO: This test is skipped for now; in Stella, the function is called `ALLOCATE` and we will need to see
  // if the Vensim `ALLOCATE AVAILABLE` function is compatible enough
  it.skip('should work for ALLOCATE AVAILABLE function (2D LHS, 2D demand, 3D pp, 1D avail)', () => {
    const vars = readInlineModel(`
      branch: Boston, Dayton, Fresno ~~|
      item: Item1, Item2 ~~|
      pprofile: ptype, ppriority ~~|
      supply available[item] = 200,400 ~~|
      demand[item,branch] = 500,300,750;501,301,751; ~~|
      priority[Item1,Boston,pprofile] = 3,5 ~~|
      priority[Item1,Dayton,pprofile] = 3,7 ~~|
      priority[Item1,Fresno,pprofile] = 3,3 ~~|
      priority[Item2,Boston,pprofile] = 3,6 ~~|
      priority[Item2,Dayton,pprofile] = 3,8 ~~|
      priority[Item2,Fresno,pprofile] = 3,4 ~~|
      shipments[item,branch] = ALLOCATE AVAILABLE(demand[item,branch], priority[item,branch,ptype], supply available[item]) ~~|
    `)
    expect(vars).toEqual([
      v('supply available[item]', '200,400', {
        refId: '_supply_available[_item1]',
        separationDims: ['_item'],
        subscripts: ['_item1'],
        varType: 'const'
      }),
      v('supply available[item]', '200,400', {
        refId: '_supply_available[_item2]',
        separationDims: ['_item'],
        subscripts: ['_item2'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item1,_boston]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item1', '_boston'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item1,_dayton]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item1', '_dayton'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item1,_fresno]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item1', '_fresno'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item2,_boston]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item2', '_boston'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item2,_dayton]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item2', '_dayton'],
        varType: 'const'
      }),
      v('demand[item,branch]', '500,300,750;501,301,751;', {
        refId: '_demand[_item2,_fresno]',
        separationDims: ['_item', '_branch'],
        subscripts: ['_item2', '_fresno'],
        varType: 'const'
      }),
      v('priority[Item1,Boston,pprofile]', '3,5', {
        refId: '_priority[_item1,_boston,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_boston', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item1,Boston,pprofile]', '3,5', {
        refId: '_priority[_item1,_boston,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_boston', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item1,Dayton,pprofile]', '3,7', {
        refId: '_priority[_item1,_dayton,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_dayton', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item1,Dayton,pprofile]', '3,7', {
        refId: '_priority[_item1,_dayton,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_dayton', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item1,Fresno,pprofile]', '3,3', {
        refId: '_priority[_item1,_fresno,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_fresno', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item1,Fresno,pprofile]', '3,3', {
        refId: '_priority[_item1,_fresno,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item1', '_fresno', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item2,Boston,pprofile]', '3,6', {
        refId: '_priority[_item2,_boston,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_boston', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item2,Boston,pprofile]', '3,6', {
        refId: '_priority[_item2,_boston,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_boston', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item2,Dayton,pprofile]', '3,8', {
        refId: '_priority[_item2,_dayton,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_dayton', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item2,Dayton,pprofile]', '3,8', {
        refId: '_priority[_item2,_dayton,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_dayton', '_ppriority'],
        varType: 'const'
      }),
      v('priority[Item2,Fresno,pprofile]', '3,4', {
        refId: '_priority[_item2,_fresno,_ptype]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_fresno', '_ptype'],
        varType: 'const'
      }),
      v('priority[Item2,Fresno,pprofile]', '3,4', {
        refId: '_priority[_item2,_fresno,_ppriority]',
        separationDims: ['_pprofile'],
        subscripts: ['_item2', '_fresno', '_ppriority'],
        varType: 'const'
      }),
      v(
        'shipments[item,branch]',
        'ALLOCATE AVAILABLE(demand[item,branch],priority[item,branch,ptype],supply available[item])',
        {
          refId: '_shipments',
          referencedFunctionNames: ['__allocate_available'],
          references: [
            '_demand[_item1,_boston]',
            '_demand[_item1,_dayton]',
            '_demand[_item1,_fresno]',
            '_demand[_item2,_boston]',
            '_demand[_item2,_dayton]',
            '_demand[_item2,_fresno]',
            '_priority[_item1,_boston,_ptype]',
            '_priority[_item1,_dayton,_ptype]',
            '_priority[_item1,_fresno,_ptype]',
            '_priority[_item2,_boston,_ptype]',
            '_priority[_item2,_dayton,_ptype]',
            '_priority[_item2,_fresno,_ptype]',
            '_priority[_item1,_boston,_ppriority]',
            '_priority[_item1,_dayton,_ppriority]',
            '_priority[_item1,_fresno,_ppriority]',
            '_priority[_item2,_boston,_ppriority]',
            '_priority[_item2,_dayton,_ppriority]',
            '_priority[_item2,_fresno,_ppriority]',
            '_supply_available[_item1]',
            '_supply_available[_item2]'
          ],
          subscripts: ['_item', '_branch']
        }
      )
    ])
  })

  it('should work for DELAY1 function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = DELAY1(x, 5) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>DELAY1(x, 5)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  it('should work for DELAY1 function (with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   init = 2 ~~|
    //   y = DELAY1I(x, 5, init) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="init">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>DELAY1(x, 5, init)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('init', '2', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'DELAY1(x,5,init)', {
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

  it('should work for DELAY1 function (with initial value argument and subscripted variables)', () => {
    // Note that we have a mix of non-apply-to-all (input, delay) and apply-to-all (init)
    // variables here to cover both cases
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   input[DimA] = 10, 20, 30 ~~|
    //   delay[DimA] = 1, 2, 3 ~~|
    //   init[DimA] = 0 ~~|
    //   y[DimA] = DELAY1I(input[DimA], delay[DimA], init[DimA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
    const xmileVars = `\
<aux name="input">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
  <element subscript="A3">
    <eqn>30</eqn>
  </element>
</aux>
<aux name="delay">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>DELAY1(input[DimA], delay[DimA], init[DimA])</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('input[A1]', '10', {
        refId: '_input[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[A2]', '20', {
        refId: '_input[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input[A3]', '30', {
        refId: '_input[_a3]',
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay[A1]', '1', {
        refId: '_delay[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[A2]', '2', {
        refId: '_delay[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[A3]', '3', {
        refId: '_delay[_a3]',
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[DimA]', 'DELAY1(input[DimA],delay[DimA],init[DimA])', {
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

  // TODO: This test is not exactly equivalent to the Vensim one since it uses separated definitions
  // for y[A1] and y[A2] instead of a single definition for y[SubA]
  it.skip('should work for DELAY1 function (with separated variables using subdimension)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   SubA: A2, A3 ~~|
    //   input[DimA] = 10, 20, 30 ~~|
    //   delay[DimA] = 1, 2, 3 ~~|
    //   init[DimA] = 0 ~~|
    //   y[A1] = 5 ~~|
    //   y[SubA] = DELAY1I(input[SubA], delay[SubA], init[SubA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="SubA">
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
    const xmileVars = `\
<aux name="input">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
  <element subscript="A3">
    <eqn>30</eqn>
  </element>
</aux>
<aux name="delay">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>5</eqn>
  </element>
  <element subscript="A2">
    <eqn>DELAY1(input[A2], delay[A2], init[A2])</eqn>
  </element>
  <element subscript="A3">
    <eqn>DELAY1(input[A3], delay[A3], init[A3])</eqn>
  </element>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('input[A1]', '10', {
        refId: '_input[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[A2]', '20', {
        refId: '_input[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input[A3]', '30', {
        refId: '_input[_a3]',
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay[A1]', '1', {
        refId: '_delay[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[A2]', '2', {
        refId: '_delay[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[A3]', '3', {
        refId: '_delay[_a3]',
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
      v('y[A2]', 'DELAY1(input[A2],delay[A2],init[A2])', {
        delayTimeVarName: '__aux1',
        delayVarRefId: '__level_y_1[_a2]',
        refId: '_y[_a2]',
        references: ['__level_y_1[_a2]', '__aux1[_a2]'],
        separationDims: ['_suba'],
        subscripts: ['_a2']
      }),
      v('y[A3]', 'DELAY1(input[A3],delay[A3],init[A3])', {
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   delay = 2 ~~|
    //   y = DELAY3(input, delay) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>DELAY3(input, delay)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  it('should work for DELAY3 function (with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   delay = 2 ~~|
    //   init = 3 ~~|
    //   y = DELAY3I(input, delay, init) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="init">
  <eqn>3</eqn>
</aux>
<aux name="y">
  <eqn>DELAY3(input, delay, init)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
      v('y', 'DELAY3(input,delay,init)', {
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

  it('should work for DELAY3I function (with initial value argument and nested function calls)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   delay = 2 ~~|
    //   init = 3 ~~|
    //   y = DELAY3I(MIN(0, input), MAX(0, delay), ABS(init)) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="init">
  <eqn>3</eqn>
</aux>
<aux name="y">
  <eqn>DELAY3(MIN(0, input), MAX(0, delay), ABS(init))</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
      v('y', 'DELAY3(MIN(0,input),MAX(0,delay),ABS(init))', {
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

  it('should work for DELAY3 function (with initial value argument and subscripted variables)', () => {
    // Note that we have a mix of non-apply-to-all (input, delay) and apply-to-all (init)
    // variables here to cover both cases
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   input[DimA] = 10, 20, 30 ~~|
    //   delay[DimA] = 1, 2, 3 ~~|
    //   init[DimA] = 0 ~~|
    //   y[DimA] = DELAY3I(input[DimA], delay[DimA], init[DimA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
    const xmileVars = `\
<aux name="input">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
  <element subscript="A3">
    <eqn>30</eqn>
  </element>
</aux>
<aux name="delay">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>DELAY3(input[DimA], delay[DimA], init[DimA])</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('input[A1]', '10', {
        refId: '_input[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[A2]', '20', {
        refId: '_input[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('input[A3]', '30', {
        refId: '_input[_a3]',
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('delay[A1]', '1', {
        refId: '_delay[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[A2]', '2', {
        refId: '_delay[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('delay[A3]', '3', {
        refId: '_delay[_a3]',
        subscripts: ['_a3'],
        varType: 'const'
      }),
      v('init[DimA]', '0', {
        refId: '_init',
        subscripts: ['_dima'],
        varType: 'const'
      }),
      v('y[DimA]', 'DELAY3(input[DimA],delay[DimA],init[DimA])', {
        delayTimeVarName: '__aux4',
        delayVarRefId: '__level3',
        refId: '_y',
        references: ['__level3', '__level2', '__level1', '__aux4[_dima]'], // TODO: The last one is suspicious
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

  // TODO: This test is not exactly equivalent to the Vensim one since it uses separated definitions
  // for y[A1] and y[A2] instead of a single definition for y[SubA]
  it.skip('should work for DELAY3I function (with separated variables using subdimension)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2, A3 ~~|
    //   SubA: A2, A3 ~~|
    //   input[DimA] = 10, 20, 30 ~~|
    //   delay[DimA] = 1, 2, 3 ~~|
    //   init[DimA] = 0 ~~|
    //   y[A1] = 5 ~~|
    //   y[SubA] = DELAY3I(input[SubA], delay[SubA], init[SubA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
<dim name="SubA">
  <elem name="A2"/>
  <elem name="A3"/>
</dim>
`
    const xmileVars = `\
<aux name="input">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>10</eqn>
  </element>
  <element subscript="A2">
    <eqn>20</eqn>
  </element>
  <element subscript="A3">
    <eqn>30</eqn>
  </element>
</aux>
<aux name="delay">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
  <element subscript="A3">
    <eqn>3</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>0</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>5</eqn>
  </element>
  <element subscript="A2">
    <eqn>DELAY3I(input[A2], delay[A2], init[A2])</eqn>
  </element>
  <element subscript="A3">
    <eqn>DELAY3I(input[A3], delay[A3], init[A3])</eqn>
  </element>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
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
        references: ['__aux_y_2[_a2]', '__aux_y_3[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_2[a2]', 'INTEG(_aux_y_1[a2]-_aux_y_2[a2],init[a2]*((delay[a2])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a2]'],
        refId: '__level_y_2[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_y_1[_a2]', '__aux_y_2[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_level_y_1[a2]', 'INTEG(input[a2]-_aux_y_1[a2],init[a2]*((delay[a2])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a2]'],
        refId: '__level_y_1[_a2]',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a2]', '__aux_y_1[_a2]'],
        subscripts: ['_a2'],
        varType: 'level'
      }),
      v('_aux_y_1[a2]', '_level_y_1[a2]/((delay[a2])/3)', {
        includeInOutput: false,
        refId: '__aux_y_1[_a2]',
        references: ['__level_y_1[_a2]', '_delay[_a2]'],
        subscripts: ['_a2']
      }),
      v('_aux_y_2[a2]', '_level_y_2[a2]/((delay[a2])/3)', {
        includeInOutput: false,
        refId: '__aux_y_2[_a2]',
        references: ['__level_y_2[_a2]', '_delay[_a2]'],
        subscripts: ['_a2']
      }),
      v('_aux_y_3[a2]', '_level_y_3[a2]/((delay[a2])/3)', {
        includeInOutput: false,
        refId: '__aux_y_3[_a2]',
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
        references: ['__aux_y_2[_a3]', '__aux_y_3[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_y_2[a3]', 'INTEG(_aux_y_1[a3]-_aux_y_2[a3],init[a3]*((delay[a3])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a3]'],
        refId: '__level_y_2[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['__aux_y_1[_a3]', '__aux_y_2[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_level_y_1[a3]', 'INTEG(input[a3]-_aux_y_1[a3],init[a3]*((delay[a3])/3))', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_init', '_delay[_a3]'],
        refId: '__level_y_1[_a3]',
        referencedFunctionNames: ['__integ'],
        references: ['_input[_a3]', '__aux_y_1[_a3]'],
        subscripts: ['_a3'],
        varType: 'level'
      }),
      v('_aux_y_1[a3]', '_level_y_1[a3]/((delay[a3])/3)', {
        includeInOutput: false,
        refId: '__aux_y_1[_a3]',
        references: ['__level_y_1[_a3]', '_delay[_a3]'],
        subscripts: ['_a3']
      }),
      v('_aux_y_2[a3]', '_level_y_2[a3]/((delay[a3])/3)', {
        includeInOutput: false,
        refId: '__aux_y_2[_a3]',
        references: ['__level_y_2[_a3]', '_delay[_a3]'],
        subscripts: ['_a3']
      }),
      v('_aux_y_3[a3]', '_level_y_3[a3]/((delay[a3])/3)', {
        includeInOutput: false,
        refId: '__aux_y_3[_a3]',
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

  // TODO: This test is skipped for now; in Stella, the DELAY function can be called with or
  // without an initial value argument, but the code that handles the Vensim DELAY FIXED function
  // currently assumes the initial value argument
  it.skip('should work for DELAY function (without initial value argument)', () => {})

  // TODO: This test is skipped for now because the code that handles Stella's DELAY function
  // will need to be updated to generate an internal level variable, since Stella's DELAY
  // does not necessarily have to follow the "=" like Vensim's DELAY FIXED function does
  it.skip('should work for DELAY function (with initial value argument)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = 2 ~~|
    //   delay = y + 5 ~~|
    //   init = 3 ~~|
    //   z = DELAY FIXED(x, delay, init) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>2</eqn>
</aux>
<aux name="delay">
  <eqn>y + 5</eqn>
</aux>
<aux name="init">
  <eqn>3</eqn>
</aux>
<aux name="z">
  <eqn>DELAY(x, delay, init)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
      v('z', 'DELAY(x,delay,init)', {
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

  // TODO: This test is skipped because Stella doesn't appear to include the DEPRECIATE STRAIGHTLINE function
  it.skip('should work for DEPRECIATE STRAIGHTLINE function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   dtime = 20 ~~|
    //   fisc = 1 ~~|
    //   init = 5 ~~|
    //   Capacity Cost = 1000 ~~|
    //   New Capacity = 2000 ~~|
    //   stream = Capacity Cost * New Capacity ~~|
    //   Depreciated Amount = DEPRECIATE STRAIGHTLINE(stream, dtime, fisc, init) ~~|
    // `)

    const xmileVars = `\
<aux name="dtime">
  <eqn>20</eqn>
</aux>
<aux name="fisc">
  <eqn>1</eqn>
</aux>
<aux name="init">
  <eqn>5</eqn>
</aux>
<aux name="Capacity Cost">
  <eqn>1000</eqn>
</aux>
<aux name="New Capacity">
  <eqn>2000</eqn>
</aux>
<aux name="stream">
  <eqn>Capacity Cost * New Capacity</eqn>
</aux>
<aux name="Depreciated Amount">
  <eqn>DEPRECIATE STRAIGHTLINE(stream, dtime, fisc, init)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  // TODO: This test is skipped because Stella doesn't appear to include the GAME function
  it.skip('should work for GAME function (no dimensions)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = GAME(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>GAME(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', 'GAME(x)', {
        gameLookupVarName: '_y_game_inputs',
        refId: '_y',
        referencedFunctionNames: ['__game'],
        referencedLookupVarNames: ['_y_game_inputs'],
        references: ['_x']
      }),
      v('y game inputs', '', {
        refId: '_y_game_inputs',
        varType: 'lookup',
        varSubtype: 'gameInputs'
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't appear to include the GAME function
  it.skip('should work for GAME function (1D)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   x[DimA] = 1, 2 ~~|
    //   y[DimA] = GAME(x[DimA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>GAME(x[DimA])</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x[A1]', '1', {
        refId: '_x[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('x[A2]', '2', {
        refId: '_x[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('y[DimA]', 'GAME(x[DimA])', {
        gameLookupVarName: '_y_game_inputs',
        refId: '_y',
        referencedFunctionNames: ['__game'],
        referencedLookupVarNames: ['_y_game_inputs'],
        references: ['_x[_a1]', '_x[_a2]'],
        subscripts: ['_dima']
      }),
      v('y game inputs[DimA]', '', {
        refId: '_y_game_inputs',
        subscripts: ['_dima'],
        varType: 'lookup',
        varSubtype: 'gameInputs'
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't appear to include the GAME function
  it.skip('should work for GAME function (2D)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   DimB: B1, B2 ~~|
    //   a[DimA] = 1, 2 ~~|
    //   b[DimB] = 1, 2 ~~|
    //   y[DimA, DimB] = GAME(a[DimA] + b[DimB]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
</dim>
`
    const xmileVars = `\
<aux name="a">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="b">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <element subscript="B1">
    <eqn>1</eqn>
  </element>
  <element subscript="B2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
    <dim name="DimB"/>
  </dimensions>
  <eqn>GAME(a[DimA] + b[DimB])</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('a[A1]', '1', {
        refId: '_a[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('a[A2]', '2', {
        refId: '_a[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('b[B1]', '1', {
        refId: '_b[_b1]',
        subscripts: ['_b1'],
        varType: 'const'
      }),
      v('b[B2]', '2', {
        refId: '_b[_b2]',
        subscripts: ['_b2'],
        varType: 'const'
      }),
      v('y[DimA,DimB]', 'GAME(a[DimA]+b[DimB])', {
        gameLookupVarName: '_y_game_inputs',
        refId: '_y',
        referencedFunctionNames: ['__game'],
        referencedLookupVarNames: ['_y_game_inputs'],
        references: ['_a[_a1]', '_a[_a2]', '_b[_b1]', '_b[_b2]'],
        subscripts: ['_dima', '_dimb']
      }),
      v('y game inputs[DimA,DimB]', '', {
        refId: '_y_game_inputs',
        subscripts: ['_dima', '_dimb'],
        varType: 'lookup',
        varSubtype: 'gameInputs'
      })
    ])
  })

  it('should work for GAMMALN function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 1 ~~|
    //   y = GAMMA LN(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>1</eqn>
</aux>
<aux name="y">
  <eqn>GAMMALN(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', '1', {
        refId: '_x',
        varType: 'const'
      }),
      v('y', 'GAMMALN(x)', {
        refId: '_y',
        referencedFunctionNames: ['__gammaln'],
        references: ['_x']
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't appear to include the GET DIRECT CONSTANTS function
  it.skip('should work for GET DIRECT CONSTANTS function (single value)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = GET DIRECT CONSTANTS('data/a.csv', ',', 'B2') ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>GET DIRECT CONSTANTS('data/a.csv', ',', 'B2')</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', "GET DIRECT CONSTANTS('data/a.csv',',','B2')", {
        directConstArgs: { file: 'data/a.csv', tab: ',', startCell: 'B2' },
        refId: '_x',
        varType: 'const'
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't appear to include the GET DIRECT CONSTANTS function
  it.skip('should work for GET DIRECT CONSTANTS function (1D)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimB: B1, B2, B3 ~~|
    //   x[DimB] = GET DIRECT CONSTANTS('data/b.csv', ',', 'B2*') ~~|
    // `)

    const xmileDims = `\
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
  <elem name="B3"/>
</dim>
`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimB"/>
  </dimensions>
  <eqn>GET DIRECT CONSTANTS('data/b.csv', ',', 'B2*')</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x[DimB]', "GET DIRECT CONSTANTS('data/b.csv',',','B2*')", {
        directConstArgs: { file: 'data/b.csv', tab: ',', startCell: 'B2*' },
        refId: '_x',
        subscripts: ['_dimb'],
        varType: 'const'
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't appear to include the GET DIRECT CONSTANTS function
  it.skip('should work for GET DIRECT CONSTANTS function (2D)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimB: B1, B2, B3 ~~|
    //   DimC: C1, C2 ~~|
    //   x[DimB, DimC] = GET DIRECT CONSTANTS('data/c.csv', ',', 'B2') ~~|
    // `)

    const xmileDims = `\
<dim name="DimB">
  <elem name="B1"/>
  <elem name="B2"/>
  <elem name="B3"/>
</dim>
<dim name="DimC">
  <elem name="C1"/>
  <elem name="C2"/>
</dim>
`
    const xmileVars = `\
<aux name="x">
  <dimensions>
    <dim name="DimB"/>
    <dim name="DimC"/>
  </dimensions>
  <eqn>GET DIRECT CONSTANTS('data/c.csv', ',', 'B2')</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x[DimB,DimC]', "GET DIRECT CONSTANTS('data/c.csv',',','B2')", {
        directConstArgs: { file: 'data/c.csv', tab: ',', startCell: 'B2' },
        refId: '_x',
        subscripts: ['_dimb', '_dimc'],
        varType: 'const'
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't include the GET DIRECT CONSTANTS function
  // and it would need to be updated to not use :EXCEPT:
  it.skip('should work for GET DIRECT CONSTANTS function (separate definitions)', () => {
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
        refId: '_x[_dimc,_a2]',
        separationDims: ['_suba'],
        subscripts: ['_dimc', '_a2'],
        varType: 'const'
      }),
      v('x[DimC,SubA]', "GET DIRECT CONSTANTS('data/f.csv',',','B2')", {
        directConstArgs: { file: 'data/f.csv', tab: ',', startCell: 'B2' },
        refId: '_x[_dimc,_a3]',
        separationDims: ['_suba'],
        subscripts: ['_dimc', '_a3'],
        varType: 'const'
      }),
      v('x[DimC,DimA]:EXCEPT:[DimC,SubA]', '0', {
        refId: '_x[_dimc,_a1]',
        separationDims: ['_dima'],
        subscripts: ['_dimc', '_a1'],
        varType: 'const'
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't include the GET DIRECT DATA function
  it.skip('should work for GET DIRECT DATA function (single value)', () => {
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

  it.skip('should work for GET DIRECT DATA function (1D)', () => {
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

  // TODO: This test is skipped because Stella doesn't include the GET DIRECT DATA function
  it.skip('should work for GET DIRECT DATA function (2D with separate definitions)', () => {
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

  // TODO: This test is skipped because Stella doesn't include the GET DIRECT LOOKUPS function
  it.skip('should work for GET DIRECT LOOKUPS function', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookups.csv', ',', '1', 'AH2') ~~|
      y[DimA] = x[DimA](Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = 100 ~~|
    //   y = 2 ~~|
    //   z = IF THEN ELSE(Time > x, 1, y) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>100</eqn>
</aux>
<aux name="y">
  <eqn>2</eqn>
</aux>
<aux name="z">
  <eqn>IF Time>x THEN 1 ELSE y</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  it('should work for INIT function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = Time * 2 ~~|
    //   y = INITIAL(x) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>Time*2</eqn>
</aux>
<aux name="y">
  <eqn>INIT(x)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', 'Time*2', {
        refId: '_x',
        references: ['_time']
      }),
      v('y', 'INIT(x)', {
        refId: '_y',
        varType: 'initial',
        hasInitValue: true,
        initReferences: ['_x'],
        referencedFunctionNames: ['__init']
      })
    ])
  })

  it('should work for INTEG function (synthesized from <stock> variable definition)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = Time * 2 ~~|
    //   init = 5 ~~|
    //   y = INTEG(x, init) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>Time*2</eqn>
</aux>
<aux name="init">
  <eqn>5</eqn>
</aux>
<stock name="y">
  <eqn>init</eqn>
  <inflow>x</inflow>
</stock>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  it('should work for INTEG function (synthesized from <stock> variable definition, with nested function calls)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x = Time * 2 ~~|
    //   init = 5 ~~|
    //   y = INTEG(ABS(x), SQRT(init)) ~~|
    // `)

    const xmileVars = `\
<aux name="x">
  <eqn>Time*2</eqn>
</aux>
<aux name="init">
  <eqn>5</eqn>
</aux>
<stock name="y">
  <eqn>SQRT(init)</eqn>
  <inflow>ABS(x)</inflow>
</stock>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('x', 'Time*2', {
        refId: '_x',
        references: ['_time']
      }),
      v('init', '5', {
        refId: '_init',
        varType: 'const'
      }),
      v('y', 'INTEG(ABS(x),SQRT(init))', {
        refId: '_y',
        varType: 'level',
        references: ['_x'],
        hasInitValue: true,
        initReferences: ['_init'],
        referencedFunctionNames: ['__integ', '__abs', '__sqrt']
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't appear to include the LOOKUP BACKWARD function
  it.skip('should work for LOOKUP BACKWARD function (with lookup defined explicitly)', () => {
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

  // TODO: This test is skipped because Stella doesn't appear to include the LOOKUP BACKWARD function
  it.skip('should work for LOOKUP BACKWARD function (with lookup defined using GET DIRECT LOOKUPS)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookups.csv', ',', '1', 'AH2') ~~|
      y[DimA] = LOOKUP BACKWARD(x[DimA], Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
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

  // TODO: This test is skipped because Stella doesn't appear to include the LOOKUP FORWARD function
  it.skip('should work for LOOKUP FORWARD function (with lookup defined explicitly)', () => {
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

  // TODO: This test is skipped because Stella doesn't appear to include the LOOKUP FORWARD function
  it.skip('should work for LOOKUP FORWARD function (with lookup defined using GET DIRECT LOOKUPS)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookups.csv', ',', '1', 'AH2') ~~|
      y[DimA] = LOOKUP FORWARD(x[DimA], Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
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

  it('should work for LOOKUPINV function (with lookup defined explicitly)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   x( (0,0),(2,1.3) ) ~~|
    //   y = LOOKUP INVERT(x, 1) ~~|
    // `)

    const xmileVars = `\
<gf name="x" type="continuous">
  <xpts>0,2</xpts>
  <ypts>0,1.3</ypts>
</gf>
<aux name="y">
  <eqn>LOOKUPINV(x,1)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
      v('y', 'LOOKUPINV(x,1)', {
        refId: '_y',
        referencedFunctionNames: ['__lookupinv'],
        references: ['_x']
      })
    ])
  })

  // TODO: This test is skipped because Stella doesn't include the GET DIRECT LOOKUPS function
  it.skip('should work for LOOKUPINV function (with lookup defined using GET DIRECT LOOKUPS)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2, A3 ~~|
      x[DimA] = GET DIRECT LOOKUPS('lookups.csv', ',', '1', 'AH2') ~~|
      y[DimA] = LOOKUP INVERT(x[DimA], Time) ~~|
      z = y[A2] ~~|
    `)
    expect(vars).toEqual([
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'data'
      }),
      v('x[DimA]', "GET DIRECT LOOKUPS('lookups.csv',',','1','AH2')", {
        directDataArgs: { file: 'lookups.csv', tab: ',', timeRowOrCol: '1', startCell: 'AH2' },
        refId: '_x[_a3]',
        separationDims: ['_dima'],
        subscripts: ['_a3'],
        varType: 'data'
      }),
      v('y[DimA]', 'LOOKUPINV(x[DimA],Time)', {
        refId: '_y',
        referencedFunctionNames: ['__lookupinv'],
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   a = 10 ~~|
    //   b = 20 ~~|
    //   y = MAX(a, b) ~~|
    // `)

    const xmileVars = `\
<aux name="a">
  <eqn>10</eqn>
</aux>
<aux name="b">
  <eqn>20</eqn>
</aux>
<aux name="y">
  <eqn>MAX(a,b)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   a = 10 ~~|
    //   b = 20 ~~|
    //   y = MIN(a, b) ~~|
    // `)

    const xmileVars = `\
<aux name="a">
  <eqn>10</eqn>
</aux>
<aux name="b">
  <eqn>20</eqn>
</aux>
<aux name="y">
  <eqn>MIN(a,b)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  it('should work for MOD function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   a = 20 ~~|
    //   b = 10 ~~|
    //   y = MODULO(a, b) ~~|
    // `)

    const xmileVars = `\
<aux name="a">
  <eqn>20</eqn>
</aux>
<aux name="b">
  <eqn>10</eqn>
</aux>
<aux name="y">
  <eqn>MOD(a,b)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('a', '20', {
        refId: '_a',
        varType: 'const'
      }),
      v('b', '10', {
        refId: '_b',
        varType: 'const'
      }),
      v('y', 'MOD(a,b)', {
        refId: '_y',
        referencedFunctionNames: ['__mod'],
        references: ['_a', '_b']
      })
    ])
  })

  // TODO: Add a variant where discount rate is defined as (x+1) (old reader did not include
  // parens and might generate incorrect equation)
  // TODO: This test is skipped because Stella's NPV function takes 2 or 3 arguments, but Vensim's
  // takes 4 arguments, so it is not implemented yet in SDE
  it.skip('should work for NPV function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   stream = 100 ~~|
    //   discount rate = 10 ~~|
    //   init = 0 ~~|
    //   factor = 2 ~~|
    //   y = NPV(stream, discount rate, init, factor) ~~|
    // `)

    const xmileVars = `\
<aux name="stream">
  <eqn>100</eqn>
</aux>
<aux name="discount rate">
  <eqn>10</eqn>
</aux>
<aux name="init">
  <eqn>0</eqn>
</aux>
<aux name="factor">
  <eqn>2</eqn>
</aux>
<aux name="y">
  <eqn>NPV(stream,discount rate,init,factor)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  // TODO: This test is skipped because Stella's PULSE function takes 1 or 3 arguments, but Vensim's
  // takes 2 arguments, so it is not implemented yet in SDE
  it.skip('should work for PULSE function', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   start = 10 ~~|
    //   width = 20 ~~|
    //   y = PULSE(start, width) ~~|
    // `)

    const xmileVars = `\
<aux name="start">
  <eqn>10</eqn>
</aux>
<aux name="width">
  <eqn>20</eqn>
</aux>
<aux name="y">
  <eqn>PULSE(start,width)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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

  // TODO: This test is skipped because Stella doesn't include the SAMPLE IF TRUE function
  it.skip('should work for SAMPLE IF TRUE function', () => {
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

  it.skip('should work for SMOOTH function', () => {
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

  it.skip('should work for SMOOTH function (with subscripted input and subscripted delay)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      input[DimA] = 3 + PULSE(10, 10) ~~|
      delay[DimA] = 2, 3 ~~|
      y[DimA] = SMOOTH(input[DimA], delay[DimA]) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        subscripts: ['_dima']
      }),
      v('delay[DimA]', '2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('y[DimA]', 'SMOOTH(input[DimA],delay[DimA])', {
        refId: '_y',
        references: ['__level1'],
        smoothVarRefId: '__level1',
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG((input[DimA]-_level1[DimA])/delay[DimA],input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a1]', '_delay[_a2]'],
        subscripts: ['_dima'],
        varType: 'level'
      })
    ])
  })

  // TODO: Stella calls this function SMTH1 instead of SMOOTH, skipping this test for now
  it.skip('should work for SMOOTH function (with subscripted input and non-subscripted delay)', () => {
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   input[DimA] = 3 + PULSE(10, 10) ~~|
    //   delay = 2 ~~|
    //   y[DimA] = SMOOTH(input[DimA], delay) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>`
    const xmileVars = `\
<aux name="input[DimA]">
  <eqn>3+PULSE(10,10)</eqn>
</aux>
<aux name="delay">
  <eqn>2</eqn>
</aux>
<aux name="y[DimA]">
  <eqn>SMOOTH(input[DimA],delay)</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('input[DimA]', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        subscripts: ['_dima']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y[DimA]', 'SMOOTH(input[DimA],delay)', {
        refId: '_y',
        references: ['__level1'],
        smoothVarRefId: '__level1',
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG((input[DimA]-_level1[DimA])/delay,input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        subscripts: ['_dima'],
        varType: 'level'
      })
    ])
  })

  // TODO: Stella calls this function SMTH1 instead of SMOOTH, skipping this test for now
  it.skip('should work for SMOOTHI function', () => {
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

  // TODO: Stella calls this function SMTH1 instead of SMOOTHI, skipping this test for now
  it.skip('should work for SMOOTHI function (with subscripted variables)', () => {
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

  // TODO: Stella calls this function SMTH1 instead of SMOOTHI, skipping this test for now
  it.skip('should work for SMOOTHI function (with separated variables using subdimension)', () => {
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

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3, skipping this test for now
  it.skip('should work for SMOOTH3 function', () => {
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

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3, skipping this test for now
  it.skip('should work for SMOOTH3 function (when nested in another function)', () => {
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

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3, skipping this test for now
  it.skip('should work for SMOOTH3 function (with subscripted input and subscripted delay)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      input[DimA] = 3 + PULSE(10, 10) ~~|
      delay[DimA] = 2, 3 ~~|
      y[DimA] = SMOOTH3(input[DimA], delay[DimA]) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        subscripts: ['_dima']
      }),
      v('delay[DimA]', '2,3', {
        refId: '_delay[_a1]',
        separationDims: ['_dima'],
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('delay[DimA]', '2,3', {
        refId: '_delay[_a2]',
        separationDims: ['_dima'],
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('y[DimA]', 'SMOOTH3(input[DimA],delay[DimA])', {
        refId: '_y',
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3',
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG((input[DimA]-_level1[DimA])/(delay[DimA]/3),input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay[_a1]', '_delay[_a2]'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level2[DimA]', 'INTEG((_level1[DimA]-_level2[DimA])/(delay[DimA]/3),input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_delay[_a1]', '_delay[_a2]'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level3[DimA]', 'INTEG((_level2[DimA]-_level3[DimA])/(delay[DimA]/3),input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_delay[_a1]', '_delay[_a2]'],
        subscripts: ['_dima'],
        varType: 'level'
      })
    ])
  })

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3, skipping this test for now
  it.skip('should work for SMOOTH3 function (with subscripted input and non-subscripted delay)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      input[DimA] = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y[DimA] = SMOOTH3(input[DimA], delay) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        subscripts: ['_dima']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y[DimA]', 'SMOOTH3(input[DimA],delay)', {
        refId: '_y',
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3',
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG((input[DimA]-_level1[DimA])/(delay/3),input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level2[DimA]', 'INTEG((_level1[DimA]-_level2[DimA])/(delay/3),input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_delay'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level3[DimA]', 'INTEG((_level2[DimA]-_level3[DimA])/(delay/3),input[DimA])', {
        hasInitValue: true,
        includeInOutput: false,
        initReferences: ['_input'],
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_delay'],
        subscripts: ['_dima'],
        varType: 'level'
      })
    ])
  })

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3I, skipping this test for now
  it.skip('should work for SMOOTH3I function', () => {
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

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3I, skipping this test for now
  it.skip('should work for SMOOTH3I function (with nested function calls)', () => {
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

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3I, skipping this test for now
  it.skip('should work for SMOOTH3I function (with subscripted variables)', () => {
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

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3I, skipping this test for now
  it.skip('should work for SMOOTH3I function (with subscripted input and non-subscripted delay)', () => {
    const vars = readInlineModel(`
      DimA: A1, A2 ~~|
      input[DimA] = 3 + PULSE(10, 10) ~~|
      delay = 2 ~~|
      y[DimA] = SMOOTH3I(input[DimA], delay, 5) ~~|
    `)
    expect(vars).toEqual([
      v('input[DimA]', '3+PULSE(10,10)', {
        refId: '_input',
        referencedFunctionNames: ['__pulse'],
        subscripts: ['_dima']
      }),
      v('delay', '2', {
        refId: '_delay',
        varType: 'const'
      }),
      v('y[DimA]', 'SMOOTH3I(input[DimA],delay,5)', {
        refId: '_y',
        references: ['__level1', '__level2', '__level3'],
        smoothVarRefId: '__level3',
        subscripts: ['_dima']
      }),
      v('_level1[DimA]', 'INTEG((input[DimA]-_level1[DimA])/(delay/3),5)', {
        hasInitValue: true,
        includeInOutput: false,
        refId: '__level1',
        referencedFunctionNames: ['__integ'],
        references: ['_input', '_delay'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level2[DimA]', 'INTEG((_level1[DimA]-_level2[DimA])/(delay/3),5)', {
        hasInitValue: true,
        includeInOutput: false,
        refId: '__level2',
        referencedFunctionNames: ['__integ'],
        references: ['__level1', '_delay'],
        subscripts: ['_dima'],
        varType: 'level'
      }),
      v('_level3[DimA]', 'INTEG((_level2[DimA]-_level3[DimA])/(delay/3),5)', {
        hasInitValue: true,
        includeInOutput: false,
        refId: '__level3',
        referencedFunctionNames: ['__integ'],
        references: ['__level2', '_delay'],
        subscripts: ['_dima'],
        varType: 'level'
      })
    ])
  })

  // TODO: Stella calls this function SMTH3 instead of SMOOTH3I, skipping this test for now
  it.skip('should work for SMOOTH3I function (with separated variables using subdimension)', () => {
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   input = 1 ~~|
    //   avg time = 2 ~~|
    //   init = 3 ~~|
    //   y = TREND(input, avg time, init) ~~|
    // `)

    const xmileVars = `\
<aux name="input">
  <eqn>1</eqn>
</aux>
<aux name="avg time">
  <eqn>2</eqn>
</aux>
<aux name="init">
  <eqn>3</eqn>
</aux>
<aux name="y">
  <eqn>TREND(input, avg time, init)</eqn>
</aux>`
    const mdl = xmile('', xmileVars)
    const vars = readInlineModel(mdl)
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
    // Equivalent Vensim model for reference:
    // const vars = readInlineModel(`
    //   DimA: A1, A2 ~~|
    //   input[DimA] = 1, 2 ~~|
    //   avg time[DimA] = 3, 4 ~~|
    //   init[DimA] = 5 ~~|
    //   y[DimA] = TREND(input[DimA], avg time[DimA], init[DimA]) ~~|
    // `)

    const xmileDims = `\
<dim name="DimA">
  <elem name="A1"/>
  <elem name="A2"/>
</dim>
`
    const xmileVars = `\
<aux name="input">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>1</eqn>
  </element>
  <element subscript="A2">
    <eqn>2</eqn>
  </element>
</aux>
<aux name="avg time">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <element subscript="A1">
    <eqn>3</eqn>
  </element>
  <element subscript="A2">
    <eqn>4</eqn>
  </element>
</aux>
<aux name="init">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>5</eqn>
</aux>
<aux name="y">
  <dimensions>
    <dim name="DimA"/>
  </dimensions>
  <eqn>TREND(input[DimA], avg time[DimA], init[DimA])</eqn>
</aux>`
    const mdl = xmile(xmileDims, xmileVars)
    const vars = readInlineModel(mdl)
    expect(vars).toEqual([
      v('input[A1]', '1', {
        refId: '_input[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('input[A2]', '2', {
        refId: '_input[_a2]',
        subscripts: ['_a2'],
        varType: 'const'
      }),
      v('avg time[A1]', '3', {
        refId: '_avg_time[_a1]',
        subscripts: ['_a1'],
        varType: 'const'
      }),
      v('avg time[A2]', '4', {
        refId: '_avg_time[_a2]',
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

  // TODO: This test is skipped because Stella doesn't include the WITH LOOKUP function
  it.skip('should work for WITH LOOKUP function', () => {
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
})
