// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface WorkerPluginOptions {
  /**
   * The destination paths for the generated worker JS files.  If undefined,
   * a `worker.js` file will be written to the configured `prepDir`.
   */
  outputPaths?: string[]

  /**
   * The destination paths for generated JS or TS module files that export the source
   * code of the worker (as a string) as the default export, for example:
   * ```js
   *   export default "(function() { ... })()"
   * ```
   *
   * This is useful for spawning the worker from its source code (for example, using
   * `spawnAsyncModelRunner({ source })` from `@sdeverywhere/runtime-async`), since the
   * module can be imported like any other module, without needing a special loader
   * (such as Vite's `?raw` suffix) to import the worker file as a string.
   *
   * If both `outputPaths` and `outputSourceModulePaths` are undefined, a `worker.js`
   * file will be written to the configured `prepDir`.
   */
  outputSourceModulePaths?: string[]
}
