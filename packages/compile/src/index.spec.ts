// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import type { ModelSpec, ParsedModel } from './index'
import { canonicalName, parseModel } from './index'

describe('public API type declarations', () => {
  it('should export the ModelSpec type', () => {
    const spec: ModelSpec = {
      inputVarNames: ['Input A'],
      outputVarNames: ['Time']
    }
    expect(spec.inputVarNames).toEqual(['Input A'])
  })

  it('should declare the canonicalName signature', () => {
    const varId: string = canonicalName('Some Var')
    expect(varId).toBe('_some_var')
  })

  it('should declare the parseModel signature', () => {
    const parsedModel: ParsedModel = parseModel('x = 1 ~~|', 'vensim')
    expect(parsedModel.kind).toBe('vensim')
  })

  it('should reject incorrectly typed arguments', () => {
    // Note that this function is intentionally never called; the assertions here are
    // verified by the type checker (see the `type-check` script) and not at runtime
    function invalidUsage() {
      // @ts-expect-error The `name` argument should be a string
      canonicalName(42)
      // @ts-expect-error The `modelKind` argument should be 'vensim' or 'xmile'
      parseModel('x = 1 ~~|', 'bogus')
    }
    expect(invalidUsage).toBeDefined()
  })
})
