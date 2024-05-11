// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ModelSpec } from '../_shared/model-spec'
import type { BuildContext } from '../context/context'
import type { Plugin } from '../plugin/plugin'

/**
 * The sde configuration as defined by the user, either inline or in a `sde.config.js` file.
 */
export interface UserConfig {
  /**
   * The project root directory.  If undefined, the current directory is
   * assumed to be the project root.  This directory should contain all the
   * model and config files referenced during the build process.
   */
  rootDir?: string

  /**
   * The directory used to prepare the model.  If undefined, an 'sde-prep'
   * directory will be created under the resolved `rootDir`.
   */
  prepDir?: string

  /**
   * The mdl files to be built (must provide one or more).
   */
  modelFiles: string[]

  /**
   * Paths to files that are considered to be inputs to the model build process.
   * These can be paths to files or glob patterns (relative to the project directory).
   * If left undefined, this will resolve to the `modelFiles` array.
   */
  modelInputPaths?: string[]

  /**
   * Paths to files that when changed will trigger a rebuild in watch mode.  These
   * can be paths to files or glob patterns (relative to the project directory).
   * If left undefined, this will resolve to the `modelFiles` array.
   */
  watchPaths?: string[]

  /**
   * The code format to generate.  If 'js', the model will be compiled to a JavaScript
   * file.  If 'c', the model will be compiled to a C file (in which case an additional
   * plugin will be needed to convert the C code to a WebAssembly module).  If undefined,
   * defaults to 'js'.
   */
  genFormat?: 'js' | 'c'

  /**
   * The array of plugins that are used to customize the build process.  These will be
   * executed in the order defined here.
   */
  plugins?: Plugin[]

  /**
   * Called before the "generate model" steps are performed.
   *
   * You must implement this function so that the generated model is
   * configured with the desired inputs and outputs.
   *
   * @return A `ModelSpec` that defines the model inputs and outputs.
   */
  modelSpec: (context: BuildContext) => Promise<ModelSpec>
}
