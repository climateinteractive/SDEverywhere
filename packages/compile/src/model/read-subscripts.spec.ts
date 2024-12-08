import { describe, expect, it } from 'vitest'

import { allSubscripts, resetSubscriptsAndDimensions } from '../_shared/subscript'

import Model from './model'

import type { ParsedModel } from '../_tests/test-support'
import { dim, dimMapping, parseInlineVensimModel, parseVensimModel, sampleModelDir, sub } from '../_tests/test-support'

/**
 * This is a shorthand for the following steps to read (and optionally resolve) subscript ranges:
 *   - parseVensimModel
 *   - readSubscriptRanges
 *   - resolveSubscriptRanges (if `resolve` is true)
 *   - allSubscripts
 *
 * TODO: Update the return type once type info is added for `allSubscripts`
 */
function readSubscriptsFromSource(
  source: {
    modelText?: string
    modelName?: string
    modelDir?: string
  },
  resolve: boolean
): any[] {
  // XXX: This is needed due to subs/dims being in module-level storage
  resetSubscriptsAndDimensions()

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
    stopAfterReadSubscripts: !resolve,
    stopAfterResolveSubscripts: true
  })

  return allSubscripts()
}

function readInlineSubscripts(modelText: string, modelDir?: string): any[] {
  return readSubscriptsFromSource({ modelText, modelDir }, /*resolve=*/ false)
}

function readAndResolveInlineSubscripts(modelText: string, modelDir?: string): any[] {
  return readSubscriptsFromSource({ modelText, modelDir }, /*resolve=*/ true)
}

function readSubscripts(modelName: string): any[] {
  return readSubscriptsFromSource({ modelName }, /*resolve=*/ false)
}

function readAndResolveSubscripts(modelName: string): any[] {
  return readSubscriptsFromSource({ modelName }, /*resolve=*/ true)
}

describe('readSubscriptRanges + resolveSubscriptRanges', () => {
  it('should work for a subscript range with explicit subscripts', () => {
    const ranges = `DimA: A1, A2, A3 ~~|`

    const rawSubs = readInlineSubscripts(ranges)
    expect(rawSubs).toEqual([dim('DimA', ['A1', 'A2', 'A3'])])

    const resolvedSubs = readAndResolveInlineSubscripts(ranges)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2)
    ])
  })

  it('should work for a subscript range with a single numeric range', () => {
    const range = `DimA: (A1-A3) ~~|`

    const rawSubs = readInlineSubscripts(range)
    expect(rawSubs).toEqual([dim('DimA', ['A1', 'A2', 'A3'])])

    const resolvedSubs = readAndResolveInlineSubscripts(range)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2)
    ])
  })

  it('should work for a subscript range with multiple numeric ranges', () => {
    const ranges = `DimA: (A1-A3),A5,(A7-A8) ~~|`

    const rawSubs = readInlineSubscripts(ranges)
    expect(rawSubs).toEqual([dim('DimA', ['A1', 'A2', 'A3', 'A5', 'A7', 'A8'])])

    const resolvedSubs = readAndResolveInlineSubscripts(ranges)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3', 'A5', 'A7', 'A8']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('A5', 'DimA', 3),
      sub('A7', 'DimA', 4),
      sub('A8', 'DimA', 5)
    ])
  })

  it('should work for a subscript range with one mapping (to dimension with explicit individual subscripts)', () => {
    const ranges = `
      DimA: A1, A2, A3 -> DimB ~~|
      DimB: B1, B2, B3 ~~|
    `

    const rawSubs = readInlineSubscripts(ranges)
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], 'DimA', undefined, [dimMapping('DimB')], {
        // After resolve phase, this will be filled in with _a1,_a2,_a3
        _dimb: []
      }),
      dim('DimB', ['B1', 'B2', 'B3'])
    ])

    const resolvedSubs = readAndResolveInlineSubscripts(ranges)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], 'DimA', undefined, [dimMapping('DimB')], {
        _dimb: ['_a1', '_a2', '_a3']
      }),
      dim('DimB', ['B1', 'B2', 'B3']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('B3', 'DimB', 2)
    ])
  })

  it('should work for a subscript range with one mapping (to dimension with explicit mix of dimensions and subscripts)', () => {
    const ranges = `
      DimA: A1, A2, A3 ~~|
      SubA: A1, A2 ~~|
      DimB: B1, B2 -> (DimA: SubA, A3) ~~|
    `

    const rawSubs = readInlineSubscripts(ranges)
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      dim('SubA', ['A1', 'A2']),
      dim('DimB', ['B1', 'B2'], 'DimB', undefined, [dimMapping('DimA', ['SubA', 'A3'])], {
        // After resolve phase, this will be filled in with _b1,_b2,_b2
        _dima: ['_suba', '_a3']
      })
    ])

    const resolvedSubs = readAndResolveInlineSubscripts(ranges)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      dim('SubA', ['A1', 'A2'], 'DimA'),
      dim('DimB', ['B1', 'B2'], 'DimB', undefined, [dimMapping('DimA', ['SubA', 'A3'])], {
        _dima: ['_b1', '_b1', '_b2']
      }),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1)
    ])
  })

  it('should work for a subscript range with one mapping (to dimension without explicit subscripts)', () => {
    const ranges = `
      DimA: SubA, A3 -> DimB ~~|
      SubA: A1, A2 ~~|
      DimB: B1, B2, B3 ~~|
    `

    const rawSubs = readInlineSubscripts(ranges)
    expect(rawSubs).toEqual([
      dim('DimA', ['SubA', 'A3'], 'DimA', undefined, [dimMapping('DimB')], {
        // After resolve phase, this will be filled in with _a1,_a2,_a3
        _dimb: []
      }),
      dim('SubA', ['A1', 'A2']),
      dim('DimB', ['B1', 'B2', 'B3'])
    ])

    const resolvedSubs = readAndResolveInlineSubscripts(ranges)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['SubA', 'A3'], 'DimA', ['A1', 'A2', 'A3'], [dimMapping('DimB', [])], {
        _dimb: ['_a1', '_a2', '_a3']
      }),
      dim('SubA', ['A1', 'A2'], 'DimA'),
      dim('DimB', ['B1', 'B2', 'B3']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('B3', 'DimB', 2)
    ])
  })

  it('should work for a subscript range with two mappings', () => {
    const ranges = `
      DimA: A1, A2, A3 -> (DimB: B3, B2, B1), DimC ~~|
      DimB: B1, B2, B3 ~~|
      DimC: C1, C2, C3 ~~|
    `

    const rawSubs = readInlineSubscripts(ranges)
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], 'DimA', undefined, [dimMapping('DimB', ['B3', 'B2', 'B1']), dimMapping('DimC')], {
        // After resolve phase, this will be changed to _a3,_a2,_a1
        _dimb: ['_b3', '_b2', '_b1'],
        // After resolve phase, this will be filled in with _a1,_a2,_a3
        _dimc: []
      }),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3'])
    ])

    const resolvedSubs = readAndResolveInlineSubscripts(ranges)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], 'DimA', undefined, [dimMapping('DimB', ['B3', 'B2', 'B1']), dimMapping('DimC')], {
        _dimb: ['_a3', '_a2', '_a1'],
        _dimc: ['_a1', '_a2', '_a3']
      }),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('B3', 'DimB', 2),
      sub('C1', 'DimC', 0),
      sub('C2', 'DimC', 1),
      sub('C3', 'DimC', 2)
    ])
  })

  it('should work for a subscript range alias (<-> operator)', () => {
    const ranges = `
      DimA <-> DimB ~~|
      DimB: B1, B2, B3 ~~|
    `

    const rawSubs = readInlineSubscripts(ranges)
    // TODO: In "unresolved" dimensions, `value` is an empty string instead of an array
    // (in the case of aliases).  It would be good to fix it so that we don't need to mix types.
    expect(rawSubs).toEqual([dim('DimA', '', 'DimB'), dim('DimB', ['B1', 'B2', 'B3'])])

    const resolvedSubs = readAndResolveInlineSubscripts(ranges)
    expect(resolvedSubs).toEqual([
      dim('DimA', ['B1', 'B2', 'B3']),
      dim('DimB', ['B1', 'B2', 'B3'], 'DimA'),
      sub('B1', 'DimA', 0),
      sub('B2', 'DimA', 1),
      sub('B3', 'DimA', 2)
    ])
  })

  // TODO: `GET DIRECT SUBSCRIPTS` is already covered by the "directsubs" test below.
  // It would be nice if we had a simpler inline test here, but since it depends on
  // reading files, it would end up doing the same as the "directsubs" test.  Once
  // we make it easier to provide in-memory (or mock) data sources, we can consider
  // implementing this inline test.
  // it('should work for a subscript range defined with GET DIRECT SUBSCRIPTS', () => {
  // })

  it('should work for Vensim "active_initial" model', () => {
    const rawSubs = readSubscripts('active_initial')
    expect(rawSubs).toEqual([])

    const resolvedSubs = readAndResolveSubscripts('active_initial')
    expect(resolvedSubs).toEqual([])
  })

  it('should work for Vensim "allocate" model', () => {
    const rawSubs = readSubscripts('allocate')
    expect(rawSubs).toEqual([
      dim('region', ['Boston', 'Dayton', 'Fresno']),
      dim('XPriority', ['ptype', 'ppriority', 'pwidth', 'pextra'])
    ])

    const resolvedSubs = readAndResolveSubscripts('allocate')
    expect(resolvedSubs).toEqual([
      dim('region', ['Boston', 'Dayton', 'Fresno']),
      dim('XPriority', ['ptype', 'ppriority', 'pwidth', 'pextra']),
      sub('Boston', 'Region', 0),
      sub('Dayton', 'Region', 1),
      sub('Fresno', 'Region', 2),
      sub('ptype', 'XPriority', 0),
      sub('ppriority', 'XPriority', 1),
      sub('pwidth', 'XPriority', 2),
      sub('pextra', 'XPriority', 3)
    ])
  })

  it('should work for Vensim "arrays" model', () => {
    const rawSubs = readSubscripts('arrays')
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], 'DimA', undefined, [dimMapping('DimB')], {
        // After resolve phase, this will be filled in with _a1,_a2,_a3
        _dimb: []
      }),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3']),
      // After resolve phase, DimC' will be expanded to individual subscripts,
      // and family will be changed from DimC' to DimC
      dim("DimC'", ['DimC'], "DimC'", ['DimC']),
      dim('DimD', ['D1', 'D2', 'D3', 'D4']),
      // After resolve phase, family will be changed from SubA to DimA
      dim('SubA', ['A2', 'A3'], 'SubA'),
      // After resolve phase, DimX will be expanded to individual subscripts,
      // and family will be changed from DimX to DimA
      dim('DimX', ['SubA', 'A1'], 'DimX', ['SubA', 'A1'])
    ])

    const resolvedSubs = readAndResolveSubscripts('arrays')
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], 'DimA', undefined, [dimMapping('DimB')], {
        _dimb: ['_a1', '_a2', '_a3']
      }),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3']),
      dim("DimC'", ['DimC'], 'DimC', ['C1', 'C2', 'C3']),
      dim('DimD', ['D1', 'D2', 'D3', 'D4']),
      dim('SubA', ['A2', 'A3'], 'DimA'),
      dim('DimX', ['SubA', 'A1'], 'DimA', ['A2', 'A3', 'A1']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('B3', 'DimB', 2),
      sub('C1', 'DimC', 0),
      sub('C2', 'DimC', 1),
      sub('C3', 'DimC', 2),
      sub('D1', 'DimD', 0),
      sub('D2', 'DimD', 1),
      sub('D3', 'DimD', 2),
      sub('D4', 'DimD', 3)
    ])
  })

  it('should work for Vensim "directconst" model', () => {
    const rawSubs = readSubscripts('directconst')
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      // After resolve phase, family will be changed from SubA to DimA
      dim('SubA', ['A2', 'A3'], 'SubA'),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2']),
      // After resolve phase, "From DimC" will be expanded to individual subscripts,
      // and family will be changed from "From DimC" to DimC
      dim('From DimC', ['DimC'], 'From DimC', ['DimC']),
      // After resolve phase, "To DimC" will be expanded to individual subscripts,
      // and family will be changed from "To DimC" to DimC
      dim('To DimC', ['DimC'], 'To DimC', ['DimC']),
      dim('DimD', ['D1', 'D2'])
    ])

    const resolvedSubs = readAndResolveSubscripts('directconst')
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      dim('SubA', ['A2', 'A3'], 'DimA'),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2']),
      dim('From DimC', ['DimC'], 'DimC', ['C1', 'C2']),
      dim('To DimC', ['DimC'], 'DimC', ['C1', 'C2']),
      dim('DimD', ['D1', 'D2']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('B3', 'DimB', 2),
      sub('C1', 'DimC', 0),
      sub('C2', 'DimC', 1),
      sub('D1', 'DimD', 0),
      sub('D2', 'DimD', 1)
    ])
  })

  it('should work for Vensim "directdata" model', () => {
    const rawSubs = readSubscripts('directdata')
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2']),
      dim('DimB', ['B1', 'B2']),
      // After resolve phase, DimC will be expanded to individual subscripts,
      // and family will be changed from DimM to DimC
      dim('DimC', '', 'DimM'),
      // After resolve phase, family will be changed from DimM to DimC
      dim('DimM', ['M1', 'M2', 'M3']),
      // After resolve phase, family will be changed from SubM to DimC
      dim('SubM', ['M2', 'M3'], 'SubM')
    ])

    const resolvedSubs = readAndResolveSubscripts('directdata')
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2']),
      dim('DimB', ['B1', 'B2']),
      dim('DimC', ['M1', 'M2', 'M3']),
      dim('DimM', ['M1', 'M2', 'M3'], 'DimC'),
      dim('SubM', ['M2', 'M3'], 'DimC'),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('M1', 'DimC', 0),
      sub('M2', 'DimC', 1),
      sub('M3', 'DimC', 2)
    ])
  })

  it('should work for Vensim "directsubs" model', () => {
    const rawSubs = readSubscripts('directsubs')
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], undefined, undefined, [dimMapping('DimB'), dimMapping('DimC')], {
        // After resolve phase, this will be filled in with _a1,_a2,_a3
        _dimb: [],
        // After resolve phase, this will be filled in with _a1,_a2,_a3
        _dimc: []
      }),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3'])
    ])

    const resolvedSubs = readAndResolveSubscripts('directsubs')
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3'], undefined, undefined, [dimMapping('DimB'), dimMapping('DimC')], {
        _dimb: ['_a1', '_a2', '_a3'],
        _dimc: ['_a1', '_a2', '_a3']
      }),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('B3', 'DimB', 2),
      sub('C1', 'DimC', 0),
      sub('C2', 'DimC', 1),
      sub('C3', 'DimC', 2)
    ])
  })

  it('should work for Vensim "mapping" model', () => {
    const rawSubs = readSubscripts('mapping')
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      dim('DimB', ['B1', 'B2'], undefined, undefined, [dimMapping('DimA', ['SubA', 'A3'])], {
        // After resolve phase, this will be filled in with _b1,_b2,_b3
        _dima: ['_suba', '_a3']
      }),
      // After resolve phase, DimC will be expanded to individual subscripts
      dim('DimC', ['SubC', 'C3'], 'DimC', ['SubC', 'C3'], [dimMapping('DimD', [])], {
        // After resolve phase, this will be filled in with _c1,_c2,_c3
        _dimd: []
      }),
      dim('DimD', ['D1', 'D2', 'D3']),
      // After resolve phase, family will be changed from SubA to DimA
      dim('SubA', ['A1', 'A2'], 'SubA'),
      // After resolve phase, family will be changed from SubC to DimC
      dim('SubC', ['C1', 'C2'], 'SubC')
    ])

    const resolvedSubs = readAndResolveSubscripts('mapping')
    expect(resolvedSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      dim('DimB', ['B1', 'B2'], undefined, undefined, [dimMapping('DimA', ['SubA', 'A3'])], {
        _dima: ['_b1', '_b1', '_b2']
      }),
      dim('DimC', ['SubC', 'C3'], undefined, ['C1', 'C2', 'C3'], [dimMapping('DimD', [])], {
        _dimd: ['_c1', '_c2', '_c3']
      }),
      dim('DimD', ['D1', 'D2', 'D3']),
      dim('SubA', ['A1', 'A2'], 'DimA'),
      dim('SubC', ['C1', 'C2'], 'DimC'),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('C1', 'DimC', 0),
      sub('C2', 'DimC', 1),
      sub('C3', 'DimC', 2),
      sub('D1', 'DimD', 0),
      sub('D2', 'DimD', 1),
      sub('D3', 'DimD', 2)
    ])
  })

  it('should work for Vensim "multimap" model', () => {
    const rawSubs = readSubscripts('multimap')
    expect(rawSubs).toEqual([
      dim(
        'DimA',
        ['A1', 'A2', 'A3'],
        undefined,
        undefined,
        [dimMapping('DimB', ['B3', 'B2', 'B1']), dimMapping('DimC')],
        {
          // After resolve phase, these will be changed to _a3,_a2,_a1
          _dimb: ['_b3', '_b2', '_b1'],
          // After resolve phase, this will be filled in with _a1,_a2,_a3
          _dimc: []
        }
      ),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3'])
    ])

    const resolvedSubs = readAndResolveSubscripts('multimap')
    expect(resolvedSubs).toEqual([
      dim(
        'DimA',
        ['A1', 'A2', 'A3'],
        undefined,
        undefined,
        [dimMapping('DimB', ['B3', 'B2', 'B1']), dimMapping('DimC')],
        {
          _dimb: ['_a3', '_a2', '_a1'],
          _dimc: ['_a1', '_a2', '_a3']
        }
      ),
      dim('DimB', ['B1', 'B2', 'B3']),
      dim('DimC', ['C1', 'C2', 'C3']),
      sub('A1', 'DimA', 0),
      sub('A2', 'DimA', 1),
      sub('A3', 'DimA', 2),
      sub('B1', 'DimB', 0),
      sub('B2', 'DimB', 1),
      sub('B3', 'DimB', 2),
      sub('C1', 'DimC', 0),
      sub('C2', 'DimC', 1),
      sub('C3', 'DimC', 2)
    ])
  })

  it('should work for Vensim "ref" model', () => {
    const rawSubs = readSubscripts('ref')
    expect(rawSubs).toEqual([
      dim('Target', ['t1', 't2', 't3']),
      // After resolve phase, family will be changed from tNext to Target
      dim('tNext', ['t2', 't3'], 'tNext', undefined, [dimMapping('tPrev')], {
        // After resolve phase, this will be filled in with _t2,_t3
        _tprev: []
      }),
      // After resolve phase, family will be changed from tPrev to Target
      dim('tPrev', ['t1', 't2'], 'tPrev', undefined, [dimMapping('tNext')], {
        // After resolve phase, this will be filled in with _t2,_t3
        _tnext: []
      })
    ])

    const resolvedSubs = readAndResolveSubscripts('ref')
    expect(resolvedSubs).toEqual([
      dim('Target', ['t1', 't2', 't3']),
      dim('tNext', ['t2', 't3'], 'Target', undefined, [dimMapping('tPrev')], {
        _tprev: ['_t2', '_t3']
      }),
      dim('tPrev', ['t1', 't2'], 'Target', undefined, [dimMapping('tNext')], {
        _tnext: ['_t1', '_t2']
      }),
      sub('t1', 'Target', 0),
      sub('t2', 'Target', 1),
      sub('t3', 'Target', 2)
    ])
  })

  it('should work for Vensim "subalias" model', () => {
    const rawSubs = readSubscripts('subalias')
    expect(rawSubs).toEqual([
      // After resolve phase, DimE will be expanded to individual subscripts,
      // and family will be changed from DimF to DimE
      dim('DimE', '', 'DimF'),
      // After resolve phase, family will be changed from DimF to DimE
      dim('DimF', ['F1', 'F2', 'F3'], 'DimF')
    ])

    const resolvedSubs = readAndResolveSubscripts('subalias')
    expect(resolvedSubs).toEqual([
      dim('DimE', ['F1', 'F2', 'F3']),
      dim('DimF', ['F1', 'F2', 'F3'], 'DimE'),
      sub('F1', 'DimE', 0),
      sub('F2', 'DimE', 1),
      sub('F3', 'DimE', 2)
    ])
  })

  it('should work for Vensim "subscript" model', () => {
    const rawSubs = readSubscripts('subscript')
    expect(rawSubs).toEqual([
      dim('DimA', ['A1', 'A2', 'A3']),
      dim('DimB', ['B1', 'B2', 'B3'], undefined, undefined, [dimMapping('DimA')], {
        _dima: []
      }),
      dim('DimC', ['C1', 'C2', 'C3', 'C4', 'C5'])
    ])

    const resolvedSubs = readAndResolveSubscripts('subscript')
    // Note: The full pretty-printed objects are included as comments below to help
    // show how they are expanded by each shorthand version (for reference purposes)
    expect(resolvedSubs).toEqual([
      // {
      //   modelName: 'DimA',
      //   modelValue: ['A1', 'A2', 'A3'],
      //   modelMappings: [],
      //   name: '_dima',
      //   value: ['_a1', '_a2', '_a3'],
      //   size: 3,
      //   family: '_dima',
      //   mappings: {}
      // },
      dim('DimA', ['A1', 'A2', 'A3']),
      // {
      //   modelName: 'DimB',
      //   modelValue: ['B1', 'B2', 'B3'],
      //   modelMappings: [{ toDim: 'DimA', value: [] }],
      //   name: '_dimb',
      //   value: ['_b1', '_b2', '_b3'],
      //   size: 3,
      //   family: '_dimb',
      //   mappings: {
      //     _dima: ['_b1', '_b2', '_b3']
      //   }
      // },
      dim('DimB', ['B1', 'B2', 'B3'], undefined, undefined, [dimMapping('DimA')], {
        _dima: ['_b1', '_b2', '_b3']
      }),
      dim('DimC', ['C1', 'C2', 'C3', 'C4', 'C5']),
      // { name: '_a1', value: 0, size: 1, family: '_dima', mappings: {} },
      sub('A1', 'DimA', 0),
      // { name: '_a2', value: 1, size: 1, family: '_dima', mappings: {} },
      sub('A2', 'DimA', 1),
      // { name: '_a3', value: 2, size: 1, family: '_dima', mappings: {} },
      sub('A3', 'DimA', 2),
      // { name: '_b1', value: 0, size: 1, family: '_dimb', mappings: {} },
      sub('B1', 'DimB', 0),
      // { name: '_b2', value: 1, size: 1, family: '_dimb', mappings: {} },
      sub('B2', 'DimB', 1),
      // { name: '_b3', value: 2, size: 1, family: '_dimb', mappings: {} }
      sub('B3', 'DimB', 2),
      sub('C1', 'DimC', 0),
      sub('C2', 'DimC', 1),
      sub('C3', 'DimC', 2),
      sub('C4', 'DimC', 3),
      sub('C5', 'DimC', 4)
    ])
  })
})
