import { get, writable, type Readable } from 'svelte/store'
import { _ } from 'svelte-i18n'

import type { GraphSpec, SliderInput, SourceName } from '@core'

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

    // The UI allows the user to choose different graph layouts.  For now, add
    // enough graph containers to support up to 4 graphs at a time.
    const maxVisibleGraphs = Math.min(4, graphSpecs.length)
    this.graphContainers = []
    for (let i = 0; i < maxVisibleGraphs; i++) {
      const graphId = graphViewModels[i].spec.id
      this.graphContainers.push(new SelectableGraphViewModel(graphViewModels, graphId))
    }

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
    getStringForKey(key: string, values?: { [key: string]: string }): string {
      return get(_)(key, values)
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
