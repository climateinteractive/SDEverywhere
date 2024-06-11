// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'
import { Outputs } from '../_shared/outputs'
import { ModelListing } from './model-listing'

const listingJson = `
{
  "dimensions": [
    {
      "id": "_dima",
      "subIds": [
        "_a1",
        "_a2"
      ]
    },
    {
      "id": "_dimb",
      "subIds": [
        "_b1",
        "_b2",
        "_b3"
      ]
    }
  ],
  "variables": [
    {
      "id": "_a",
      "dimIds": [
        "_dima"
      ],
      "index": 1
    },
    {
      "id": "_d",
      "dimIds": [
        "_dima"
      ],
      "index": 2
    },
    {
      "id": "_e",
      "dimIds": [
        "_dima",
        "_dimb"
      ],
      "index": 3
    },
    {
      "id": "_x",
      "index": 4
    }
  ]
}
`

describe('ModelListing', () => {
  describe('deriveOutputs', () => {
    it('should return Outputs that can accept the specified internal variables', () => {
      const listing = new ModelListing(JSON.parse(listingJson))
      const normalOutputs = new Outputs(['_d'], 2000, 2002, 0.5)
      const implOutputs = listing.deriveOutputs(normalOutputs, ['_x', '_d[_a2]', '_e[_a1,_b3]'])
      expect(implOutputs.startTime).toBe(normalOutputs.startTime)
      expect(implOutputs.endTime).toBe(normalOutputs.endTime)
      expect(implOutputs.saveFreq).toBe(normalOutputs.saveFreq)
      expect(implOutputs.seriesLength).toBe(normalOutputs.seriesLength)
      expect(implOutputs.varIds).toEqual(['_x', '_d[_a2]', '_e[_a1,_b3]'])
      expect(implOutputs.varSpecs).toEqual([
        {
          varIndex: 4
        },
        {
          varIndex: 2,
          subscriptIndices: [1]
        },
        {
          varIndex: 3,
          subscriptIndices: [0, 2]
        }
      ])
    })
  })
})
