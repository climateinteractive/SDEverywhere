// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface WorkerPluginOptions {
  /**
   * The destination paths for the generated worker JS files.  If undefined,
   * a `worker.js` file will be written to the configured `prepDir`.
   */
  outputPaths?: string[]
}
