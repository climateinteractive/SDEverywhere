// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join as joinPath } from 'path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BuildContext, ResolvedModelSpec } from '@sdeverywhere/build'

import type { WasmPluginOptions } from './options'
import { wasmPlugin } from './plugin'

/** A staged file that was registered by the plugin. */
interface StagedFile {
  srcDir: string
  srcFile: string
  dstDir: string
  dstFile: string
}

/** A minimal stand-in for the `BuildContext` that records what the plugin does. */
interface FakeContext {
  context: BuildContext
  stagedFiles: StagedFile[]
  emccArgs: string[]
}

/**
 * Create a fake build context.  The `spawnChild` implementation acts like `emcc`: it writes
 * the output JS file, and it also writes a `.wasm` file next to it unless `SINGLE_FILE` is
 * enabled.
 *
 * @param prepDir The prep directory.
 */
function createFakeContext(prepDir: string): FakeContext {
  const fake: FakeContext = { context: undefined, stagedFiles: [], emccArgs: [] }
  fake.context = {
    config: { prepDir },
    log: () => {},
    canonicalVarId: (name: string) => `_${name.toLowerCase()}`,
    prepareStagedFile: (srcDir: string, srcFile: string, dstDir: string, dstFile: string) => {
      fake.stagedFiles.push({ srcDir, srcFile, dstDir, dstFile })
      const stagedDir = joinPath(prepDir, 'staged', srcDir)
      mkdirSync(stagedDir, { recursive: true })
      return joinPath(stagedDir, srcFile)
    },
    spawnChild: async (_cwd: string, _command: string, args: string[]) => {
      fake.emccArgs = args
      const outputJsPath = args[args.indexOf('-o') + 1]
      writeFileSync(outputJsPath, '// generated')
      if (!args.includes('-sSINGLE_FILE=1')) {
        writeFileSync(outputJsPath.replace(/\.js$/, '.wasm'), 'wasm')
      }
      return { exitCode: 0 }
    }
  } as unknown as BuildContext
  return fake
}

describe('wasmPlugin', () => {
  let tempDir: string
  let prepDir: string
  let emsdkDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(joinPath(tmpdir(), 'plugin-wasm-spec-'))
    prepDir = joinPath(tempDir, 'sde-prep')
    emsdkDir = joinPath(tempDir, 'emsdk')
    mkdirSync(joinPath(prepDir, 'build'), { recursive: true })
    mkdirSync(emsdkDir)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  /** Run the plugin steps that generate the Wasm model. */
  async function runPlugin(options: WasmPluginOptions): Promise<FakeContext> {
    const fake = createFakeContext(prepDir)
    const plugin = wasmPlugin({ emsdkDir, ...options })
    const modelSpec = { outputs: [{ varName: 'Output' }], bundleListing: false } as unknown as ResolvedModelSpec
    await plugin.preGenerate(fake.context, modelSpec)
    await plugin.postGenerateCode(fake.context, 'c', '')
    return fake
  }

  it('should embed the Wasm binary in the JS file by default', async () => {
    const outputJsPath = joinPath(tempDir, 'out', 'model.js')
    const fake = await runPlugin({ outputJsPath })

    expect(fake.emccArgs).toContain('-sSINGLE_FILE=1')
    expect(fake.stagedFiles).toEqual([
      { srcDir: 'model', srcFile: 'generated-model.js', dstDir: dirname(outputJsPath), dstFile: 'model.js' }
    ])
  })

  it('should write the Wasm binary to a separate file when `outputWasmPath` is defined', async () => {
    const outputJsPath = joinPath(tempDir, 'out', 'model.js')
    const outputWasmPath = joinPath(tempDir, 'out', 'model.wasm')
    const fake = await runPlugin({ outputJsPath, outputWasmPath })

    // The default arguments should be adjusted so that the binary is written separately
    expect(fake.emccArgs).not.toContain('-sSINGLE_FILE=1')
    expect(fake.emccArgs).toContain(`-sINCOMING_MODULE_JS_API=['wasmBinary']`)
    expect(fake.stagedFiles).toEqual([
      { srcDir: 'model', srcFile: 'generated-model.js', dstDir: dirname(outputJsPath), dstFile: 'model.js' },
      { srcDir: 'model', srcFile: 'generated-model.wasm', dstDir: dirname(outputWasmPath), dstFile: 'model.wasm' }
    ])
    expect(existsSync(joinPath(prepDir, 'staged', 'model', 'generated-model.wasm'))).toBe(true)
  })

  it('should use custom `emccArgs` unchanged when `outputWasmPath` is defined', async () => {
    const outputWasmPath = joinPath(tempDir, 'out', 'model.wasm')
    const fake = await runPlugin({ outputWasmPath, emccArgs: ['-O2', '-sMODULARIZE=1'] })

    expect(fake.emccArgs.slice(-2)).toEqual(['-O2', '-sMODULARIZE=1'])
  })

  it('should throw an error if `outputWasmPath` is defined but emcc did not write a Wasm binary', async () => {
    const outputWasmPath = joinPath(tempDir, 'out', 'model.wasm')
    await expect(runPlugin({ outputWasmPath, emccArgs: ['-sSINGLE_FILE=1'] })).rejects.toThrow(/SINGLE_FILE/)
  })
})
