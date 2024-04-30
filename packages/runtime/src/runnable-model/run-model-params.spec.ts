// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { Outputs } from '../_shared'

import { BufferedRunModelParams, ReferencedRunModelParams } from './run-model-params'

describe('ReferencedRunModelParams', () => {
  it('should be updated from arguments when options is undefined', () => {
    const params = new ReferencedRunModelParams()

    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2100, 1)
    params.updateFromParams(inputs, outputs)

    expect(params.getInputs()).toEqual(new Float64Array([1, 2, 3]))
    expect(params.getInputIndices()).toBeUndefined()
  })

  it('should be updated from arguments when options includes input var specs', () => {})

  it('should be updated from arguments when options includes output var specs', () => {})
})

describe('BufferedRunModelParams', () => {
  it('should be updated from arguments when options is undefined', () => {})

  it('should be updated from arguments when options includes input var specs', () => {})

  it('should be updated from arguments when options includes output var specs', () => {})

  it.only('should be updated from an encoded buffer', () => {
    const params1 = new BufferedRunModelParams()

    const inputs = [1, 2, 3]
    const outputs = new Outputs(['_x', '_y'], 2000, 2100, 1)
    params1.updateFromParams(inputs, outputs)
    expect(params1.getInputs()).toEqual(new Float64Array([1, 2, 3]))

    const params2 = new BufferedRunModelParams()
    params2.updateFromEncodedBuffer(params1.getEncodedBuffer())
    expect(params2.getInputs()).toEqual(new Float64Array([1, 2, 3]))
  })
})
