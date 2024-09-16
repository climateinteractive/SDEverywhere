import { describe, expect, it } from 'vitest'

import { resetHelperState } from '../_shared/helpers'
import { resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'

import type { ParsedModel } from '../_tests/test-support'
import { parseInlineVensimModel, parseVensimModel, sampleModelDir } from '../_tests/test-support'

/**
 * This is a shorthand for the following steps to read equations:
 *   - parseVensimModel
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
  }
): { full: any; minimal: any } {
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

  const spec = {
    specialSeparationDims: opts?.specialSeparationDims
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

  return Model.jsonList()
}

function readInlineModel(
  modelText: string,
  modelDir?: string,
  opts?: {
    specialSeparationDims?: { [key: string]: string }
  }
): any {
  return readSubscriptsAndEquationsFromSource({ modelText, modelDir }, opts)
}

describe('Model', () => {
  describe('jsonList', () => {
    it('should expose accessible variables sorted in order of evaluation', () => {
      const listing = readInlineModel(`
        DimA: A1, A2 ~~|
        DimB: B1, B2 ~~|
        input = 1 ~~|
        x = input ~~|
        y = :NOT: x ~~|
        z = ABS(y) ~~|
        a data[DimA] ~~|
        a[DimA] = a data[DimA] ~~|
        b data[DimA, DimB] ~~|
        b[DimA, DimB] = b data[DimA, DimB] ~~|
        c data ~~|
        c = c data ~~|
        d = INITIAL(c) ~~|
        e[DimA] = 1 ~~|
        f[DimA] = 10, 11 ~~|
        g[DimA, DimB] = 1 ~~|
        h[DimA, DimB] = 1, 2; 3, 4; ~~|
        i lookup((0,0), (1,1)) ~~|
        level init = 5 ~~|
        level = INTEG(x, level init) ~~|
        w = WITH LOOKUP(x, ( [(0,0)-(2,2)], (0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3) )) ~~|
        INITIAL TIME = 0 ~~|
        FINAL TIME = 2 ~~|
        TIME STEP = 1 ~~|
        SAVEPER = 1 ~~|
      `)
      expect(listing.full).toEqual({
        dimensions: [
          {
            modelName: 'DimA',
            modelValue: ['A1', 'A2'],
            modelMappings: [],
            name: '_dima',
            value: ['_a1', '_a2'],
            size: 2,
            family: '_dima',
            mappings: {}
          },
          {
            modelName: 'DimB',
            modelValue: ['B1', 'B2'],
            modelMappings: [],
            name: '_dimb',
            value: ['_b1', '_b2'],
            size: 2,
            family: '_dimb',
            mappings: {}
          }
        ],
        variables: [
          {
            refId: '_final_time',
            varName: '_final_time',
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'FINAL TIME',
            modelFormula: '2',
            varIndex: 1
          },
          {
            refId: '_initial_time',
            varName: '_initial_time',
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'INITIAL TIME',
            modelFormula: '0',
            varIndex: 2
          },
          {
            refId: '_saveper',
            varName: '_saveper',
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'SAVEPER',
            modelFormula: '1',
            varIndex: 3
          },
          {
            refId: '_time_step',
            varName: '_time_step',
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'TIME STEP',
            modelFormula: '1',
            varIndex: 4
          },
          {
            refId: '_e',
            varName: '_e',
            subscripts: ['_dima'],
            families: ['_dima'],
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'e[DimA]',
            modelFormula: '1',
            varIndex: 5
          },
          {
            refId: '_f[_a1]',
            varName: '_f',
            subscripts: ['_a1'],
            families: ['_dima'],
            hasInitValue: false,
            varType: 'const',
            separationDims: ['_dima'],
            modelLHS: 'f[DimA]',
            modelFormula: '10,11',
            varIndex: 6
          },
          {
            refId: '_f[_a2]',
            varName: '_f',
            subscripts: ['_a2'],
            families: ['_dima'],
            hasInitValue: false,
            varType: 'const',
            separationDims: ['_dima'],
            modelLHS: 'f[DimA]',
            modelFormula: '10,11',
            varIndex: 6
          },
          {
            refId: '_g',
            varName: '_g',
            subscripts: ['_dima', '_dimb'],
            families: ['_dima', '_dimb'],
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'g[DimA,DimB]',
            modelFormula: '1',
            varIndex: 7
          },
          {
            refId: '_h[_a1,_b1]',
            varName: '_h',
            subscripts: ['_a1', '_b1'],
            families: ['_dima', '_dimb'],
            hasInitValue: false,
            varType: 'const',
            separationDims: ['_dima', '_dimb'],
            modelLHS: 'h[DimA,DimB]',
            modelFormula: '1,2;3,4;',
            varIndex: 8
          },
          {
            refId: '_h[_a1,_b2]',
            varName: '_h',
            subscripts: ['_a1', '_b2'],
            families: ['_dima', '_dimb'],
            hasInitValue: false,
            varType: 'const',
            separationDims: ['_dima', '_dimb'],
            modelLHS: 'h[DimA,DimB]',
            modelFormula: '1,2;3,4;',
            varIndex: 8
          },
          {
            refId: '_h[_a2,_b1]',
            varName: '_h',
            subscripts: ['_a2', '_b1'],
            families: ['_dima', '_dimb'],
            hasInitValue: false,
            varType: 'const',
            separationDims: ['_dima', '_dimb'],
            modelLHS: 'h[DimA,DimB]',
            modelFormula: '1,2;3,4;',
            varIndex: 8
          },
          {
            refId: '_h[_a2,_b2]',
            varName: '_h',
            subscripts: ['_a2', '_b2'],
            families: ['_dima', '_dimb'],
            hasInitValue: false,
            varType: 'const',
            separationDims: ['_dima', '_dimb'],
            modelLHS: 'h[DimA,DimB]',
            modelFormula: '1,2;3,4;',
            varIndex: 8
          },
          {
            refId: '_input',
            varName: '_input',
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'input',
            modelFormula: '1',
            varIndex: 9
          },
          {
            refId: '_level_init',
            varName: '_level_init',
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'level init',
            modelFormula: '5',
            varIndex: 10
          },
          {
            refId: '_i_lookup',
            varName: '_i_lookup',
            hasInitValue: false,
            varType: 'lookup',
            modelLHS: 'i lookup',
            modelFormula: '',
            varIndex: 11
          },
          {
            refId: '_a_data',
            varName: '_a_data',
            subscripts: ['_dima'],
            families: ['_dima'],
            hasInitValue: false,
            varType: 'data',
            modelLHS: 'a data[DimA]',
            modelFormula: '',
            varIndex: 12
          },
          {
            refId: '_b_data',
            varName: '_b_data',
            subscripts: ['_dima', '_dimb'],
            families: ['_dima', '_dimb'],
            hasInitValue: false,
            varType: 'data',
            modelLHS: 'b data[DimA,DimB]',
            modelFormula: '',
            varIndex: 13
          },
          {
            refId: '_c_data',
            varName: '_c_data',
            hasInitValue: false,
            varType: 'data',
            modelLHS: 'c data',
            modelFormula: '',
            varIndex: 14
          },
          {
            refId: '_time',
            varName: '_time',
            hasInitValue: false,
            varType: 'const',
            modelLHS: 'Time',
            modelFormula: '',
            varIndex: 15
          },
          {
            refId: '_c',
            varName: '_c',
            references: ['_c_data'],
            hasInitValue: false,
            varType: 'aux',
            modelLHS: 'c',
            modelFormula: 'c data',
            varIndex: 16
          },
          {
            refId: '_d',
            varName: '_d',
            hasInitValue: true,
            initReferences: ['_c'],
            varType: 'initial',
            modelLHS: 'd',
            modelFormula: 'INITIAL(c)',
            varIndex: 17
          },
          {
            refId: '_level',
            varName: '_level',
            references: ['_x'],
            hasInitValue: true,
            initReferences: ['_level_init'],
            varType: 'level',
            modelLHS: 'level',
            modelFormula: 'INTEG(x,level init)',
            varIndex: 18
          },
          {
            refId: '_a',
            varName: '_a',
            subscripts: ['_dima'],
            families: ['_dima'],
            references: ['_a_data'],
            hasInitValue: false,
            varType: 'aux',
            modelLHS: 'a[DimA]',
            modelFormula: 'a data[DimA]',
            varIndex: 19
          },
          {
            refId: '_b',
            varName: '_b',
            subscripts: ['_dima', '_dimb'],
            families: ['_dima', '_dimb'],
            references: ['_b_data'],
            hasInitValue: false,
            varType: 'aux',
            modelLHS: 'b[DimA,DimB]',
            modelFormula: 'b data[DimA,DimB]',
            varIndex: 20
          },
          {
            refId: '_x',
            varName: '_x',
            references: ['_input'],
            hasInitValue: false,
            varType: 'aux',
            modelLHS: 'x',
            modelFormula: 'input',
            varIndex: 21
          },
          {
            refId: '_w',
            varName: '_w',
            references: ['_x'],
            hasInitValue: false,
            varType: 'aux',
            modelLHS: 'w',
            modelFormula: 'WITH LOOKUP(x,([(0,0)-(2,2)],(0,0),(0.1,0.01),(0.5,0.7),(1,1),(1.5,1.2),(2,1.3)))',
            varIndex: 22
          },
          {
            refId: '_y',
            varName: '_y',
            references: ['_x'],
            hasInitValue: false,
            varType: 'aux',
            modelLHS: 'y',
            modelFormula: ':NOT: x',
            varIndex: 23
          },
          {
            refId: '_z',
            varName: '_z',
            references: ['_y'],
            hasInitValue: false,
            varType: 'aux',
            modelLHS: 'z',
            modelFormula: 'ABS(y)',
            varIndex: 24
          }
        ],
        varInstances: {
          constants: [
            {
              varId: '_final_time',
              varName: 'FINAL TIME',
              varType: 'const',
              varIndex: 1
            },
            {
              varId: '_initial_time',
              varName: 'INITIAL TIME',
              varType: 'const',
              varIndex: 2
            },
            {
              varId: '_saveper',
              varName: 'SAVEPER',
              varType: 'const',
              varIndex: 3
            },
            {
              varId: '_time_step',
              varName: 'TIME STEP',
              varType: 'const',
              varIndex: 4
            },
            {
              varId: '_e[_a1]',
              varName: 'e[A1]',
              varType: 'const',
              varIndex: 5,
              subIndices: [0]
            },
            {
              varId: '_e[_a2]',
              varName: 'e[A2]',
              varType: 'const',
              varIndex: 5,
              subIndices: [1]
            },
            {
              varId: '_f[_a1]',
              varName: 'f[A1]',
              varType: 'const',
              varIndex: 6,
              subIndices: [0]
            },
            {
              varId: '_f[_a2]',
              varName: 'f[A2]',
              varType: 'const',
              varIndex: 6,
              subIndices: [1]
            },
            {
              varId: '_g[_a1,_b1]',
              varName: 'g[A1,B1]',
              varType: 'const',
              varIndex: 7,
              subIndices: [0, 0]
            },
            {
              varId: '_g[_a1,_b2]',
              varName: 'g[A1,B2]',
              varType: 'const',
              varIndex: 7,
              subIndices: [0, 1]
            },
            {
              varId: '_g[_a2,_b1]',
              varName: 'g[A2,B1]',
              varType: 'const',
              varIndex: 7,
              subIndices: [1, 0]
            },
            {
              varId: '_g[_a2,_b2]',
              varName: 'g[A2,B2]',
              varType: 'const',
              varIndex: 7,
              subIndices: [1, 1]
            },
            {
              varId: '_h[_a1,_b1]',
              varName: 'h[A1,B1]',
              varType: 'const',
              varIndex: 8,
              subIndices: [0, 0]
            },
            {
              varId: '_h[_a1,_b2]',
              varName: 'h[A1,B2]',
              varType: 'const',
              varIndex: 8,
              subIndices: [0, 1]
            },
            {
              varId: '_h[_a2,_b1]',
              varName: 'h[A2,B1]',
              varType: 'const',
              varIndex: 8,
              subIndices: [1, 0]
            },
            {
              varId: '_h[_a2,_b2]',
              varName: 'h[A2,B2]',
              varType: 'const',
              varIndex: 8,
              subIndices: [1, 1]
            },
            {
              varId: '_input',
              varName: 'input',
              varType: 'const',
              varIndex: 9
            },
            {
              varId: '_level_init',
              varName: 'level init',
              varType: 'const',
              varIndex: 10
            }
          ],
          lookupVars: [
            {
              varId: '_i_lookup',
              varName: 'i lookup',
              varType: 'lookup',
              varIndex: 11
            }
          ],
          dataVars: [
            {
              varId: '_a_data[_a1]',
              varName: 'a data[A1]',
              varType: 'data',
              varIndex: 12,
              subIndices: [0]
            },
            {
              varId: '_a_data[_a2]',
              varName: 'a data[A2]',
              varType: 'data',
              varIndex: 12,
              subIndices: [1]
            },
            {
              varId: '_b_data[_a1,_b1]',
              varName: 'b data[A1,B1]',
              varType: 'data',
              varIndex: 13,
              subIndices: [0, 0]
            },
            {
              varId: '_b_data[_a1,_b2]',
              varName: 'b data[A1,B2]',
              varType: 'data',
              varIndex: 13,
              subIndices: [0, 1]
            },
            {
              varId: '_b_data[_a2,_b1]',
              varName: 'b data[A2,B1]',
              varType: 'data',
              varIndex: 13,
              subIndices: [1, 0]
            },
            {
              varId: '_b_data[_a2,_b2]',
              varName: 'b data[A2,B2]',
              varType: 'data',
              varIndex: 13,
              subIndices: [1, 1]
            },
            {
              varId: '_c_data',
              varName: 'c data',
              varType: 'data',
              varIndex: 14
            }
          ],
          initVars: [
            {
              varId: '_time',
              varName: 'Time',
              varType: 'const',
              varIndex: 15
            },
            {
              varId: '_c',
              varName: 'c',
              varType: 'aux',
              varIndex: 16
            },
            {
              varId: '_d',
              varName: 'd',
              varType: 'initial',
              varIndex: 17
            },
            {
              varId: '_level',
              varName: 'level',
              varType: 'level',
              varIndex: 18
            }
          ],
          levelVars: [
            {
              varId: '_level',
              varName: 'level',
              varType: 'level',
              varIndex: 18
            }
          ],
          auxVars: [
            {
              varId: '_a[_a1]',
              varName: 'a[A1]',
              varType: 'aux',
              varIndex: 19,
              subIndices: [0]
            },
            {
              varId: '_a[_a2]',
              varName: 'a[A2]',
              varType: 'aux',
              varIndex: 19,
              subIndices: [1]
            },
            {
              varId: '_b[_a1,_b1]',
              varName: 'b[A1,B1]',
              varType: 'aux',
              varIndex: 20,
              subIndices: [0, 0]
            },
            {
              varId: '_b[_a1,_b2]',
              varName: 'b[A1,B2]',
              varType: 'aux',
              varIndex: 20,
              subIndices: [0, 1]
            },
            {
              varId: '_b[_a2,_b1]',
              varName: 'b[A2,B1]',
              varType: 'aux',
              varIndex: 20,
              subIndices: [1, 0]
            },
            {
              varId: '_b[_a2,_b2]',
              varName: 'b[A2,B2]',
              varType: 'aux',
              varIndex: 20,
              subIndices: [1, 1]
            },
            {
              varId: '_c',
              varName: 'c',
              varType: 'aux',
              varIndex: 16
            },
            {
              varId: '_x',
              varName: 'x',
              varType: 'aux',
              varIndex: 21
            },
            {
              varId: '_w',
              varName: 'w',
              varType: 'aux',
              varIndex: 22
            },
            {
              varId: '_y',
              varName: 'y',
              varType: 'aux',
              varIndex: 23
            },
            {
              varId: '_z',
              varName: 'z',
              varType: 'aux',
              varIndex: 24
            }
          ]
        }
      })

      expect(listing.minimal).toEqual({
        dimensions: [
          {
            id: '_dima',
            subIds: ['_a1', '_a2']
          },
          {
            id: '_dimb',
            subIds: ['_b1', '_b2']
          }
        ],
        variables: [
          {
            id: '_final_time',
            index: 1
          },
          {
            id: '_initial_time',
            index: 2
          },
          {
            id: '_saveper',
            index: 3
          },
          {
            id: '_time_step',
            index: 4
          },
          {
            id: '_e',
            dimIds: ['_dima'],
            index: 5
          },
          {
            id: '_f',
            dimIds: ['_dima'],
            index: 6
          },
          {
            id: '_g',
            dimIds: ['_dima', '_dimb'],
            index: 7
          },
          {
            id: '_h',
            dimIds: ['_dima', '_dimb'],
            index: 8
          },
          {
            id: '_input',
            index: 9
          },
          {
            id: '_level_init',
            index: 10
          },
          {
            id: '_i_lookup',
            index: 11
          },
          {
            id: '_a_data',
            dimIds: ['_dima'],
            index: 12
          },
          {
            id: '_b_data',
            dimIds: ['_dima', '_dimb'],
            index: 13
          },
          {
            id: '_c_data',
            index: 14
          },
          {
            id: '_time',
            index: 15
          },
          {
            id: '_c',
            index: 16
          },
          {
            id: '_d',
            index: 17
          },
          {
            id: '_level',
            index: 18
          },
          {
            id: '_a',
            dimIds: ['_dima'],
            index: 19
          },
          {
            id: '_b',
            dimIds: ['_dima', '_dimb'],
            index: 20
          },
          {
            id: '_x',
            index: 21
          },
          {
            id: '_w',
            index: 22
          },
          {
            id: '_y',
            index: 23
          },
          {
            id: '_z',
            index: 24
          }
        ]
      })
    })
  })
})
