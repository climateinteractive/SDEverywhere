// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { ModelSpec } from '../_shared/model-spec'
import type { ResolvedConfig } from '../_shared/resolved-config'
import type { BuildContext } from '../context/context'

/**
 * The plugin interface that can be implemented to customize the model
 * generation and build process.
 *
 * These functions are all optional.
 *
 * These functions will be called during the build process in the order
 * listed below:
 *   - init (only called once before initial build steps)
 *   - preGenerate
 *       - preProcessMdl
 *       - postProcessMdl
 *       - preGenerateCode
 *       - postGenerateCode
 *   - postGenerate
 *   - postBuild
 *   - watch (only called once after initial build steps when mode==development)
 */
export interface Plugin {
  /**
   * Called after the user configuration has been resolved, but before the
   * model is generated and other build steps.
   *
   * @param config The build configuration.
   */
  init?(config: ResolvedConfig): Promise<void>

  /**
   * Called before the "generate model" steps are performed.
   *
   * @param context The build context (for logging, etc).
   * @param modelSpec The spec that controls how the model is generated.
   */
  preGenerate?(context: BuildContext, modelSpec: ModelSpec): Promise<void>

  /**
   * Called before SDE preprocesses the mdl file (in the case of one mdl file),
   * or before SDE flattens the mdl files (in the case of multiple mdl files).
   *
   * @param context The build context (for logging, etc).
   */
  preProcessMdl?(context: BuildContext): Promise<void>

  /**
   * Called after SDE preprocesses the mdl file (in the case of one mdl file),
   * or after SDE flattens the mdl files (in the case of multiple mdl files).
   *
   * @param context The build context (for logging, etc).
   * @param mdlContent The resulting mdl file content.
   * @return The modified mdl file content (if postprocessing was needed).
   */
  postProcessMdl?(context: BuildContext, mdlContent: string): Promise<string>

  /**
   * Called before SDE generates a JS or C file from the mdl file.
   *
   * @param context The build context (for logging, etc).
   * @param format The generated code format, either 'js' or 'c'.
   */
  preGenerateCode?(context: BuildContext, format: 'js' | 'c'): Promise<void>

  /**
   * Called after SDE generates a JS or C file from the mdl file.
   *
   * @param context The build context (for logging, etc).
   * @param format The generated code format, either 'js' or 'c'.
   * @param content The resulting JS or C file content.
   * @return The modified JS or C file content (if postprocessing was needed).
   */
  postGenerateCode?(context: BuildContext, format: 'js' | 'c', content: string): Promise<string>

  /**
   * Called after the "generate model" process has completed (but before the staged
   * files are copied to their destination).
   *
   * @param context The build context (for logging, etc).
   * @param modelSpec The spec that controls how the model is generated.
   * @return Whether the plugin succeeded (for example, a plugin that runs tests can
   * return false to indicate that one or more tests failed).
   */
  postGenerate?(context: BuildContext, modelSpec: ModelSpec): Promise<boolean>

  /**
   * Called after the model has been generated and after the staged files
   * have been copied to their destination.
   *
   * @param context The build context (for logging, etc).
   * @param modelSpec The spec that controls how the model is generated.
   * @return Whether the plugin succeeded (for example, a plugin that runs tests can
   * return false to indicate that one or more tests failed).
   */
  postBuild?(context: BuildContext, modelSpec: ModelSpec): Promise<boolean>

  /**
   * Called in development/watch mode after the initial build has completed
   * (i.e., after the model has been generated and after the staged files
   * have been copied to their destination).
   *
   * @param config The build configuration.
   */
  watch?(config: ResolvedConfig): Promise<void>
}
