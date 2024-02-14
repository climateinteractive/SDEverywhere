// Copyright (c) 2022 Climate Interactive / New Venture Fund

import { resolve as resolvePath } from 'path'

import { describe, expect, it } from 'vitest'

import type { ModelSpec, Plugin, UserConfig } from '../../src'
import { build } from '../../src'

import { buildOptions } from '../_shared/build-options'

const modelSpec: ModelSpec = {
  inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
  outputs: [{ varName: 'Z' }],
  datFiles: []
}

const plugin = (num: number, calls: string[]) => {
  const record = (f: string) => {
    calls.push(`plugin ${num}: ${f}`)
  }
  const p: Plugin = {
    init: async () => {
      record('init')
    },
    preGenerate: async () => {
      record('preGenerate')
    },
    preProcessMdl: async () => {
      record('preProcessMdl')
    },
    postProcessMdl: async (_, mdlContent) => {
      record('postProcessMdl')
      return mdlContent
    },
    preGenerateC: async () => {
      record('preGenerateC')
    },
    postGenerateC: async (_, cContent) => {
      record('postGenerateC')
      return cContent
    },
    postGenerate: async () => {
      record('postGenerate')
      return true
    },
    postBuild: async () => {
      record('postBuild')
      return true
    },
    watch: async () => {
      record('watch')
    }
  }
  return p
}

describe('build in production mode', () => {
  it('should skip certain callbacks if model files array is empty', async () => {
    const calls: string[] = []

    const userConfig: UserConfig = {
      rootDir: resolvePath(__dirname, '..'),
      prepDir: resolvePath(__dirname, 'sde-prep'),
      modelFiles: [],
      modelSpec: async () => {
        calls.push('modelSpec')
        return modelSpec
      },
      plugins: [plugin(1, calls), plugin(2, calls)]
    }

    const result = await build('production', buildOptions(userConfig))
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }

    expect(result.value.exitCode).toBe(0)
    expect(calls).toEqual([
      'plugin 1: init',
      'plugin 2: init',
      'modelSpec',
      'plugin 1: preGenerate',
      'plugin 2: preGenerate',
      'plugin 1: postGenerate',
      'plugin 2: postGenerate',
      'plugin 1: postBuild',
      'plugin 2: postBuild'
    ])
  })

  it('should call plugin functions in the expected order', async () => {
    const calls: string[] = []

    const userConfig: UserConfig = {
      rootDir: resolvePath(__dirname, '..'),
      prepDir: resolvePath(__dirname, 'sde-prep'),
      modelFiles: [resolvePath(__dirname, '..', '_shared', 'sample.mdl')],
      modelSpec: async () => {
        calls.push('modelSpec')
        return modelSpec
      },
      plugins: [plugin(1, calls), plugin(2, calls)]
    }

    const result = await build('production', buildOptions(userConfig))
    if (result.isErr()) {
      throw new Error('Expected ok result but got: ' + result.error.message)
    }

    expect(result.value.exitCode).toBe(0)
    expect(calls).toEqual([
      'plugin 1: init',
      'plugin 2: init',
      'modelSpec',
      'plugin 1: preGenerate',
      'plugin 2: preGenerate',
      'plugin 1: preProcessMdl',
      'plugin 2: preProcessMdl',
      'plugin 1: postProcessMdl',
      'plugin 2: postProcessMdl',
      'plugin 1: preGenerateC',
      'plugin 2: preGenerateC',
      'plugin 1: postGenerateC',
      'plugin 2: postGenerateC',
      'plugin 1: postGenerate',
      'plugin 2: postGenerate',
      'plugin 1: postBuild',
      'plugin 2: postBuild'
    ])
  })

  it('should fail if generate step throws an error when dat file cannot be read', async () => {
    const modelSpec: ModelSpec = {
      inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
      outputs: [{ varName: 'Z' }],
      datFiles: ['unknown.dat']
    }

    const userConfig: UserConfig = {
      rootDir: resolvePath(__dirname, '..'),
      prepDir: resolvePath(__dirname, 'sde-prep'),
      modelFiles: [resolvePath(__dirname, '..', '_shared', 'sample.mdl')],
      modelSpec: async () => {
        return modelSpec
      }
    }

    const result = await build('production', buildOptions(userConfig))
    if (result.isOk()) {
      throw new Error('Expected err result but got: ' + result.value)
    }

    // TODO: This error message isn't helpful, but it's due to the fact that
    // the `generateC` function spawns an `sde` process rather than calling
    // into the compiler directly.  Once we improve it to call into the
    // compiler, the error message here should be the one from `readDat`.
    expect(result.error.message).toBe('Child process failed (code=1)')
  })

  it('should fail if flatten step throws an error', async () => {
    expect(1 + 1).toBe(3)
  })
})
