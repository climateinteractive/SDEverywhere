// Copyright (c) 2024 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { loadConfig } from './config-loader'
import { type UserConfig } from './user-config'

function config(genFormat: string | undefined): UserConfig {
  return {
    ...(genFormat ? { genFormat: genFormat as 'js' | 'c' } : {}),
    modelFiles: [],
    modelSpec: async () => {
      return {
        inputs: [],
        outputs: []
      }
    }
  }
}

describe('config loader', () => {
  it('should resolve genFormat when left undefined', async () => {
    const userConfig = config(undefined)
    const result = await loadConfig('production', userConfig, '', '')
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }
    expect(result.value.resolvedConfig.genFormat).toBe('js')
  })

  it('should resolve genFormat when set to js', async () => {
    const userConfig = config('js')
    const result = await loadConfig('production', userConfig, '', '')
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }
    expect(result.value.resolvedConfig.genFormat).toBe('js')
  })

  it('should resolve genFormat when set to c', async () => {
    const userConfig = config('c')
    const result = await loadConfig('production', userConfig, '', '')
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }
    expect(result.value.resolvedConfig.genFormat).toBe('c')
  })

  it('should fail if genFormat is invalid', async () => {
    const userConfig = config('JS')
    const result = await loadConfig('production', userConfig, '', '')
    if (result.isOk()) {
      throw new Error('Expected err result but got: ' + result.value)
    }
    expect(result.error.message).toBe(`The configured genFormat value is invalid; must be either 'js' or 'c'`)
  })
})
