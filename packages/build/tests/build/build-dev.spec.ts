// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { resolve as resolvePath } from 'path'

import { describe, expect, it } from 'vitest'

import type { ModelSpec, UserConfig } from '../../src'
import { build } from '../../src'

import { buildOptions } from '../_shared/build-options'

const modelSpec: ModelSpec = {
  startTime: 2000,
  endTime: 2100,
  inputVarNames: ['Y'],
  outputVarNames: ['Z'],
  datFiles: []
}

describe('build in development mode', () => {
  it('should return undefined exit code', async () => {
    const userConfig: UserConfig = {
      rootDir: resolvePath(__dirname, '..'),
      prepDir: resolvePath(__dirname, 'sde-prep'),
      modelFiles: [resolvePath(__dirname, '..', '_shared', 'sample.mdl')],
      plugins: [
        {
          preGenerate: async () => modelSpec
        }
      ]
    }

    const result = await build('development', buildOptions(userConfig))
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }
    expect(result.value.exitCode).toBe(undefined)
  })
})
