import { writable, type Readable } from 'svelte/store'

import type { GraphSpec, SliderInput, SourceName, StringKey } from '@core'

import { type AppModel, createAppModel } from './model/app-model'

import type { GraphViewModel } from './components/graph/graph-vm'
import { SelectableGraphViewModel } from './components/graph/selectable-graph-vm'

export interface Scenario {
  name: string
  sliders: SliderInput[]
}

export async function createAppViewModel(): Promise<AppViewModel> {
  // Initialize the app model that wraps the generated model
  const appModel = await createAppModel()

  // Create the `AppViewModel` instance
  return new AppViewModel(appModel)
}

export class AppViewModel {
  public readonly graphContainers: SelectableGraphViewModel[]
  public readonly scenarios: Readable<Scenario[]>

  constructor(private readonly appModel: AppModel) {
    const graphSpecs = [...appModel.coreConfig.graphs.values()]
    const graphViewModels = graphSpecs.map(graphSpec => createGraphViewModel(appModel, graphSpec))

    // TODO: For now, add two graph containers.  We should make this dynamic
    // to support different layouts, like 1-up, 2-up, 4-up, etc.
    this.graphContainers = []
    this.graphContainers.push(new SelectableGraphViewModel(graphViewModels, '1'))
    this.graphContainers.push(new SelectableGraphViewModel(graphViewModels, '2'))

    const scenarios: Scenario[] = []
    function addScenario(displayName: string, contextName: SourceName) {
      scenarios.push({
        name: displayName,
        sliders: appModel.getSliderInputsForContext(contextName) ?? []
      })
    }
    addScenario('Scenario 1', 'Scenario1')
    addScenario('Scenario 2', 'Scenario2')
    this.scenarios = writable(scenarios)
  }

  stringForKey(key: StringKey): string {
    return this.appModel.strings.get(key)
  }
}

/**
 * Create a `GraphViewModel` for the given spec.
 */
function createGraphViewModel(appModel: AppModel, graphSpec: GraphSpec): GraphViewModel {
  return {
    spec: graphSpec,
    dataChanged: appModel.dataChanged,
    getSeriesForVar: (varId, sourceName) => {
      return appModel.getSeriesForVar(sourceName, varId)
    },
    getStringForKey: key => {
      // TODO: Use svelte-i18n here and inject values if string is templated
      return appModel.strings.get(key)
    },
    formatYAxisTickValue: value => {
      return format(value, graphSpec.yFormat)
    }
  }
}

/**
 * Return a formatted string representation of the given number.
 */
function format(num: number, formatString: string) {
  // TODO: You could use d3-format or another similar formatting library
  // here.  For now, this is set up to handle a small subset of formats
  // used in the example config files.
  switch (formatString) {
    case '.1f':
      return num.toFixed(1)
    case '.2f':
      return num.toFixed(2)
    default:
      return num.toString()
  }
}
