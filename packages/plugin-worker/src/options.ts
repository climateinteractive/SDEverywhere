// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface WorkerPluginOptions {
  /**
   * The destination paths for the generated worker JS files.  If undefined,
   * a `worker.js` file will be written to the configured `prepDir`.
   */
  outputPaths?: string[]

  /**
   * The destination paths for the generated modules that export the worker source code
   * (as a string) as the default export, for example:
   * ```js
   *   export default "(function() { ... })()"
   * ```
   *
   * One module is written per path, with the same content in each case.  That content is
   * valid as either a JavaScript or a TypeScript module, so use whichever extension suits
   * the project that imports it (for example, `worker-source.ts` for a TypeScript package).
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
