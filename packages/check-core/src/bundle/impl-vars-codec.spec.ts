// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { describe, it, expect } from 'vitest'

import type { ImplVar } from './var-types'
import { encodeImplVars, decodeImplVars, type EncodedImplVars } from './impl-vars-codec'

describe('encodeImplVars', () => {
  it('should encode simple variables without subscripts', () => {
    const input: { [key: string]: ImplVar[] } = {
      constants: [
        {
          varId: '_variable_name_1',
          varName: 'Variable name 1',
          varType: 'const',
          varIndex: 1
        }
      ]
    }

    const encoded = encodeImplVars(input)

    expect(encoded.subscripts).toEqual([])
    expect(encoded.variables).toEqual([
      {
        n: 'Variable name 1',
        i: '_variable_name_1',
        x: 1
      }
    ])
    expect(encoded.varTypes).toEqual(['const'])
    expect(encoded.varInstances.constants).toEqual([[0, 0]])
  })

  it('should encode variables with subscripts', () => {
    const input: { [key: string]: ImplVar[] } = {
      constants: [
        {
          varId: '_variable_name_2[_sub_a1,_sub_b1]',
          varName: 'Variable name 2[Sub A1,Sub B1]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 0]
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b2]',
          varName: 'Variable name 2[Sub A1,Sub B2]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 1]
        }
      ]
    }

    const encoded = encodeImplVars(input)

    expect(encoded.subscripts).toEqual([
      { n: 'Sub A1', i: '_sub_a1' },
      { n: 'Sub B1', i: '_sub_b1' },
      { n: 'Sub B2', i: '_sub_b2' }
    ])
    expect(encoded.variables).toEqual([
      {
        n: 'Variable name 2',
        i: '_variable_name_2',
        x: 2
      }
    ])
    expect(encoded.varTypes).toEqual(['const'])
    expect(encoded.varInstances.constants).toEqual([
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 2, 0, 1]
    ])
  })

  it('should deduplicate variables, subscripts, and types', () => {
    const input: { [key: string]: ImplVar[] } = {
      constants: [
        {
          varId: '_variable_name_1',
          varName: 'Variable name 1',
          varType: 'const',
          varIndex: 1
        },
        {
          varId: '_variable_name_2[_sub_a1]',
          varName: 'Variable name 2[Sub A1]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0]
        }
      ],
      auxVars: [
        {
          varId: '_variable_name_3',
          varName: 'Variable name 3',
          varType: 'aux',
          varIndex: 3
        },
        {
          varId: '_variable_name_2[_sub_a1]',
          varName: 'Variable name 2[Sub A1]',
          varType: 'aux',
          varIndex: 2,
          subscriptIndices: [0]
        }
      ]
    }

    const encoded = encodeImplVars(input)

    // Should have 1 unique subscript
    expect(encoded.subscripts).toEqual([{ n: 'Sub A1', i: '_sub_a1' }])

    // Should have 3 unique variables
    expect(encoded.variables).toEqual([
      { n: 'Variable name 1', i: '_variable_name_1', x: 1 },
      { n: 'Variable name 2', i: '_variable_name_2', x: 2 },
      { n: 'Variable name 3', i: '_variable_name_3', x: 3 }
    ])

    // Should have 2 unique types
    expect(encoded.varTypes).toEqual(['const', 'aux'])

    // Should reference the same subscript and variable indices
    expect(encoded.varInstances.constants).toEqual([
      [0, 0],
      [0, 1, 0, 0]
    ])
    expect(encoded.varInstances.auxVars).toEqual([
      [1, 2],
      [1, 1, 0, 0]
    ])
  })

  it('should encode a complex example of multiple variables in different groups', () => {
    const input: { [key: string]: ImplVar[] } = {
      constants: [
        {
          varId: '_variable_name_1',
          varName: 'Variable name 1',
          varType: 'const',
          varIndex: 1
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b1]',
          varName: 'Variable name 2[Sub A1,Sub B1]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 0]
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b2]',
          varName: 'Variable name 2[Sub A1,Sub B2]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 1]
        }
      ],
      auxVars: [
        {
          varId: '_variable_name_3',
          varName: 'Variable name 3',
          varType: 'aux',
          varIndex: 3
        }
      ]
    }

    const encoded = encodeImplVars(input)

    expect(encoded.subscripts).toEqual([
      { n: 'Sub A1', i: '_sub_a1' },
      { n: 'Sub B1', i: '_sub_b1' },
      { n: 'Sub B2', i: '_sub_b2' }
    ])
    expect(encoded.variables).toEqual([
      { n: 'Variable name 1', i: '_variable_name_1', x: 1 },
      { n: 'Variable name 2', i: '_variable_name_2', x: 2 },
      { n: 'Variable name 3', i: '_variable_name_3', x: 3 }
    ])
    expect(encoded.varTypes).toEqual(['const', 'aux'])
    expect(encoded.varInstances.constants).toEqual([
      [0, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 1, 0, 2, 0, 1]
    ])
    expect(encoded.varInstances.auxVars).toEqual([[1, 2]])
  })
})

describe('decodeImplVars', () => {
  it('should decode simple variables without subscripts', () => {
    const encoded: EncodedImplVars = {
      subscripts: [],
      variables: [{ n: 'Variable name 1', i: '_variable_name_1', x: 1 }],
      varTypes: ['const'],
      varInstances: {
        constants: [[0, 0]]
      }
    }

    const decoded = decodeImplVars(encoded)

    expect(decoded).toEqual({
      constants: [
        {
          varId: '_variable_name_1',
          varName: 'Variable name 1',
          varType: 'const',
          varIndex: 1
        }
      ]
    })
  })

  it('should decode variables with subscripts', () => {
    const encoded: EncodedImplVars = {
      subscripts: [
        { n: 'Sub A1', i: '_sub_a1' },
        { n: 'Sub B1', i: '_sub_b1' },
        { n: 'Sub B2', i: '_sub_b2' }
      ],
      variables: [{ n: 'Variable name 2', i: '_variable_name_2', x: 2 }],
      varTypes: ['const'],
      varInstances: {
        constants: [
          [0, 0, 0, 1, 0, 0],
          [0, 0, 0, 2, 0, 1]
        ]
      }
    }

    const decoded = decodeImplVars(encoded)

    expect(decoded).toEqual({
      constants: [
        {
          varId: '_variable_name_2[_sub_a1,_sub_b1]',
          varName: 'Variable name 2[Sub A1,Sub B1]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 0]
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b2]',
          varName: 'Variable name 2[Sub A1,Sub B2]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 1]
        }
      ]
    })
  })

  it('should decode a complex example of multiple variables in different groups', () => {
    const encoded: EncodedImplVars = {
      subscripts: [
        { n: 'Sub A1', i: '_sub_a1' },
        { n: 'Sub B1', i: '_sub_b1' },
        { n: 'Sub B2', i: '_sub_b2' }
      ],
      variables: [
        { n: 'Variable name 1', i: '_variable_name_1', x: 1 },
        { n: 'Variable name 2', i: '_variable_name_2', x: 2 },
        { n: 'Variable name 3', i: '_variable_name_3', x: 3 }
      ],
      varTypes: ['const', 'aux'],
      varInstances: {
        constants: [
          [0, 0],
          [0, 1, 0, 1, 0, 0],
          [0, 1, 0, 2, 0, 1]
        ],
        auxVars: [[1, 2]]
      }
    }

    const decoded = decodeImplVars(encoded)

    expect(decoded).toEqual({
      constants: [
        {
          varId: '_variable_name_1',
          varName: 'Variable name 1',
          varType: 'const',
          varIndex: 1
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b1]',
          varName: 'Variable name 2[Sub A1,Sub B1]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 0]
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b2]',
          varName: 'Variable name 2[Sub A1,Sub B2]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 1]
        }
      ],
      auxVars: [
        {
          varId: '_variable_name_3',
          varName: 'Variable name 3',
          varType: 'aux',
          varIndex: 3
        }
      ]
    })
  })
})

describe('encodeImplVars + decodeImplVars roundtrip', () => {
  it('should preserve data through encode/decode roundtrip', () => {
    const original: { [key: string]: ImplVar[] } = {
      constants: [
        {
          varId: '_variable_name_1',
          varName: 'Variable name 1',
          varType: 'const',
          varIndex: 1
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b1]',
          varName: 'Variable name 2[Sub A1,Sub B1]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 0]
        },
        {
          varId: '_variable_name_2[_sub_a1,_sub_b2]',
          varName: 'Variable name 2[Sub A1,Sub B2]',
          varType: 'const',
          varIndex: 2,
          subscriptIndices: [0, 1]
        }
      ],
      auxVars: [
        {
          varId: '_variable_name_3',
          varName: 'Variable name 3',
          varType: 'aux',
          varIndex: 3
        },
        {
          varId: '_variable_name_4[_sub_c1]',
          varName: 'Variable name 4[Sub C1]',
          varType: 'aux',
          varIndex: 4,
          subscriptIndices: [2]
        }
      ],
      evalLevels: [
        {
          varId: '_variable_name_5[_sub_d1,_sub_e1]',
          varName: 'Variable name 5[Sub D1,Sub E1]',
          varType: 'level',
          varIndex: 5,
          subscriptIndices: [1, 3]
        }
      ]
    }

    const encoded = encodeImplVars(original)
    const decoded = decodeImplVars(encoded)

    expect(decoded).toEqual(original)
  })

  it('should handle empty groups', () => {
    const original: { [key: string]: ImplVar[] } = {
      constants: [],
      auxVars: [
        {
          varId: '_variable_name_1',
          varName: 'Variable name 1',
          varType: 'aux',
          varIndex: 1
        }
      ]
    }

    const encoded = encodeImplVars(original)
    const decoded = decodeImplVars(encoded)

    expect(decoded).toEqual(original)
  })

  it('should handle complex subscript scenarios', () => {
    const original: { [key: string]: ImplVar[] } = {
      constants: [
        {
          varId: '_var[_a,_b,_c]',
          varName: 'Var[A,B,C]',
          varType: 'const',
          varIndex: 1,
          subscriptIndices: [0, 1, 2]
        },
        {
          varId: '_var[_a,_b,_d]',
          varName: 'Var[A,B,D]',
          varType: 'const',
          varIndex: 1,
          subscriptIndices: [0, 1, 3]
        },
        {
          varId: '_var[_a,_c,_d]',
          varName: 'Var[A,C,D]',
          varType: 'const',
          varIndex: 1,
          subscriptIndices: [0, 2, 3]
        }
      ]
    }

    const encoded = encodeImplVars(original)
    const decoded = decodeImplVars(encoded)

    expect(decoded).toEqual(original)
  })
})
