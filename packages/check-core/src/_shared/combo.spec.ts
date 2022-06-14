// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { cartesianProductOf } from './combo'

describe('cartesianProductOf', () => {
  it('should produce all combinations', () => {
    const arr: string[][] = [
      ['a1', 'a2'],
      ['b1', 'b2', 'b3']
    ]
    const prod = cartesianProductOf(arr)
    expect(prod).toEqual([
      ['a1', 'b1'],
      ['a1', 'b2'],
      ['a1', 'b3'],
      ['a2', 'b1'],
      ['a2', 'b2'],
      ['a2', 'b3']
    ])
  })
})
