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
    preGenerateCode: async format => {
      record(`preGenerateCode ${format}`)
    },
    postGenerateCode: async (_, format, content) => {
      record(`postGenerateCode ${format}`)
      return content
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
      genFormat: 'c',
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
      'plugin 1: preGenerateCode js',
      'plugin 2: preGenerateCode js',
      'plugin 1: postGenerateCode js',
      'plugin 2: postGenerateCode js',
      'plugin 1: postGenerate',
      'plugin 2: postGenerate',
      'plugin 1: postBuild',
      'plugin 2: postBuild'
    ])
  })

  describe('should fail if plugin throws error', () => {
    async function buildSample(plugin: Plugin): Promise<string> {
      const userConfig: UserConfig = {
        rootDir: resolvePath(__dirname, '..'),
        prepDir: resolvePath(__dirname, 'sde-prep'),
        modelFiles: [resolvePath(__dirname, '..', '_shared', 'sample.mdl')],
        modelSpec: async () => {
          return modelSpec
        },
        plugins: [plugin]
      }

      const result = await build('production', buildOptions(userConfig))
      if (result.isOk()) {
        throw new Error('Expected err result but got: ' + result.value)
      }

      return result.error.message
    }

    async function verify(pluginFunc: keyof Plugin): Promise<void> {
      const plugin = {} as Plugin
      plugin[pluginFunc] = async () => {
        throw new Error(`${pluginFunc} error`)
      }
      const msg = await buildSample(plugin)
      expect(msg).toBe(`${pluginFunc} error`)
    }

    it('in init', async () => verify('init'))
    it('in preGenerate', async () => verify('preGenerate'))
    it('in preProcessMdl', async () => verify('preProcessMdl'))
    it('in postProcessMdl', async () => verify('postProcessMdl'))
    it('in preGenerateCode', async () => verify('preGenerateCode'))
    it('in postGenerateCode', async () => verify('postGenerateCode'))
    it('in postGenerate', async () => verify('postGenerate'))
    it('in postBuild', async () => verify('postBuild'))
  })

  // TODO: Not sure how to cause the preprocessor to fail, so this test is
  // skipped for now
  it.skip('should fail if preprocess step throws an error', async () => {
    const modelSpec: ModelSpec = {
      inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
      outputs: [{ varName: 'Z' }],
      datFiles: []
    }

    const mdlDir = resolvePath(__dirname, '..', '_shared')
    const userConfig: UserConfig = {
      rootDir: resolvePath(__dirname, '..'),
      prepDir: resolvePath(__dirname, 'sde-prep'),
      modelFiles: [resolvePath(mdlDir, 'sample.mdl')],
      modelSpec: async () => {
        return modelSpec
      }
    }

    const result = await build('production', buildOptions(userConfig))
    if (result.isOk()) {
      throw new Error('Expected err result but got: ' + result.value)
    }

    // TODO: This error message isn't helpful, but it's due to the fact that
    // the `preprocess` function spawns an `sde` process rather than calling
    // into the compiler directly.  Once we improve it to call into the
    // compiler, we can improve the error message.
    expect(result.error.message).toBe(`Failed to flatten mdl files: 'sde flatten' command failed (code=1)`)
  })

  it('should fail if flatten step throws an error', async () => {
    const modelSpec: ModelSpec = {
      inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
      outputs: [{ varName: 'Z' }],
      datFiles: []
    }

    const mdlDir = resolvePath(__dirname, '..', '_shared')
    const userConfig: UserConfig = {
      rootDir: resolvePath(__dirname, '..'),
      prepDir: resolvePath(__dirname, 'sde-prep'),
      modelFiles: [resolvePath(mdlDir, 'submodel1.mdl'), resolvePath(mdlDir, 'submodel2.mdl')],
      modelSpec: async () => {
        return modelSpec
      }
    }

    const result = await build('production', buildOptions(userConfig))
    if (result.isOk()) {
      throw new Error('Expected err result but got: ' + result.value)
    }

    // TODO: This error message isn't helpful, but it's due to the fact that
    // the `flatten` function spawns an `sde` process rather than calling
    // into the compiler directly.  Once we improve it to call into the
    // compiler, we can improve the error message.
    expect(result.error.message).toBe(`Failed to flatten mdl files: 'sde flatten' command failed (code=1)`)
  })

  it('should fail if generate step throws an error when dat file cannot be read', async () => {
    const modelSpec: ModelSpec = {
      inputs: [{ varName: 'Y', defaultValue: 0, minValue: -10, maxValue: 10 }],
      outputs: [{ varName: 'Z' }],
      datFiles: ['unknown.dat']
    }

    const userConfig: UserConfig = {
      genFormat: 'c',
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
    // the `generateCode` function spawns an `sde` process rather than calling
    // into the compiler directly.  Once we improve it to call into the
    // compiler, the error message here should be the one from `readDat`.
    expect(result.error.message).toBe(`Failed to generate C code: 'sde generate' command failed (code=1)`)
  })
})
