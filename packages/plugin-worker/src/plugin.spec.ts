// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join as joinPath } from 'path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { BuildContext } from '@sdeverywhere/build'

import type { WorkerPluginOptions } from './options'
import { workerPlugin } from './plugin'

/** A file that was registered by the plugin to be copied from the staged directory. */
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
}

/**
 * Create a fake build context that writes staged files to the given prep directory.
 *
 * @param prepDir The prep directory.
 */
function createFakeContext(prepDir: string): FakeContext {
  const fake: FakeContext = { context: undefined, stagedFiles: [] }
  const stagedPath = (srcDir: string, srcFile: string) => {
    const stagedDir = joinPath(prepDir, 'staged', srcDir)
    mkdirSync(stagedDir, { recursive: true })
    return joinPath(stagedDir, srcFile)
  }
  fake.context = {
    config: { prepDir },
    log: () => {},
    prepareStagedFile: (srcDir: string, srcFile: string, dstDir: string, dstFile: string) => {
      fake.stagedFiles.push({ srcDir, srcFile, dstDir, dstFile })
      return stagedPath(srcDir, srcFile)
    },
    writeStagedFile: (srcDir: string, dstDir: string, filename: string, content: string) => {
      fake.stagedFiles.push({ srcDir, srcFile: filename, dstDir, dstFile: filename })
      writeFileSync(stagedPath(srcDir, filename), content)
    }
  } as unknown as BuildContext
  return fake
}

describe('workerPlugin', () => {
  let tempDir: string
  let prepDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(joinPath(tmpdir(), 'plugin-worker-spec-'))
    prepDir = joinPath(tempDir, 'sde-prep')
    // Write a stand-in for the generated model that the worker is built around
    const stagedModelDir = joinPath(prepDir, 'staged', 'model')
    mkdirSync(stagedModelDir, { recursive: true })
    writeFileSync(
      joinPath(stagedModelDir, 'generated-model.js'),
      'export default async function loadGeneratedModel() { return { kind: "test-model" } }\n'
    )
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  /** Run the plugin and return the fake context. */
  async function runPlugin(options?: WorkerPluginOptions): Promise<FakeContext> {
    const fake = createFakeContext(prepDir)
    await workerPlugin(options).postGenerate(fake.context, undefined)
    return fake
  }

  /** Return the contents of the staged worker file. */
  function stagedWorkerJs(): string {
    return readFileSync(joinPath(prepDir, 'staged', 'model', 'worker.js'), 'utf8')
  }

  it('should build the worker and stage it for each of the `outputPaths`', async () => {
    const outputPath = joinPath(tempDir, 'out', 'worker.js')
    const fake = await runPlugin({ outputPaths: [outputPath] })

    expect(fake.stagedFiles).toEqual([
      { srcDir: 'model', srcFile: 'worker.js', dstDir: dirname(outputPath), dstFile: 'worker.js' }
    ])
    expect(stagedWorkerJs()).toContain('test-model')
  })

  it('should stage a module that exports the worker source for each of the `outputSourceModulePaths`', async () => {
    const outputPath = joinPath(tempDir, 'out', 'worker-source.ts')
    const fake = await runPlugin({ outputSourceModulePaths: [outputPath] })

    expect(fake.stagedFiles).toEqual([
      { srcDir: 'model', srcFile: 'worker-source.ts', dstDir: dirname(outputPath), dstFile: 'worker-source.ts' }
    ])

    // The module should export the (unmodified) worker source code as its default export
    const moduleSource = readFileSync(joinPath(prepDir, 'staged', 'model', 'worker-source.ts'), 'utf8')
    const match = moduleSource.match(/^export default (".*")$/m)
    expect(match).not.toBeNull()
    expect(JSON.parse(match[1])).toEqual(stagedWorkerJs())
  })
})
