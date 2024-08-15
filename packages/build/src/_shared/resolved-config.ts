// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { BuildMode } from './mode'

/**
 * The sde configuration derived from a `UserConfig` that has been resolved (i.e.,
 * paths have been checked).  This is the config object that will be passed to
 * plugin functions.  It contains a subset of the original `UserConfig` (to disallow
 * access to the `plugins` field of the original config).
 */
export interface ResolvedConfig {
  /**
   * The mode used for the build process, either 'development' or 'production'.
   */
  mode: BuildMode

  /**
   * The absolute path to the project root directory, which has been confirmed to exist.
   */
  rootDir: string

  /**
   * The absolute path to the directory used to prepare the model.  This directory has
   * been created if it did not previously exist.
   */
  prepDir: string

  /**
   * The mdl files to be built.
   */
  modelFiles: string[]

  /**
   * Paths to files that are considered to be inputs to the model build process.
   * These can be paths to files or glob patterns (relative to the project directory).
   */
  modelInputPaths: string[]

  /**
   * Paths to files that when changed will trigger a rebuild in watch mode.  These
   * can be paths to files or glob patterns (relative to the project directory).
   */
  watchPaths: string[]

  /**
   * The code format to generate.  If 'js', the model will be compiled to a JavaScript
   * file.  If 'c', the model will be compiled to a C file (in which case an additional
   * plugin will be needed to convert the C code to a WebAssembly module).
   */
  genFormat: 'js' | 'c'

  /**
   * The absolute path to the JSON file that will be written by the build process that
   * lists all dimensions and variables in the model.
   */
  outListingFile?: string

  /**
   * Whether to bundle a model listing with the generated model.  If undefined, defaults
   * to false.  When this is true, a model listing will be bundled with the generated model
   * to allow the `runtime` package to resolve variables that are referenced by name or
   * identifier.  This listing will increase the size of the generated model, so it is
   * recommended to set this to true only if it is needed.
   */
  bundleListing?: boolean

  /**
   * The path to the `@sdeverywhere/cli` package.  This is currently only used to get
   * access to the files in the `src/c` directory.
   * @hidden This should be removed once we have tighter integration with the `cli` package.
   */
  sdeDir: string

  /**
   * The path to the `sde` command.
   * @hidden This should be removed once we have tighter integration with the `cli` package.
   */
  sdeCmdPath: string
}
