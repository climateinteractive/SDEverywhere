// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resolveWatchPaths } from './watch-paths'

describe('resolveWatchPaths', () => {
  let tempDir: string

  function writeTestFile(path: string) {
    mkdirSync(join(tempDir, dirname(path)), { recursive: true })
    writeFileSync(join(tempDir, path), '')
  }

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = join(tmpdir(), `watch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
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

  it('should handle glob patterns with negation', () => {
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
