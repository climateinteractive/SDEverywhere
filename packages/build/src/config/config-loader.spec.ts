// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { loadConfig } from './config-loader'
import { type UserConfig } from './user-config'

describe('config loader', () => {
  it('should resolve the bundleListing property', async () => {
    const userConfig: UserConfig = {
      modelFiles: [],
      bundleListing: true,
      modelSpec: async () => {
        return {
          inputs: [],
          outputs: []
        }
      }
    }
    const result = await loadConfig('production', userConfig, '', '')
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }
    expect(result.value.resolvedConfig.bundleListing).toBe(true)
  })
})
