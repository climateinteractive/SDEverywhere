// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { InlineConfig } from 'vite'

export interface VitePluginOptions {
  /** The name to include in log messages. */
  name: string

  /** The Vite config to use. */
  config: InlineConfig

  /** Specifies the behavior of the plugin for different `sde` build modes. */
  apply?: {
    /**
     * The behavior of the plugin when sde is configured for development mode.
     *
     * If left undefined, defaults to 'post-build'.
     *
     * - `skip`: Don't run the plugin.
     * - `post-generate`: Run `vite build` in the `postGenerate` phase.
     * - `post-build`: Run `vite build` in the `postBuild` phase.
     * - `watch`: Run `vite build` in the `watch` callback (rebuilds the library when
     *   changes are detected in source files); useful for libraries.
     * - `serve`: Run `vite dev` (sets up local server and refreshes the app
     *   automatically when changes are detected); useful for applications.
     */
    development?: 'skip' | 'post-generate' | 'post-build' | 'watch' | 'serve'

    /**
     * The behavior of the plugin when sde is configured for production mode.
     *
     * If left undefined, defaults to 'post-build'.
     *
     * - `skip`: Don't run the plugin.
     * - `post-generate`: Run `vite build` in the `postGenerate` phase.
     * - `post-build`: Run `vite build` in the `postBuild` phase.
     */
    production?: 'skip' | 'post-generate' | 'post-build'
  }
}
