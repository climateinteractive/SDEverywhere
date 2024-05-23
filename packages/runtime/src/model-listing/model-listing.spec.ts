// Copyright (c) 2023 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'
import { ModelListing } from './model-listing'
import { Outputs } from '../_shared/outputs'

const json = `
{
  "dimensions": [
    {
      "name": "_dima",
      "value": [
        "_a1",
        "_a2"
      ]
    },
    {
      "name": "_dimb",
      "value": [
        "_b1",
        "_b2",
        "_b3"
      ]
    }
  ],
  "variables": [
    {
      "refId": "_a[_a1]",
      "varName": "_a",
      "subscripts": [
        "_a1"
      ],
      "families": [
        "_dima"
      ],
      "varIndex": 1
    },
    {
      "refId": "_a[_a2]",
      "varName": "_a",
      "subscripts": [
        "_a2"
      ],
      "families": [
        "_dima"
      ],
      "varIndex": 1
    },
    {
      "refId": "_d",
      "varName": "_d",
      "subscripts": [
        "_dima"
      ],
      "families": [
        "_dima"
      ],
      "varIndex": 2
    },
    {
      "refId": "_e",
      "varName": "_e",
      "subscripts": [
        "_dima",
        "_dimb"
      ],
      "families": [
        "_dima",
        "_dimb"
      ],
      "varIndex": 3
    },
    {
      "refId": "_x",
      "varName": "_x",
      "varIndex": 4
    }
  ]
}
`

describe('ModelListing', () => {
  describe('deriveOutputs', () => {
    it('should return Outputs that can accept the specified internal variables', () => {
      const listing = new ModelListing(json)
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
