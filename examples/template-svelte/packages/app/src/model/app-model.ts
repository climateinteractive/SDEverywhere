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
 * A context that holds a distinct set of model inputs and outputs.
 */
export interface AppModelContext {
  /** The source name associated with the context. */
  sourceName: SourceName

  /** The set of inputs associated with this context. */
  inputs: Map<InputId, WritableInput>
}

/**
 * High-level interface to the runnable model.
 */
export class AppModel {
  public readonly coreConfig: CoreConfig

  public readonly contexts: Map<SourceName, AppModelContext> = new Map()

  private readonly writableDataChanged: Writable<number> = writable(0)
  public readonly dataChanged: Readable<number> = this.writableDataChanged

  constructor(private readonly coreModel: CoreModel) {
    this.coreConfig = coreConfig

    // Helper function that creates a context with Svelte-friendly
    // `WritableInput` instances
    const contexts = this.contexts
    function addContext(sourceName: SourceName) {
      // Create a `WritableInput` instance for each input variable in the config
      const inputs: Map<InputId, WritableInput> = new Map()
      for (const inputSpec of coreConfig.inputs.values()) {
        const input = createWritableModelInput(inputSpec)
        inputs.set(input.spec.id, input)
      }

      // Add the context in the core model
      coreModel.addContext(sourceName, { inputs })

      // Add the app-level context
      contexts.set(sourceName, {
        sourceName,
        inputs
      })
    }

    // This is a special feature of this template.  We check the graph specs to
    // see if there are graphs configured with one or more datasets that use
    // "ScenarioN" as the source.  If so, we create a context for each scenario
    // name.  This allows the UI to show multiple groups of inputs.  If there
    // are no scenario-specific datasets, we create a single context.
    const scenarioNames = new Set<SourceName>()
    for (const graphSpec of coreConfig.graphs.values()) {
      for (const dataset of graphSpec.datasets) {
        if (dataset.externalSourceName?.startsWith('Scenario')) {
          scenarioNames.add(dataset.externalSourceName)
        }
      }
    }
    if (scenarioNames.size > 0) {
      // Create a context for each scenario name
      for (const scenarioName of scenarioNames) {
        addContext(scenarioName)
      }
    } else {
      // Create a single context
      addContext('Primary')
    }

    // Increment the data change count when the model produces new outputs
    coreModel.onOutputsChanged = () => {
      this.writableDataChanged.update(count => count + 1)
    }
  }

  getContexts(): ReadonlyMap<SourceName, AppModelContext> {
    return this.contexts
  }

  getInputsForContext(contextName: SourceName): WritableInput[] | undefined {
    return Array.from(this.contexts.get(contextName)?.inputs.values() ?? [])
  }

  getSliderInputsForContext(contextName: SourceName): WritableSliderInput[] | undefined {
    return this.getInputsForContext(contextName)?.filter(input => input.kind === 'slider')
  }

  getSeriesForVar(sourceName: SourceName | undefined, varId: OutputVarId): Series | undefined {
    if (sourceName === undefined) {
      sourceName = 'Primary'
    }
    return this.coreModel.getSeriesForVar(sourceName, varId)
  }
}
