// Copyright (c) 2025 Climate Interactive / New Venture Fund

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import type { BuildContext, ResolvedModelSpec } from '@sdeverywhere/build'

import { deployPlugin } from './plugin'

const testsDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = joinPath(testsDir, '__fixtures__')

interface MockBuildContext extends BuildContext {
  _logs: Array<{ level: string; msg: string }>
}

/**
 * Create a minimal mock `BuildContext` for testing.
 */
function createMockContext(
  rootDir: string,
  prepDir: string,
  mode: 'production' | 'development' = 'production'
): MockBuildContext {
  const logs: Array<{ level: string; msg: string }> = []
  return {
    config: {
      rootDir,
      prepDir,
      mode
    },
    log: (level: string, msg: string) => {
      logs.push({ level, msg })
    },
    // Add a way to access logs for assertions
    _logs: logs
  } as unknown as MockBuildContext
}

/**
 * Set up fixture directories and files for testing.
 */
function setupFixtures(testName: string, includeFiles: boolean): string {
  const testDir = joinPath(fixturesDir, testName)

  // Clean up any existing test directory
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true })
  }

  // Create test directory
  mkdirSync(testDir, { recursive: true })

  if (includeFiles) {
    // Create default build product structure
    const appDir = joinPath(testDir, 'packages/app/public')
    mkdirSync(appDir, { recursive: true })
    writeFileSync(joinPath(appDir, 'index.html'), '<html><body>App</body></html>')

    const prepDir = joinPath(testDir, 'sde-prep')
    mkdirSync(prepDir, { recursive: true })
    writeFileSync(joinPath(prepDir, 'check-bundle.js'), '// Bundle content')

    const checkReportDir = joinPath(prepDir, 'check-report')
    mkdirSync(checkReportDir, { recursive: true })
    writeFileSync(joinPath(checkReportDir, 'index.html'), '<html><body>Report</body></html>')
  }

  return testDir
}

/**
 * Clean up fixture directories after testing.
 */
function cleanupFixtures(testName: string): void {
  const testDir = joinPath(fixturesDir, testName)
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true })
  }
}

// The plugin doesn't use the `modelSpec` argument, so we use an empty object
const modelSpec: ResolvedModelSpec = {} as unknown as ResolvedModelSpec

describe('deployPlugin', () => {
  describe('branch name validation', () => {
    it('should succeed if branch name is valid', async () => {
      const testName = 'valid-branch-name'
      const testDir = setupFixtures(testName, false)
      const prepDir = joinPath(testDir, 'sde-prep')

      try {
        const context = createMockContext(testDir, prepDir)
        // TODO: We shouldn't rely on environment variables for testing
        process.env.TEST_BRANCH_NAME = 'feature/valid-branch-NAME-123'
        const plugin = deployPlugin()
        await plugin.init?.(context.config)
      } finally {
        cleanupFixtures(testName)
      }
    })

    it('should throw an error if branch name contains invalid characters', async () => {
      const testName = 'invalid-branch-name'
      const testDir = setupFixtures(testName, false)
      const prepDir = joinPath(testDir, 'sde-prep')

      try {
        const context = createMockContext(testDir, prepDir)
        const plugin = deployPlugin()

        // TODO: We shouldn't rely on environment variables for testing
        process.env.TEST_BRANCH_NAME = 'feature/invalid+branch+name'
        await expect(plugin.init?.(context.config)).rejects.toThrow(
          `Branch name 'feature/invalid+branch+name' contains invalid characters; branch names must only contain: /, -, _, a-z, A-Z, 0-9`
        )

        process.env.TEST_BRANCH_NAME = 'feature//invalid-branch-name'
        await expect(plugin.init?.(context.config)).rejects.toThrow(
          `Branch name 'feature//invalid-branch-name' cannot contain consecutive slashes "//"`
        )

        process.env.TEST_BRANCH_NAME = '/feature/invalid-branch-name'
        await expect(plugin.init?.(context.config)).rejects.toThrow(
          `Branch name '/feature/invalid-branch-name' cannot start or end with "/"`
        )

        process.env.TEST_BRANCH_NAME = 'feature/invalid-branch-name/'
        await expect(plugin.init?.(context.config)).rejects.toThrow(
          `Branch name 'feature/invalid-branch-name/' cannot start or end with "/"`
        )
      } finally {
        cleanupFixtures(testName)
      }
    })
  })

  describe('with no options provided', () => {
    it('should copy default build products', async () => {
      const testName = 'no-options'
      const testDir = setupFixtures(testName, true)
      const prepDir = joinPath(testDir, 'sde-prep')
      const deployDir = joinPath(prepDir, 'deploy')

      try {
        const context = createMockContext(testDir, prepDir)
        const plugin = deployPlugin()

        // Run the plugin
        const result = await plugin.postBuild?.(context, modelSpec)
        expect(result).toBe(true)

        // Deploy directory should be created
        expect(existsSync(deployDir)).toBe(true)

        // Default build products should be copied
        expect(existsSync(joinPath(deployDir, 'app/index.html'))).toBe(true)
        expect(existsSync(joinPath(deployDir, 'extras/check-bundle.js'))).toBe(true)
        expect(existsSync(joinPath(deployDir, 'extras/check-compare-to-base/index.html'))).toBe(true)

        // Should log that storeArtifacts is skipped in test mode
        const logs = context._logs
        expect(logs.some(log => log.msg.includes('Skipping `storeArtifacts` step in test mode'))).toBe(true)
      } finally {
        cleanupFixtures(testName)
      }
    })

    it('should skip missing default build products without failing', async () => {
      const testName = 'missing-default-files'
      const testDir = setupFixtures('missing-default-files', false)
      const prepDir = joinPath(testDir, 'sde-prep')
      const deployDir = joinPath(prepDir, 'deploy')

      try {
        const context = createMockContext(testDir, prepDir)
        const plugin = deployPlugin()

        // Run the plugin (should succeed even if no files were copied)
        const result = await plugin.postBuild?.(context, modelSpec)
        expect(result).toBe(true)

        // Deploy directory should be created even if no files were copied
        expect(existsSync(deployDir)).toBe(true)
      } finally {
        cleanupFixtures(testName)
      }
    })
  })

  describe('with all options defined', () => {
    it('should use provided options and copy files to custom locations', async () => {
      const testName = 'all-options'
      const testDir = setupFixtures(testName, false)
      const prepDir = joinPath(testDir, 'sde-prep')
      const customDeployDir = joinPath(testDir, 'custom-deploy')

      // Create custom build products
      const customSrcDir = joinPath(testDir, 'custom-src')
      mkdirSync(customSrcDir, { recursive: true })
      writeFileSync(joinPath(customSrcDir, 'bundle.js'), '// Custom bundle')

      try {
        const context = createMockContext(testDir, prepDir)
        const plugin = deployPlugin({
          baseUrl: 'https://example.com/my-project',
          deployDir: customDeployDir,
          products: {
            customBundle: {
              displayName: 'custom bundle',
              srcPath: 'custom-src/bundle.js',
              dstPath: 'bundles/custom.js'
            }
          }
        })

        // Run the plugin
        const result = await plugin.postBuild?.(context, modelSpec)
        expect(result).toBe(true)

        // Custom deploy directory should be created
        expect(existsSync(customDeployDir)).toBe(true)

        // Custom build product should be copied
        expect(existsSync(joinPath(customDeployDir, 'bundles/custom.js'))).toBe(true)

        // Content should match
        const content = readFileSync(joinPath(customDeployDir, 'bundles/custom.js'), 'utf-8')
        expect(content).toBe('// Custom bundle')
      } finally {
        cleanupFixtures(testName)
      }
    })

    it('should fail when custom (non-default) products are missing', async () => {
      const testName = 'missing-custom'
      const testDir = setupFixtures(testName, false)
      const prepDir = joinPath(testDir, 'sde-prep')
      const customDeployDir = joinPath(testDir, 'custom-deploy')

      try {
        const context = createMockContext(testDir, prepDir)
        const plugin = deployPlugin({
          deployDir: customDeployDir,
          products: {
            customBundle: {
              displayName: 'Custom Bundle',
              srcPath: 'non-existent/bundle.js',
              dstPath: 'bundles/custom.js'
            }
          }
        })

        // Run `postBuild`; should throw error because custom product is missing
        await expect(plugin.postBuild?.(context, modelSpec)).rejects.toThrow('no such file or directory')
      } finally {
        cleanupFixtures(testName)
      }
    })
  })

  describe('in dev mode', () => {
    it('should skip deployment entirely', async () => {
      const testName = 'dev-mode'
      const testDir = setupFixtures(testName, true)
      const prepDir = joinPath(testDir, 'sde-prep')
      const deployDir = joinPath(prepDir, 'deploy')

      try {
        const context = createMockContext(testDir, prepDir, 'development')
        const plugin = deployPlugin()

        // Run the plugin
        const result = await plugin.postBuild?.(context, modelSpec)
        expect(result).toBe(true)

        // Deploy directory should NOT be created in dev mode
        expect(existsSync(deployDir)).toBe(false)
      } finally {
        cleanupFixtures(testName)
      }
    })
  })
})
