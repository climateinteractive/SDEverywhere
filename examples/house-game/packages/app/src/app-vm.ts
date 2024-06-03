import { derived, writable, type Readable, type Writable } from 'svelte/store'

import { AppModel, createAppModel } from './model/app-model'

import { AssumptionsViewModel, createAssumptionsViewModel } from './components/assumptions/assumptions-vm'
import type { GraphViewModel } from './components/graph/graph-vm'

export async function createAppViewModel(): Promise<AppViewModel> {
  // Initialize the app model that wraps the generated model
  const appModel = await createAppModel()

  // Create the `AppViewModel` instance
  return new AppViewModel(appModel)
}

export class AppViewModel {
  public readonly busy: Readable<boolean>

  public readonly message: Readable<string>
  public readonly showUserInput: Readable<boolean>
  public readonly writableUserInputValue: Writable<number>

  public readonly assumptions: Readable<AssumptionsViewModel>

  private readonly writableGraphDataChanged: Writable<number>
  public readonly supplyGraphViewModel: GraphViewModel

  constructor(private readonly appModel: AppModel) {
    // Expose the busy flag from the app model
    this.busy = appModel.busy

    // Derive the message from the current app state
    this.message = derived(appModel.state, $state => {
      return $state.message
    })

    // Show the user input field when the app reaches the game state
    this.showUserInput = derived(appModel.state, $state => {
      return $state.showUserInput
    })
    this.writableUserInputValue = appModel.writableUserInputValue

    // Derive the assumptions view model from the current app state
    this.assumptions = derived(appModel.state, $state => {
      return createAssumptionsViewModel($state.modelInputs)
    })

    // Initialize the graph view model
    const xMin = 0
    const xMax = 100
    this.writableGraphDataChanged = writable(0)
    this.supplyGraphViewModel = {
      spec: {
        xAxisLabel: 'time (months)',
        xMin,
        xMax,
        yAxisLabel: 'houses',
        yMin: 800,
        yMax: 1600,
        datasets: [
          {
            varId: '_houses_completed',
            label: 'Supply',
            color: 'magenta'
          },
          {
            varId: '_number_of_houses_required',
            label: 'Demand',
            color: '#4080e0',
            lineStyle: 'wide'
          }
        ]
      },
      data: new Map(),
      dataChanged: this.writableGraphDataChanged
    }

    // Update the graph data after a model run and/or during animation
    appModel.onDataUpdated = (outputs, maxTime) => {
      const dataChanged = this.writableGraphDataChanged
      function updateData(graphViewModel: GraphViewModel) {
        for (const datasetSpec of graphViewModel.spec.datasets) {
          const series = outputs.getSeriesForVar(datasetSpec.varId)
          if (series) {
            const points = series.points.filter(p => p.x <= maxTime)
            graphViewModel.data.set(datasetSpec.varId, points)
          }
        }
        dataChanged.update(n => n + 1)
      }
      updateData(this.supplyGraphViewModel)
    }

    // Perform an initial model run
    appModel.reset()
  }

  public reset(): void {
    this.appModel.reset()
  }

  public nextStep(): void {
    this.appModel.nextStep()
  }
}
