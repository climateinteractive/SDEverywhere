// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expectTypeOf, it } from 'vitest'

import type { ModelInitArgs } from './model-init-args'
import type { AsyncModelRunnerOptions } from './runner'

describe('ModelInitArgs', () => {
  it('should accept the Wasm binary as an ArrayBuffer or a Uint8Array', () => {
    // Note that these checks are verified by the type checker (`pnpm type-check`)
    expectTypeOf<ArrayBuffer>().toMatchTypeOf<ModelInitArgs['wasmBinary']>()
    expectTypeOf<Uint8Array>().toMatchTypeOf<ModelInitArgs['wasmBinary']>()
    expectTypeOf<ArrayBuffer>().toMatchTypeOf<AsyncModelRunnerOptions['wasmBinary']>()
    expectTypeOf<Uint8Array>().toMatchTypeOf<AsyncModelRunnerOptions['wasmBinary']>()
  })
})
