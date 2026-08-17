// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { ModelSpec as CoreModelSpec } from '@sdeverywhere/compile'

import type { ModelSpec, ResolvedModelSpec } from './model-spec'

/**
 * Assert that the two given types are identical.  This resolves to `true` only if `T`
 * and `U` are mutually assignable.
 */
type Identical<T, U> = (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U ? 1 : 2 ? true : false

/**
 * The `ResolvedModelSpec` properties that are declared explicitly (rather than being
 * inherited from the compile package `ModelSpec`) so that they can be documented in
 * terms of the resolved, non-optional values.  These must stay in sync with the
 * corresponding properties in the compile package.
 */
type RedeclaredProp = 'datFiles' | 'bundleListing' | 'customConstants' | 'customLookups' | 'customOutputs'

describe('ModelSpec', () => {
  it('should allow inputs and outputs to be declared as variable names', () => {
    const modelSpec: ModelSpec = {
      inputs: ['Input A'],
      outputs: ['Time', 'Output X']
    }
    expect(modelSpec.inputs).toEqual(['Input A'])
    expect(modelSpec.outputs).toEqual(['Time', 'Output X'])
  })

  it('should allow inputs and outputs to be declared as specs', () => {
    const modelSpec: ModelSpec = {
      inputs: [{ varName: 'Input A', inputId: '1', defaultValue: 0, minValue: 0, maxValue: 1 }],
      outputs: [{ varName: 'Output X' }]
    }
    expect(modelSpec.inputs).toEqual([{ varName: 'Input A', inputId: '1', defaultValue: 0, minValue: 0, maxValue: 1 }])
    expect(modelSpec.outputs).toEqual([{ varName: 'Output X' }])
  })

  it('should allow the code generation properties that are shared with the compile package', () => {
    const modelSpec: ModelSpec = {
      inputs: [],
      outputs: [],
      datFiles: ['data.dat', { 'prefix ': 'other.dat' }],
      bundleListing: true,
      customConstants: true,
      customLookups: ['Some Var'],
      customOutputs: false
    }
    expect(modelSpec.datFiles).toEqual(['data.dat', { 'prefix ': 'other.dat' }])
    expect(modelSpec.bundleListing).toBe(true)
  })

  it('should allow the model analysis properties that are shared with the compile package', () => {
    // Note that these properties previously had to be smuggled through the untyped
    // `options` bag; they are now declared as first class properties
    const modelSpec: ModelSpec = {
      inputs: [],
      outputs: [],
      directData: { '?data': 'data.xlsx' },
      dimensionFamilies: { DimA: 'DimA' },
      specialSeparationDims: { _a: '_dima' },
      separateAllVarsWithDims: ['_dimb']
    }
    expect(modelSpec.directData).toEqual({ '?data': 'data.xlsx' })
    expect(modelSpec.dimensionFamilies).toEqual({ DimA: 'DimA' })
    expect(modelSpec.specialSeparationDims).toEqual({ _a: '_dima' })
    expect(modelSpec.separateAllVarsWithDims).toEqual(['_dimb'])
  })

  it('should reject the deprecated spec.json property names', () => {
    const modelSpec: ModelSpec = {
      inputs: [],
      outputs: [],
      // @ts-expect-error The `sde.config.js` format uses `datFiles` rather than `externalDatfiles`
      externalDatfiles: ['data.dat']
    }
    expect(modelSpec).toBeDefined()
  })

  it('should reject the lower-level spec.json variable name properties', () => {
    // Note that the `sde.config.js` format uses the higher-level `inputs` and `outputs`
    // properties; the plain variable name properties are specific to `spec.json`
    const specWithInputVarNames: ModelSpec = {
      inputs: [],
      outputs: [],
      // @ts-expect-error The `sde.config.js` format uses `inputs` rather than `inputVarNames`
      inputVarNames: ['Input A']
    }
    const specWithOutputVarNames: ModelSpec = {
      inputs: [],
      outputs: [],
      // @ts-expect-error The `sde.config.js` format uses `outputs` rather than `outputVarNames`
      outputVarNames: ['Output X']
    }
    expect(specWithInputVarNames).toBeDefined()
    expect(specWithOutputVarNames).toBeDefined()
  })
})

describe('ResolvedModelSpec', () => {
  it('should require the properties that are optional in ModelSpec', () => {
    const resolvedModelSpec: ResolvedModelSpec = {
      inputVarNames: ['Input A'],
      inputs: [{ varName: 'Input A' }],
      outputVarNames: ['Output X'],
      outputs: [{ varName: 'Output X' }],
      datFiles: [],
      bundleListing: false,
      customConstants: false,
      customLookups: false,
      customOutputs: false
    }
    expect(resolvedModelSpec.datFiles).toEqual([])
  })

  it('should declare the redeclared properties with the same types used by the compile package', () => {
    // Note that these assertions are verified by the type checker (see the `type-check`
    // script); they will fail if the type of one of these properties is changed in the
    // compile package without a matching change here
    const assertions: {
      [K in RedeclaredProp]: Identical<ResolvedModelSpec[K], NonNullable<CoreModelSpec[K]>>
    } = {
      datFiles: true,
      bundleListing: true,
      customConstants: true,
      customLookups: true,
      customOutputs: true
    }
    expect(Object.values(assertions).every(v => v === true)).toBe(true)
  })

  it('should reject a spec that is missing a required property', () => {
    // @ts-expect-error The `bundleListing` property is required
    const resolvedModelSpec: ResolvedModelSpec = {
      inputVarNames: [],
      inputs: [],
      outputVarNames: [],
      outputs: [],
      datFiles: [],
      customConstants: false,
      customLookups: false,
      customOutputs: false
    }
    expect(resolvedModelSpec).toBeDefined()
  })
})
