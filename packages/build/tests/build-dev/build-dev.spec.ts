// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { rmSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import type { ModelSpec, UserConfig } from '../../src'
import { build } from '../../src'

import { buildOptions } from '../_shared/build-options'
import {} from 'vitest'

const modelSpec: ModelSpec = {
  inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
  outputs: [{ varName: 'Z' }],
  datFiles: []
}

describe('build in development mode', () => {
  beforeEach(() => {
    const prepDir = resolvePath(__dirname, 'sde-prep')
    rmSync(prepDir, { recursive: true, force: true })
  })

  it('should return undefined exit code', async () => {
    const userConfig: UserConfig = {
      rootDir: resolvePath(__dirname, '..'),
      prepDir: resolvePath(__dirname, 'sde-prep'),
      modelFiles: [resolvePath(__dirname, '..', '_shared', 'sample.mdl')],
      modelSpec: async () => modelSpec
    }

    const result = await build('development', buildOptions(userConfig))
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }
    expect(result.value.exitCode).toBe(undefined)
  })
})
