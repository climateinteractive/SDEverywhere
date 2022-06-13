// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Config, ConfigOptions } from '@sdeverywhere/check-core'
import { createConfig, CheckDataCoordinator, CompareDataCoordinator } from '@sdeverywhere/check-core'

export class AppModel {
  public readonly checkDataCoordinator: CheckDataCoordinator
  public readonly compareDataCoordinator: CompareDataCoordinator

  constructor(public readonly config: Config) {
    this.checkDataCoordinator = new CheckDataCoordinator(config.check.bundle.model)
    if (config.compare) {
      this.compareDataCoordinator = new CompareDataCoordinator(
        config.compare.bundleL.model,
        config.compare.bundleR.model
      )
    }
  }
}

/**
 * Initialize the application model.
 *
 * @param configOptions The configuration options.
 */
export async function initAppModel(configOptions: ConfigOptions): Promise<AppModel> {
  // Initialize the model-check configuration
  const config = await createConfig(configOptions)
  return new AppModel(config)
}
