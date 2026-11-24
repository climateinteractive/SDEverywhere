// Copyright (c) 2026 Climate Interactive / New Venture Fund

import type { InlineConfig } from 'vite'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BuildContext } from '@sdeverywhere/build'

import type { VitePluginOptions } from './options'
import { vitePlugin } from './plugin'

// Replace the Vite functions with mocks that record how they were called
const viteMocks = vi.hoisted(() => {
  return {
    build: vi.fn<(viteConfig: InlineConfig) => Promise<undefined>>(async () => undefined),
    createServer: vi.fn(async () => ({ listen: vi.fn(async () => undefined) }))
  }
})
vi.mock('vite', () => viteMocks)

/** The Vite config that is passed to the plugin in these tests. */
const config = { configFile: 'vite.config.js' }

/**
 * Create a minimal stand-in for the `BuildContext` for the given build mode.
 *
 * @param mode The build mode.
 */
function fakeContext(mode: 'development' | 'production'): BuildContext {
  return {
    config: { mode },
    log: () => {}
  } as unknown as BuildContext
}

/**
 * Add an empty `build` property to the given config object (if not already defined), which
 * simulates how Vite 8 modifies the config object that is passed to `build`.
 *
 * @param viteConfig The Vite config object to modify.
 */
async function addBuildProperty(viteConfig: InlineConfig): Promise<undefined> {
  viteConfig.build ??= {}
  return undefined
}

/**
 * Create the plugin with the given `apply` options.
 *
 * @param apply The `apply` options for the plugin.
 */
function createPlugin(apply?: VitePluginOptions['apply']) {
  return vitePlugin({ name: 'test', config, apply })
}

describe('vitePlugin', () => {
  beforeEach(() => {
    viteMocks.build.mockClear()
    viteMocks.createServer.mockClear()
  })

  describe('with `watch` in development mode', () => {
    it('should run an initial build in the first postBuild so that the output is available to other plugins', async () => {
      const plugin = createPlugin({ development: 'watch' })
      const context = fakeContext('development')

      await plugin.postGenerate(context, undefined)
      expect(viteMocks.build).not.toHaveBeenCalled()

      await plugin.postBuild(context, undefined)
      expect(viteMocks.build).toHaveBeenCalledTimes(1)
      expect(viteMocks.build).toHaveBeenCalledWith(config)
    })

    it('should not run a build in later postBuild calls (the watcher takes care of rebuilding)', async () => {
      const plugin = createPlugin({ development: 'watch' })
      const context = fakeContext('development')

      await plugin.postBuild(context, undefined)
      await plugin.postBuild(context, undefined)
      await plugin.postBuild(context, undefined)
      expect(viteMocks.build).toHaveBeenCalledTimes(1)
    })

    it('should run `vite build` in watch mode in the watch callback', async () => {
      const plugin = createPlugin({ development: 'watch' })

      await plugin.watch(undefined)
      expect(viteMocks.build).toHaveBeenCalledTimes(1)
      expect(viteMocks.build).toHaveBeenCalledWith({ build: { watch: {} }, ...config })
    })

    it('should run `vite build` in watch mode even if Vite modified the config during the initial build', async () => {
      // Vite 8 adds a `build` property to the given config object when resolving it, so
      // simulate that here for the initial build
      viteMocks.build.mockImplementationOnce(addBuildProperty)
      const localConfig: InlineConfig = { configFile: 'vite.config.js' }
      const plugin = vitePlugin({ name: 'test', config: localConfig, apply: { development: 'watch' } })

      await plugin.postBuild(fakeContext('development'), undefined)
      await plugin.watch(undefined)
      expect(viteMocks.build).toHaveBeenCalledTimes(2)
      expect(viteMocks.build).toHaveBeenLastCalledWith({ configFile: 'vite.config.js', build: { watch: {} } })
    })

    it('should not modify the config object that is passed in the plugin options', async () => {
      // Simulate Vite 8 adding a `build` property to the given config object for both builds
      viteMocks.build.mockImplementationOnce(addBuildProperty).mockImplementationOnce(addBuildProperty)
      const localConfig: InlineConfig = { configFile: 'vite.config.js' }
      const plugin = vitePlugin({ name: 'test', config: localConfig, apply: { development: 'watch' } })

      await plugin.postBuild(fakeContext('development'), undefined)
      await plugin.watch(undefined)
      expect(localConfig).toEqual({ configFile: 'vite.config.js' })
    })

    it('should preserve other build options from the given config when enabling watch mode', async () => {
      const localConfig: InlineConfig = { configFile: 'vite.config.js', build: { outDir: 'dist' } }
      const plugin = vitePlugin({ name: 'test', config: localConfig, apply: { development: 'watch' } })

      await plugin.watch(undefined)
      expect(viteMocks.build).toHaveBeenCalledWith({
        configFile: 'vite.config.js',
        build: { outDir: 'dist', watch: {} }
      })
    })
  })

  describe('with `post-build` (the default)', () => {
    it('should run a build in every postBuild call (and not in postGenerate)', async () => {
      const plugin = createPlugin()
      const context = fakeContext('development')

      await plugin.postGenerate(context, undefined)
      expect(viteMocks.build).not.toHaveBeenCalled()

      await plugin.postBuild(context, undefined)
      await plugin.postBuild(context, undefined)
      expect(viteMocks.build).toHaveBeenCalledTimes(2)
    })
  })

  describe('with `post-generate`', () => {
    it('should run a build in every postGenerate call (and not in postBuild)', async () => {
      const plugin = createPlugin({ development: 'post-generate' })
      const context = fakeContext('development')

      await plugin.postGenerate(context, undefined)
      await plugin.postBuild(context, undefined)
      await plugin.postGenerate(context, undefined)
      expect(viteMocks.build).toHaveBeenCalledTimes(2)
    })
  })

  describe('in production mode', () => {
    it('should use the `production` behavior (not the `development` behavior)', async () => {
      const plugin = createPlugin({ development: 'watch', production: 'post-build' })
      const context = fakeContext('production')

      await plugin.postBuild(context, undefined)
      await plugin.postBuild(context, undefined)
      expect(viteMocks.build).toHaveBeenCalledTimes(2)
    })

    it('should not run a build when configured to skip', async () => {
      const plugin = createPlugin({ production: 'skip' })
      const context = fakeContext('production')

      await plugin.postGenerate(context, undefined)
      await plugin.postBuild(context, undefined)
      expect(viteMocks.build).not.toHaveBeenCalled()
    })
  })

  describe('with `serve` in development mode', () => {
    it('should start the dev server in the watch callback (and not run a build)', async () => {
      const plugin = createPlugin({ development: 'serve' })
      const context = fakeContext('development')

      await plugin.postBuild(context, undefined)
      await plugin.watch(undefined)
      expect(viteMocks.build).not.toHaveBeenCalled()
      expect(viteMocks.createServer).toHaveBeenCalledWith(config)
    })
  })
})
