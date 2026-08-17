// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { ModelSpec } from './model-spec'
import { normalizeModelSpec } from './model-spec'

describe('ModelSpec', () => {
  it('should allow for an empty spec', () => {
    const spec: ModelSpec = {}
    expect(spec).toEqual({})
  })

  it('should allow for the input and output variable name properties', () => {
    const spec: ModelSpec = {
      inputVarNames: ['Input A', 'Input B'],
      outputVarNames: ['Time', 'Output X']
    }
    expect(spec.inputVarNames).toEqual(['Input A', 'Input B'])
    expect(spec.outputVarNames).toEqual(['Time', 'Output X'])
  })

  it('should not allow for the higher-level input and output spec properties', () => {
    // Note that a `spec.json` file only allows for plain variable names; the richer
    // `inputs` and `outputs` properties are specific to the build package
    const specWithInputs: ModelSpec = {
      // @ts-expect-error The `inputs` property is not supported in a `spec.json` file
      inputs: ['Input A']
    }
    const specWithOutputs: ModelSpec = {
      // @ts-expect-error The `outputs` property is not supported in a `spec.json` file
      outputs: ['Time']
    }
    expect(specWithInputs).toBeDefined()
    expect(specWithOutputs).toBeDefined()
  })

  it('should allow for the preferred dat file property', () => {
    const spec: ModelSpec = {
      datFiles: ['data.dat', { 'prefix ': 'other.dat' }]
    }
    expect(spec.datFiles).toEqual(['data.dat', { 'prefix ': 'other.dat' }])
  })

  it('should allow for the deprecated dat file property', () => {
    const spec: ModelSpec = {
      externalDatfiles: ['data.dat', { 'prefix ': 'other.dat' }]
    }
    expect(spec.externalDatfiles).toEqual(['data.dat', { 'prefix ': 'other.dat' }])
  })

  it('should allow for the direct data property', () => {
    const spec: ModelSpec = {
      directData: { '?data': 'data.xlsx' }
    }
    expect(spec.directData).toEqual({ '?data': 'data.xlsx' })
  })

  it('should allow for the subscript and separation properties', () => {
    const spec: ModelSpec = {
      dimensionFamilies: { DimA: 'DimA' },
      specialSeparationDims: { _a: '_dima', _b: ['_dimb', '_dimc'] },
      separateAllVarsWithDims: ['_dimd']
    }
    expect(spec.dimensionFamilies).toEqual({ DimA: 'DimA' })
    expect(spec.specialSeparationDims).toEqual({ _a: '_dima', _b: ['_dimb', '_dimc'] })
    expect(spec.separateAllVarsWithDims).toEqual(['_dimd'])
  })

  it('should allow for the code generation properties', () => {
    const spec: ModelSpec = {
      bundleListing: true,
      customConstants: true,
      customLookups: ['_x'],
      customOutputs: false
    }
    expect(spec.bundleListing).toBe(true)
    expect(spec.customConstants).toBe(true)
    expect(spec.customLookups).toEqual(['_x'])
    expect(spec.customOutputs).toBe(false)
  })

  it('should reject an unknown property', () => {
    const spec: ModelSpec = {
      // @ts-expect-error An unknown property should not be allowed
      bogusProperty: 1
    }
    expect(spec).toBeDefined()
  })

  it('should reject an incorrectly typed property', () => {
    const spec: ModelSpec = {
      // @ts-expect-error The `inputVarNames` property should be an array of strings
      inputVarNames: 'Input A'
    }
    expect(spec).toBeDefined()
  })
})

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
