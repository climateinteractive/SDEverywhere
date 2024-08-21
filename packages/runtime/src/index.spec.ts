// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { perfNow, perfElapsed } from './index'

describe('non-public perf functions', () => {
  it('should be exported', () => {
    // The `perf` functions are not officially part of the public API, but they should be
    // exported for use in experimental tools, so we verify that they are accessible as
    // top-level exports
    const t0 = perfNow()
    const elapsed = perfElapsed(t0)
    expect(elapsed).toBeDefined()
  })
})
