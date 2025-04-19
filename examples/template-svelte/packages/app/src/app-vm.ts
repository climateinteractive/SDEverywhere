import { writable, type Readable } from 'svelte/store'

import { type AppModel, createAppModel } from './model/app-model'

import type { GraphViewModel } from './components/graph/graph-vm'

export async function createAppViewModel(): Promise<AppViewModel> {
  // Initialize the app model that wraps the generated model
  const appModel = await createAppModel()

  // Create the `AppViewModel` instance
  return new AppViewModel(appModel)
}

export class AppViewModel {
  public readonly selectedGraphViewModel: Readable<GraphViewModel>

  constructor(private readonly appModel: AppModel) {
    const graphSpec = this.appModel.coreConfig.graphs.get('1')
    const graphViewModel: GraphViewModel = {
      spec: graphSpec,
      getSeriesForVar: (varId, sourceName) => {
        return appModel.getSeriesForVar(sourceName, varId)
      },
      getStringForKey: key => {
        // TODO: Inject values if string is templated
        return appModel.getStringForKey(key)
      },
      formatYAxisTickValue: value => {
        return format(value, graphSpec.yFormat)
      }
    }
    this.selectedGraphViewModel = writable(graphViewModel)
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
