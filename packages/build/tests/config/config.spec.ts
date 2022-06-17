// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { join as joinPath } from 'path'

import { describe, expect, it } from 'vitest'

import { build } from '../../src'

import { buildOptions } from '../_shared/build-options'

describe('build config file loading', () => {
  it('should fail if config file cannot be found', async () => {
    const configPath = joinPath(__dirname, 'sde.unknown.js')
    const result = await build('production', buildOptions(configPath))
    if (result.isOk()) {
      throw new Error('Expected error result')
    }
    expect(result.error.message).toBe(`Cannot find config file '${configPath}'`)
  })

  it('should fail if config file is invalid', async () => {
    const configPath = joinPath(__dirname, 'sde.config.txt')
    const result = await build('production', buildOptions(configPath))
    if (result.isOk()) {
      throw new Error('Expected error result')
    }
    expect(result.error.message).toBe(`Failed to load config file '${configPath}'`)
  })

  it('should proceed if config file is valid', async () => {
    const configPath = joinPath(__dirname, 'sde.config.js')
    const result = await build('production', buildOptions(configPath))
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }
    expect(result.value.exitCode).toBe(0)
  })
})