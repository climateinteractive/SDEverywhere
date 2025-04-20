import { writable, type Writable, type Readable } from 'svelte/store'
import { addMessages, init as initSvelteIntl } from 'svelte-i18n'

import type {
  Config as CoreConfig,
  Model as CoreModel,
  Input,
  OutputVarId,
  Series,
  SliderInput,
  SourceName,
  StringKey
} from '@core'
import { config as coreConfig, createAsyncModel } from '@core'

import enStrings from '@core-strings/en'

/**
 * Create an `AppModel` instance.
 */
export async function createAppModel(): Promise<AppModel> {
  // Initialize svelte-i18n
  addMessages('en', enStrings)
  initSvelteIntl({
    initialLocale: 'en',
    fallbackLocale: 'en'
  })

  // Create the underlying model
  const coreModel = await createAsyncModel()

  // Create the `AppModel` instance
  return new AppModel(coreModel)
}

/**
 * Provides access to strings for a given key
 */
export class Strings {
  // TODO: Replace this with svelte-i18n
  get(key: StringKey): string | undefined {
    return enStrings[key]
  }
}

/**
 * High-level interface to the runnable model.
 */
export class AppModel {
  public readonly coreConfig: CoreConfig

  private readonly writableDataChanged: Writable<number> = writable(0)
  public readonly dataChanged: Readable<number> = this.writableDataChanged

  public readonly strings: Strings = new Strings()

  constructor(private readonly coreModel: CoreModel) {
    this.coreConfig = coreConfig

    // XXX: For now, create two contexts ahead of time
    coreModel.addContext('Scenario1')
    coreModel.addContext('Scenario2')

    // Increment the data change count when the model produces new outputs
    coreModel.onOutputsChanged = () => {
      this.writableDataChanged.update(count => count + 1)
    }
  }

  getInputsForContext(contextName: SourceName): Input[] | undefined {
    const context = this.coreModel.getContext(contextName)
    const inputMap = context?.inputs
    return inputMap ? Array.from(inputMap.values()) : undefined
  }

  getSliderInputsForContext(contextName: SourceName): SliderInput[] | undefined {
    return this.getInputsForContext(contextName)?.filter(input => input.kind === 'slider')
  }

  getSeriesForVar(sourceName: SourceName, varId: OutputVarId): Series | undefined {
    return this.coreModel.getSeriesForVar(sourceName, varId)
  }
}
