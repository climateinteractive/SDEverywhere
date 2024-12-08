// Copyright (c) 2022 Climate Interactive / New Venture Fund

export interface CheckBundle {
  /** The name of the bundle as displayed in the report (this is typically a branch name). */
  name: string

  /** The absolute path to the JS bundle file. */
  path: string
}

export interface CheckPluginOptions {
  /** The baseline bundle.  If undefined, no comparison tests will be run. */
  baseline?: CheckBundle

  /** The current bundle, i.e., the bundle that is being developed and checked. */
  current?: CheckBundle

  /**
   * The absolute path to the JS file containing the test configuration.  If undefined,
   * a default test configuration will be used.
   */
  testConfigPath?: string

  /**
   * The absolute path to the directory where the report will be written.  If undefined,
   * the report will be written to the configured `prepDir`.
   */
  reportPath?: string

  /** The port used for the local dev server (defaults to 8081). */
  serverPort?: number
}
