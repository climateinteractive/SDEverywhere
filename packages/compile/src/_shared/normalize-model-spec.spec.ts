// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { ModelSpec } from './model-spec'
import { normalizeModelSpec } from './normalize-model-spec'

describe('normalizeModelSpec', () => {
  it('should return the same spec object that was provided', () => {
    const spec: ModelSpec = { datFiles: ['data.dat'] }
    expect(normalizeModelSpec(spec)).toBe(spec)
  })

  it('should return undefined if the spec is undefined', () => {
    expect(normalizeModelSpec(undefined)).toBeUndefined()
  })

  it('should leave `datFiles` unchanged if only the preferred property is defined', () => {
    const spec: ModelSpec = { datFiles: ['data.dat'] }
    normalizeModelSpec(spec)
    expect(spec.datFiles).toEqual(['data.dat'])
  })

  it('should copy the deprecated `externalDatfiles` property to `datFiles`', () => {
    const spec: ModelSpec = { externalDatfiles: ['data.dat', { 'prefix ': 'other.dat' }] }
    normalizeModelSpec(spec)
    expect(spec.datFiles).toEqual(['data.dat', { 'prefix ': 'other.dat' }])
  })

  it('should prefer `datFiles` if both properties are defined', () => {
    const spec: ModelSpec = {
      datFiles: ['preferred.dat'],
      externalDatfiles: ['deprecated.dat']
    }
    normalizeModelSpec(spec)
    expect(spec.datFiles).toEqual(['preferred.dat'])
  })

  it('should leave `datFiles` undefined if neither property is defined', () => {
    const spec: ModelSpec = {}
    normalizeModelSpec(spec)
    expect(spec.datFiles).toBeUndefined()
  })

  it('should leave the input and output variable name properties untouched', () => {
    // Note that these properties have not been renamed, so they should pass through
    // the normalization step unchanged
    const spec: ModelSpec = {
      inputVarNames: ['Input A'],
      outputVarNames: ['Time', 'Output X']
    }
    normalizeModelSpec(spec)
    expect(spec.inputVarNames).toEqual(['Input A'])
    expect(spec.outputVarNames).toEqual(['Time', 'Output X'])
  })
})
