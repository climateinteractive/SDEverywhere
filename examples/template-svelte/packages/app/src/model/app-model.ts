import type { Config as CoreConfig, Model as CoreModel, OutputVarId, Series, SourceName, StringKey } from '@core'
import { config as coreConfig, createAsyncModel } from '@core'

import enStrings from '@core-strings/en'

/**
 * Create an `AppModel` instance.
 */
export async function createAppModel(): Promise<AppModel> {
  // XXX: For now, create two contexts ahead of time
  const coreModel = await createAsyncModel()
  coreModel.addContext('Scenario1')
  coreModel.addContext('Scenario2')

  // Create the `AppModel` instance
  return new AppModel(coreModel)
}

/**
 * High-level interface to the runnable model.
 */
export class AppModel {
  public readonly coreConfig: CoreConfig

  constructor(private readonly coreModel: CoreModel) {
    this.coreConfig = coreConfig
  }

  getSeriesForVar(sourceName: SourceName, varId: OutputVarId): Series | undefined {
    return this.coreModel.getSeriesForVar(sourceName, varId)
  }

  getStringForKey(key: StringKey): string {
    return enStrings[key]
  }
}
