// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ResolvedConfig } from '../../_shared/resolved-config'

import { computeInputFilesHash } from './hash-files'

describe('computeInputFilesHash', () => {
  let tempDir: string

  function writeTestFile(path: string, content: string) {
    mkdirSync(join(tempDir, dirname(path)), { recursive: true })
    writeFileSync(join(tempDir, path), content)
  }

  function config(modelFiles: string[], modelInputPaths: string[] = []): ResolvedConfig {
    return {
      rootDir: tempDir,
      prepDir: tempDir,
      modelFiles: modelFiles.map(f => join(tempDir, f)),
      modelInputPaths
    } as ResolvedConfig
  }

  beforeEach(() => {
    tempDir = join(tmpdir(), `hash-files-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
    // The `spec.json` file is always included in the hash, so write one for every test
    writeTestFile('spec.json', '{"inputVarNames":["a"],"outputVarNames":["b"]}')
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('should compute a stable hash for a known set of input files', async () => {
    // Note: This test pins the exact hash values so that any change to the hashing
    // scheme is caught.  The hash is the concatenation of one base64-encoded SHA-1
    // digest per input file, where each digest covers the file's base name followed
    // by its contents.
    writeTestFile('model.mdl', 'x = 1 ~~|')

    const hash = await computeInputFilesHash(config(['model.mdl']))

    expect(hash).toBe('LLyGa2yqCtnE1nG3cjVGCUUJoQo=foSrukKqBbYbYMm1iFTsn5XVsKA=')
  })

  it('should produce the same hash when called repeatedly with unchanged files', async () => {
    writeTestFile('model.mdl', 'x = 1 ~~|')

    const hash1 = await computeInputFilesHash(config(['model.mdl']))
    const hash2 = await computeInputFilesHash(config(['model.mdl']))

    expect(hash1).toBe(hash2)
  })

  it('should produce a different hash when the contents of an input file change', async () => {
    writeTestFile('model.mdl', 'x = 1 ~~|')
    const before = await computeInputFilesHash(config(['model.mdl']))

    writeTestFile('model.mdl', 'x = 2 ~~|')
    const after = await computeInputFilesHash(config(['model.mdl']))

    expect(after).not.toBe(before)
  })

  it('should produce a different hash when an input file is renamed', async () => {
    // Note that the base name of each file contributes to the hash, so renaming a
    // file changes the hash even if the contents are unchanged
    writeTestFile('model.mdl', 'x = 1 ~~|')
    const before = await computeInputFilesHash(config(['model.mdl']))

    renameSync(join(tempDir, 'model.mdl'), join(tempDir, 'renamed.mdl'))
    const after = await computeInputFilesHash(config(['renamed.mdl']))

    expect(after).not.toBe(before)
  })

  it('should include the spec file in the hash', async () => {
    writeTestFile('model.mdl', 'x = 1 ~~|')
    const before = await computeInputFilesHash(config(['model.mdl']))

    writeTestFile('spec.json', '{"inputVarNames":["c"],"outputVarNames":["d"]}')
    const after = await computeInputFilesHash(config(['model.mdl']))

    expect(after).not.toBe(before)
  })

  it('should hash the files matched by `modelInputPaths` when it is defined', async () => {
    writeTestFile('model.mdl', 'x = 1 ~~|')
    writeTestFile('data/a.csv', 'a,1')
    writeTestFile('data/b.csv', 'b,2')

    const before = await computeInputFilesHash(config(['model.mdl'], ['data/**/*.csv']))

    // Changing a file matched by the glob should change the hash
    writeTestFile('data/a.csv', 'a,99')
    const after = await computeInputFilesHash(config(['model.mdl'], ['data/**/*.csv']))

    expect(after).not.toBe(before)
  })

  it('should ignore the model files when `modelInputPaths` is defined', async () => {
    writeTestFile('model.mdl', 'x = 1 ~~|')
    writeTestFile('data/a.csv', 'a,1')

    const before = await computeInputFilesHash(config(['model.mdl'], ['data/**/*.csv']))

    // The mdl file is not included when `modelInputPaths` is defined, so changing
    // it should not affect the hash
    writeTestFile('model.mdl', 'x = 2 ~~|')
    const after = await computeInputFilesHash(config(['model.mdl'], ['data/**/*.csv']))

    expect(after).toBe(before)
  })

  it('should handle an empty input file', async () => {
    writeTestFile('empty.mdl', '')

    const hash = await computeInputFilesHash(config(['empty.mdl']))

    expect(hash.length).toBeGreaterThan(0)
  })
})
