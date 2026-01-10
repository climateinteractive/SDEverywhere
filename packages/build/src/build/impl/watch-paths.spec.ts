// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
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
    const fullPath = join(tempDir, path)
    mkdirSync(join(tempDir, dirname(path)), { recursive: true })
    writeFileSync(fullPath, content)
    // Update file timestamps to ensure change is detected
    const now = new Date()
    utimesSync(fullPath, now, now)
  }

  /**
   * Set up a watcher and return helpers for promise-based waiting.
   *
   * @param patterns The paths to watch.
   * @param expectedChangeCount The number of change events to wait for.
   * @param timeoutMs Maximum time to wait for changes (default: 5000ms).
   * @returns An object with helpers for waiting and cleanup.
   */
  function setupWatcher(
    patterns: string[],
    expectedChangeCount: number,
    timeoutMs = 5000
  ): {
    changedPaths: string[]
    ready: Promise<void>
    waitForChanges: Promise<string[]>
    cleanup: () => void
  } {
    const changedPaths: string[] = []
    let resolveReady: (() => void) | undefined
    let resolveChanges: ((paths: string[]) => void) | undefined
    let timeoutId: NodeJS.Timeout | undefined

    const ready = new Promise<void>(resolve => {
      resolveReady = () => {
        // Add small delay after ready event for watcher to fully initialize
        setTimeout(() => resolve(), 50)
      }
    })

    const waitForChanges = new Promise<string[]>((resolve, reject) => {
      resolveChanges = resolve

      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${expectedChangeCount} change events (got ${changedPaths.length})`))
      }, timeoutMs)
    })

    const cleanup = watchPaths(
      patterns,
      tempDir,
      path => {
        changedPaths.push(path)
        if (changedPaths.length >= expectedChangeCount) {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          resolveChanges?.(changedPaths)
        }
      },
      () => {
        resolveReady?.()
      }
    )

    cleanupFns.push(cleanup)

    return {
      changedPaths,
      ready,
      waitForChanges,
      cleanup
    }
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
    const watcher = setupWatcher(['a.js'], 1)

    // Wait for watcher to be ready
    await watcher.ready

    // Modify the file
    writeTestFile('a.js', 'modified')

    // Wait for change event
    await watcher.waitForChanges

    // Verify onChange was called
    expect(watcher.changedPaths).toEqual(['a.js'])
  })

  it('should invoke onChange when a file matching a glob pattern is modified', async () => {
    // Create test files
    writeTestFile('config/a.js', 'initial')
    writeTestFile('config/b/c.js', 'initial')

    // Set up watcher
    const watcher = setupWatcher(['config/**'], 1)

    // Wait for watcher to be ready
    await watcher.ready

    // Modify one of the files
    writeTestFile('config/a.js', 'modified')

    // Wait for change event
    await watcher.waitForChanges

    // Verify onChange was called
    expect(watcher.changedPaths).toEqual(['config/a.js'])
  })

  it('should invoke onChange for files matching glob pattern with negation using *', async () => {
    // Create test directory structure
    writeTestFile('loc/one/es.po', 'initial')
    writeTestFile('loc/one/fr.po', 'initial')
    writeTestFile('loc/one/en.po', 'initial')

    // Set up watcher (should watch everything except en.po)
    const watcher = setupWatcher(['loc/*/!(en.po)'], 1)

    // Wait for watcher to be ready
    await watcher.ready

    // Modify es.po (should trigger onChange)
    writeTestFile('loc/one/es.po', 'modified')

    // Wait for change event
    await watcher.waitForChanges

    // Verify onChange was called for es.po
    expect(watcher.changedPaths).toEqual(['loc/one/es.po'])

    // Clear the array for the negative test
    watcher.changedPaths.length = 0

    // Modify en.po (should NOT trigger onChange)
    writeTestFile('loc/one/en.po', 'modified')

    // Wait a reasonable amount of time and verify no changes were detected
    // Note: We need a small timeout here to verify that nothing happens
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was NOT called for en.po
    expect(watcher.changedPaths.length).toBe(0)
  })

  it('should invoke onChange for files matching multiple glob patterns with negation', async () => {
    // Create test directory structure
    writeTestFile('loc/es.po', 'initial')
    writeTestFile('loc/fr.po', 'initial')
    writeTestFile('loc/en.po', 'initial')
    writeTestFile('loc/one/es.po', 'initial')

    // Set up watcher (should watch all .po files except en.po)
    const watcher = setupWatcher(['loc/**/*.po', '!loc/**/en.po'], 1)

    // Wait for watcher to be ready
    await watcher.ready

    // Modify es.po (should trigger onChange)
    writeTestFile('loc/es.po', 'modified')

    // Wait for change event
    await watcher.waitForChanges

    // Verify onChange was called for es.po
    expect(watcher.changedPaths).toEqual(['loc/es.po'])

    // Clear the array for the negative test
    watcher.changedPaths.length = 0

    // Modify en.po (should NOT trigger onChange)
    writeTestFile('loc/en.po', 'modified')

    // Wait a reasonable amount of time and verify no changes were detected
    // Note: We need a small timeout here to verify that nothing happens
    await new Promise(resolve => setTimeout(resolve, 300))

    // Verify onChange was NOT called for en.po
    expect(watcher.changedPaths.length).toBe(0)
  })

  it('should invoke onChange when files are modified with mixed simple paths and glob patterns', async () => {
    // Create test files
    writeTestFile('x.js', 'initial')
    writeTestFile('config/a.js', 'initial')

    // Set up watcher
    const watcher = setupWatcher(['x.js', 'config/**'], 1)

    // Wait for watcher to be ready
    await watcher.ready

    // Modify x.js
    writeTestFile('x.js', 'modified')

    // Wait for change event
    await watcher.waitForChanges

    // Verify onChange was called
    expect(watcher.changedPaths).toEqual(['x.js'])
  })

  it.skip('should invoke onChange when files are added or removed in a plain directory', async () => {
    // Create test file
    writeTestFile('src/existing.js', 'initial')

    // Set up watcher with a plain directory path
    const watcher = setupWatcher(['src'], 2)

    // Wait for watcher to be ready
    await watcher.ready

    // Verify onChange was not called initially
    expect(watcher.changedPaths.length).toBe(0)

    // Add a new file
    writeTestFile('src/new.js', 'new file')

    // Wait for add event
    await watcher.waitForChanges

    // Verify onChange was called
    expect(watcher.changedPaths.length).toBe(1)
    expect(watcher.changedPaths[0]).toBe('src/existing.js')

    // Remove the file
    rmSync(join(tempDir, 'src', 'new.js'))

    // Wait for unlink event
    await watcher.waitForChanges

    // Verify onChange was called
    // expect(watcher.changedPaths).toEqual(['src/existing.js'])
  })
})
