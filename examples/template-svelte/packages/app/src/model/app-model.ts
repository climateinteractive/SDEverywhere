import { writable, type Writable, type Readable } from 'svelte/store'
import { addMessages, init as initSvelteIntl } from 'svelte-i18n'

import type {
  Config as CoreConfig,
  Model as CoreModel,
  InputId,
  OutputVarId,
  Series,
  SourceName
} from '@core'
import { config as coreConfig, createAsyncModel } from '@core'

import enStrings from '@core-strings/en'

import {
  createWritableModelInput,
  type WritableInput,
  type WritableSliderInput
} from './app-model-inputs'

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
 * High-level interface to the runnable model.
 */
export class AppModel {
  public readonly coreConfig: CoreConfig

  private readonly writableDataChanged: Writable<number> = writable(0)
  public readonly dataChanged: Readable<number> = this.writableDataChanged

  constructor(private readonly coreModel: CoreModel) {
    this.coreConfig = coreConfig

    // XXX: For now, create two contexts ahead of time
    function addContext(name: SourceName) {
      // Create a `WritableInput` instance for each input variable in the config
      const inputs: Map<InputId, WritableInput> = new Map()
      for (const inputSpec of coreConfig.inputs.values()) {
        const input = createWritableModelInput(inputSpec)
        inputs.set(input.spec.id, input)
      }
      coreModel.addContext(name, inputs)
    }
    addContext('Scenario1')
    addContext('Scenario2')

    // Increment the data change count when the model produces new outputs
    coreModel.onOutputsChanged = () => {
      this.writableDataChanged.update(count => count + 1)
    }
  }

  getInputsForContext(contextName: SourceName): WritableInput[] | undefined {
    const context = this.coreModel.getContext(contextName)
    const inputMap = context?.inputs
    return inputMap ? (Array.from(inputMap.values()) as WritableInput[]) : undefined
  }

  getSliderInputsForContext(contextName: SourceName): WritableSliderInput[] | undefined {
    return this.getInputsForContext(contextName)?.filter(input => input.kind === 'slider')
  }

  getSeriesForVar(sourceName: SourceName, varId: OutputVarId): Series | undefined {
    return this.coreModel.getSeriesForVar(sourceName, varId)
  }
}
