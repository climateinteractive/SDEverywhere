// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { matrixScenarios } from './scenario'

describe('matrixScenarios', () => {
  it('should return an array of scenarios', () => {
    const inputVarKeys = ['in1', 'in2', 'in3']

    // There should be 3 "all" scenarios, plus 2 "min/max" scenarios for each input
    const scenarios = matrixScenarios(inputVarKeys)
    expect(scenarios.length).toEqual(9)
  })
})
