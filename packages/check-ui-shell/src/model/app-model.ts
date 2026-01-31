// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CheckDataCoordinator, ComparisonDataCoordinator, Config, ConfigOptions } from '@sdeverywhere/check-core'
import { createConfig, createCheckDataCoordinator, createComparisonDataCoordinator } from '@sdeverywhere/check-core'

export class AppModel {
  public readonly checkDataCoordinator: CheckDataCoordinator
  public readonly comparisonDataCoordinator: ComparisonDataCoordinator

  constructor(public readonly config: Config) {
    this.checkDataCoordinator = createCheckDataCoordinator()
    if (config.comparison) {
      this.comparisonDataCoordinator = createComparisonDataCoordinator()
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
