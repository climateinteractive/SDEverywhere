// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveWatchPaths, watchPaths } from './watch-paths'

describe('resolveWatchPaths', () => {
  let tempDir: string

  function writeTestFile(path: string) {
    mkdirSync(join(tempDir, dirname(path)), { recursive: true })
    writeFileSync(join(tempDir, path), '')
  }

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = join(tmpdir(), `watch-paths-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up the temporary directory
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('should handle simple file paths', () => {
    // Create test files
    writeTestFile('a.js')
    writeTestFile('b/c.js')

    // Test with a simple file path (non-glob)
    const resolved = resolveWatchPaths(['a.js', 'b/c.js'], tempDir)

    // Non-glob paths should be returned as-is
    expect(resolved).toEqual(['a.js', 'b/c.js'])
  })

  it('should handle glob patterns without negation', () => {
    // Create test directory structure
    writeTestFile('config/a.js')
    writeTestFile('config/b/c.js')

    // Test with a glob pattern
    const watchPaths = ['config/**']
    const resolved = resolveWatchPaths(watchPaths, tempDir)

    // Should resolve to absolute paths of all files in config directory
    expect(resolved.length).toBe(2)
    expect(resolved).toContain(join(tempDir, 'config', 'a.js'))
    expect(resolved).toContain(join(tempDir, 'config', 'b', 'c.js'))
  })

  it('should handle single glob pattern with negation using *', () => {
    // Create test directory structure
    writeTestFile('loc/en.po')
    writeTestFile('loc/es.po')
    writeTestFile('loc/fr.po')
    writeTestFile('loc/one/en.po')
    writeTestFile('loc/one/es.po')
    writeTestFile('loc/one/fr.po')
    writeTestFile('loc/two/en.po')
    writeTestFile('loc/two/es.po')
    writeTestFile('loc/two/fr.po')

    // Test with a negation pattern (should match everything except en.po)
    const watchPaths = ['loc/*/!(en.po)']
    const resolved = resolveWatchPaths(watchPaths, tempDir)

    // Should resolve to absolute paths, excluding en.po files
    expect(resolved.length).toBe(4)
    expect(resolved).toContain(join(tempDir, 'loc', 'one', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'one', 'fr.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'two', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'two', 'fr.po'))
  })

  // TODO: This test is failing because tinyglobby doesn't currently handle
  // the extglob negation pattern used here; unskip this once the following
  // issue is fixed:
  //   https://github.com/SuperchupuDev/tinyglobby/issues/188
  it.skip('should handle single glob pattern with negation using **', () => {
    // Create test directory structure
    writeTestFile('loc/en.po')
    writeTestFile('loc/es.po')
    writeTestFile('loc/fr.po')
    writeTestFile('loc/one/en.po')
    writeTestFile('loc/one/es.po')
    writeTestFile('loc/one/fr.po')
    writeTestFile('loc/two/en.po')
    writeTestFile('loc/two/es.po')
    writeTestFile('loc/two/fr.po')

    // Test with a negation pattern (should match everything except en.po)
    const watchPaths = ['loc/**/!(en.po)']
    const resolved = resolveWatchPaths(watchPaths, tempDir)

    // Should resolve to absolute paths, excluding en.po files
    expect(resolved.length).toBe(6)
    expect(resolved).toContain(join(tempDir, 'loc', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'fr.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'one', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'one', 'fr.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'two', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'two', 'fr.po'))
  })

  it('should handle multiple glob patterns that involve negation', () => {
    // Create test directory structure
    writeTestFile('loc/en.po')
    writeTestFile('loc/es.po')
    writeTestFile('loc/fr.po')
    writeTestFile('loc/one/en.po')
    writeTestFile('loc/one/es.po')
    writeTestFile('loc/one/fr.po')
    writeTestFile('loc/two/en.po')
    writeTestFile('loc/two/es.po')
    writeTestFile('loc/two/fr.po')

    // Test with a negation pattern (should match everything except en.po)
    const watchPaths = ['loc/**/*.po', '!loc/**/en.po']
    const resolved = resolveWatchPaths(watchPaths, tempDir)

    // Should resolve to absolute paths, excluding en.po files
    expect(resolved.length).toBe(6)
    expect(resolved).toContain(join(tempDir, 'loc', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'fr.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'one', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'one', 'fr.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'two', 'es.po'))
    expect(resolved).toContain(join(tempDir, 'loc', 'two', 'fr.po'))
  })

  it('should handle mixed simple paths and glob patterns', () => {
    // Create test files
    writeTestFile('x.js')
    writeTestFile('config/a.js')
    writeTestFile('config/b/c.js')

    // Mix of simple path and glob pattern
    const watchPaths = ['x.js', 'config/**']
    const resolved = resolveWatchPaths(watchPaths, tempDir)

    // Simple path should be as-is, glob should be resolved
    expect(resolved.length).toBe(3)
    expect(resolved).toContain('x.js')
    expect(resolved).toContain(join(tempDir, 'config', 'a.js'))
    expect(resolved).toContain(join(tempDir, 'config', 'b', 'c.js'))
  })
})

describe('watchPaths', () => {
  let tempDir: string
  let cleanupFns: Array<() => void> = []

  function writeTestFile(path: string, content = '') {
    mkdirSync(join(tempDir, dirname(path)), { recursive: true })
    writeFileSync(join(tempDir, path), content)
  }

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = join(tmpdir(), `watch-paths-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up watchers
    for (const cleanup of cleanupFns) {
      cleanup()
    }
    cleanupFns = []

    // Clean up the temporary directory
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('should invoke onChange when a simple file path is modified', async () => {
    // Create test file
    writeTestFile('a.js', 'initial')

    // Set up watcher
    const changedPaths: string[] = []
    const cleanup = watchPaths(['a.js'], tempDir, path => {
      changedPaths.push(path)
    })
    cleanupFns.push(cleanup)

    // Wait for watcher to be ready
    await new Promise(resolve => setTimeout(resolve, 100))

    // Modify the file
    writeTestFile('a.js', 'modified')

    // Wait for change event
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was called
    expect(changedPaths.length).toBeGreaterThan(0)
    expect(changedPaths[0]).toBe('a.js')
  })

  it('should invoke onChange when a file matching a glob pattern is modified', async () => {
    // Create test files
    writeTestFile('config/a.js', 'initial')
    writeTestFile('config/b/c.js', 'initial')

    // Set up watcher
    const changedPaths: string[] = []
    const cleanup = watchPaths(['config/**'], tempDir, path => {
      changedPaths.push(path)
    })
    cleanupFns.push(cleanup)

    // Wait for watcher to be ready
    await new Promise(resolve => setTimeout(resolve, 100))

    // Modify one of the files
    writeTestFile('config/a.js', 'modified')

    // Wait for change event
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was called
    expect(changedPaths.length).toBeGreaterThan(0)
    expect(changedPaths.some(p => p.includes('a.js'))).toBe(true)
  })

  it('should invoke onChange for files matching glob pattern with negation using *', async () => {
    // Create test directory structure
    writeTestFile('loc/one/es.po', 'initial')
    writeTestFile('loc/one/fr.po', 'initial')
    writeTestFile('loc/one/en.po', 'initial')

    // Set up watcher (should watch everything except en.po)
    const changedPaths: string[] = []
    const cleanup = watchPaths(['loc/*/!(en.po)'], tempDir, path => {
      changedPaths.push(path)
    })
    cleanupFns.push(cleanup)

    // Wait for watcher to be ready
    await new Promise(resolve => setTimeout(resolve, 100))

    // Modify es.po (should trigger onChange)
    writeTestFile('loc/one/es.po', 'modified')

    // Wait for change event
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was called for es.po
    expect(changedPaths.length).toBeGreaterThan(0)
    expect(changedPaths.some(p => p.includes('es.po'))).toBe(true)

    // Clear the array
    changedPaths.length = 0

    // Modify en.po (should NOT trigger onChange)
    writeTestFile('loc/one/en.po', 'modified')

    // Wait
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was NOT called for en.po
    expect(changedPaths.every(p => !p.includes('en.po'))).toBe(true)
  })

  it('should invoke onChange for files matching multiple glob patterns with negation', async () => {
    // Create test directory structure
    writeTestFile('loc/es.po', 'initial')
    writeTestFile('loc/fr.po', 'initial')
    writeTestFile('loc/en.po', 'initial')
    writeTestFile('loc/one/es.po', 'initial')

    // Set up watcher (should watch all .po files except en.po)
    const changedPaths: string[] = []
    const cleanup = watchPaths(['loc/**/*.po', '!loc/**/en.po'], tempDir, path => {
      changedPaths.push(path)
    })
    cleanupFns.push(cleanup)

    // Wait for watcher to be ready
    await new Promise(resolve => setTimeout(resolve, 100))

    // Modify es.po (should trigger onChange)
    writeTestFile('loc/es.po', 'modified')

    // Wait for change event
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was called for es.po
    expect(changedPaths.length).toBeGreaterThan(0)
    expect(changedPaths.some(p => p.includes('es.po'))).toBe(true)

    // Clear the array
    changedPaths.length = 0

    // Modify en.po (should NOT trigger onChange)
    writeTestFile('loc/en.po', 'modified')

    // Wait
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was NOT called for en.po
    expect(changedPaths.every(p => !p.includes('en.po'))).toBe(true)
  })

  it('should invoke onChange when files are modified with mixed simple paths and glob patterns', async () => {
    // Create test files
    writeTestFile('x.js', 'initial')
    writeTestFile('config/a.js', 'initial')

    // Set up watcher
    const changedPaths: string[] = []
    const cleanup = watchPaths(['x.js', 'config/**'], tempDir, path => {
      changedPaths.push(path)
    })
    cleanupFns.push(cleanup)

    // Wait for watcher to be ready
    await new Promise(resolve => setTimeout(resolve, 100))

    // Modify x.js
    writeTestFile('x.js', 'modified')

    // Wait for change event
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was called
    expect(changedPaths.length).toBeGreaterThan(0)
    expect(changedPaths[0]).toBe('x.js')
  })

  it.only('should invoke onChange when files are added or removed in a plain directory', async () => {
    // Create test directory
    mkdirSync(join(tempDir, 'src'), { recursive: true })
    writeTestFile('src/existing.js', 'initial')

    // Set up watcher with a plain directory path
    const changedPaths: string[] = []
    const cleanup = watchPaths(['src'], tempDir, path => {
      changedPaths.push(path)
    })
    cleanupFns.push(cleanup)

    // Verify onChange was not called initially
    expect(changedPaths.length).toBe(0)

    // Wait for watcher to be ready
    await new Promise(resolve => setTimeout(resolve, 100))

    // Add a new file
    writeTestFile('src/new.js', 'new file')

    // Wait for add event
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was called
    console.log(changedPaths)
    expect(changedPaths.length).toBe(1)
    expect(changedPaths[0].includes('new.js')).toBe(true)

    // // Remove the file
    // rmSync(join(tempDir, 'src', 'new.js'))

    // // Wait for unlink event
    // await new Promise(resolve => setTimeout(resolve, 300))

    // // Verify onChange was called
    // expect(changedPaths.length).toBe(1)
    // expect(changedPaths[0].includes('new.js')).toBe(true)
  })
})
