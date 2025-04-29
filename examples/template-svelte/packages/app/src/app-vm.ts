import { derived, get, writable, type Readable } from 'svelte/store'
import { _ } from 'svelte-i18n'

import type { GraphSpec, SourceName } from '@core'

import { syncWritable } from '@shared/stores'

import { type AppModel, type AppModelContext, createAppModel } from '@model/app-model'
import type { WritableSliderInput } from '@model/app-model-inputs'

import type { GraphViewModel } from '@components/graphs/graph-vm'
import { SelectableGraphViewModel } from '@components/graphs/selectable-graph-vm'
import type { SelectorOption, SelectorViewModel } from '@components/selector/selector-vm'

export interface LayoutOption extends SelectorOption {
  maxVisible: number
}

export class ScenarioViewModel {
  constructor(
    public readonly name: string,
    public readonly sliders: WritableSliderInput[]
  ) {}

  reset() {
    this.sliders.forEach(slider => slider.reset())
  }
}

export async function createAppViewModel(): Promise<AppViewModel> {
  // Initialize the app model that wraps the generated model
  const appModel = await createAppModel()

  // Create the `AppViewModel` instance
  return new AppViewModel(appModel)
}

export class AppViewModel {
  public readonly layoutSelector: SelectorViewModel
  public readonly selectedLayoutOption: Readable<LayoutOption>
  public readonly graphContainers: SelectableGraphViewModel[]
  public readonly scenarios: Readable<ScenarioViewModel[]>

  constructor(appModel: AppModel) {
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

    // Add the layout options
    const layoutOptions: LayoutOption[] = [
      { value: 'layout_1_1', stringKey: '1', maxVisible: 1 },
      { value: 'layout_1_2', stringKey: '2', maxVisible: 2 },
      { value: 'layout_2_2', stringKey: '4', maxVisible: 4 }
    ]
    this.layoutSelector = {
      options: layoutOptions,
      selectedValue: syncWritable('layout_1_2')
    }
    this.selectedLayoutOption = derived(this.layoutSelector.selectedValue, $selectedLayout => {
      return layoutOptions.find(option => option.value === $selectedLayout)
    })

    // Create the scenario view models
    const scenarios: ScenarioViewModel[] = []
    function addScenario(sourceName: SourceName, context: AppModelContext) {
      let displayName: string
      if (sourceName.startsWith('Scenario')) {
        displayName = sourceName.replace('Scenario', 'Scenario ')
      } else {
        displayName = ''
      }
      // TODO: We need to update `app.svelte` to handle switch inputs; for now, only show sliders
      const sliders = [...context.inputs.values()].filter(input => input.kind === 'slider') as WritableSliderInput[]
      const scenario = new ScenarioViewModel(displayName, sliders)
      scenarios.push(scenario)
      return scenario
    }
    for (const [sourceName, context] of appModel.getContexts()) {
      addScenario(sourceName, context)
    }
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
