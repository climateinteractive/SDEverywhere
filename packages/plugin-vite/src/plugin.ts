// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { InlineConfig, ViteDevServer } from 'vite'
import { build, createServer } from 'vite'

import type { BuildContext, Plugin } from '@sdeverywhere/build'

import type { VitePluginOptions } from './options'

export function vitePlugin(options: VitePluginOptions): Plugin {
  return new VitePlugin(options)
}

class VitePlugin implements Plugin {
  /** Whether the plugin has not yet run its `postBuild` step. */
  private initialBuild = true

  constructor(private readonly options: VitePluginOptions) {}

  async postGenerate(context: BuildContext): Promise<boolean> {
    // Only build if the plugin is configured to run for 'post-generate'
    return this.buildIfNeeded(context, 'post-generate')
  }

  async postBuild(context: BuildContext): Promise<boolean> {
    const initialBuild = this.initialBuild
    this.initialBuild = false

    if (initialBuild && context.config.mode === 'development' && this.options.apply?.development === 'watch') {
      // When the plugin is configured to use 'watch' mode, `vite build` is run in watch mode
      // in the `watch` callback, but that callback is only called after the initial build pass
      // is complete.  Run a normal build in the `postBuild` phase of the initial build pass so
      // that the output is available to plugins that run later in the same pass (for example,
      // a plugin that depends on a library that is built by this plugin).  Note that this runs
      // in the `postBuild` phase (rather than `postGenerate`) so that any staged files (which
      // are copied into place after the `postGenerate` phase) are available to the build.
      context.log('info', `Building ${this.options.name}`)
      await build(this.options.config)
      return true
    }

    // Only build if the plugin is configured to run for 'post-build'
    return this.buildIfNeeded(context, 'post-build')
  }

  private async buildIfNeeded(context: BuildContext, caller: 'post-generate' | 'post-build'): Promise<boolean> {
    // The apply values default to 'post-build' when left undefined
    const applyDev = this.options.apply?.development || 'post-build'
    const applyProd = this.options.apply?.production || 'post-build'

    // Run "vite build" only if configured for this mode
    const shouldBuild =
      (context.config.mode === 'development' && applyDev === caller) ||
      (context.config.mode === 'production' && applyProd === caller)
    if (shouldBuild) {
      context.log('info', `Building ${this.options.name}`)
      await build(this.options.config)
      // context.log('info', 'Done!')
    }
    return true
  }

  async watch(): Promise<void> {
    if (this.options.apply?.development === 'serve') {
      // Run "vite dev", which starts the app in a local server and
      // refreshes when source files are changed
      const server: ViteDevServer = await createServer(this.options.config)
      await server.listen()
    } else if (this.options.apply?.development === 'watch') {
      // Run "vite build" in watch mode so that it rebuilds when source
      // files are changed
      const config: InlineConfig = {
        build: {
          // Enable watch mode
          // TODO: Only do this if not already set up in the given config?
          watch: {}
        },
        ...this.options.config
      }
      await build(config)
    }
  }
}
