// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { ModelSpec } from './model-spec'

describe('ModelSpec', () => {
  it('should allow for an empty spec', () => {
    const spec: ModelSpec = {}
    expect(spec).toEqual({})
  })

  it('should allow for the preferred input and output properties', () => {
    const spec: ModelSpec = {
      inputs: ['Input A', 'Input B'],
      outputs: ['Time', 'Output X']
    }
    expect(spec.inputs).toEqual(['Input A', 'Input B'])
    expect(spec.outputs).toEqual(['Time', 'Output X'])
  })

  it('should allow for the deprecated input and output properties', () => {
    const spec: ModelSpec = {
      inputVarNames: ['Input A'],
      outputVarNames: ['Time']
    }
    expect(spec.inputVarNames).toEqual(['Input A'])
    expect(spec.outputVarNames).toEqual(['Time'])
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
      // @ts-expect-error The `inputs` property should be an array of strings
      inputs: 'Input A'
    }
    expect(spec).toBeDefined()
  })
})
