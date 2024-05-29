import { derived, get, writable, type Readable, type Writable } from 'svelte/store'

import { type Point } from '@sdeverywhere/runtime'

import { AppModel, createAppModel } from './model/app-model'
import { type AppState, stateForIndex, inputValuesForState } from './model/app-state'

import { AssumptionsViewModel, createAssumptionsViewModel } from './components/assumptions/assumptions-vm'
import type { GraphViewModel } from './components/graph/graph-vm'

export async function createAppViewModel(): Promise<AppViewModel> {
  // Initialize the app model that wraps the generated model
  const appModel = await createAppModel()

  // Create the `AppViewModel` instance
  return new AppViewModel(appModel)
}

export class AppViewModel {
  private readonly writableBusy: Writable<boolean>
  public readonly busy: Readable<boolean>

  private internalCurrentTime: number
  private readonly writableCurrentTime: Writable<number>
  public readonly currentTime: Readable<number>

  public readonly writableCurrentValue: Writable<number>
  private lookupPoints: Point[]

  private currentStateIndex: number
  private writableState: Writable<AppState>

  public readonly message: Readable<string>
  public readonly assumptions: Readable<AssumptionsViewModel>

  private readonly writableDataChanged: Writable<number>

  public readonly supplyGraphViewModel: GraphViewModel

  constructor(private readonly appModel: AppModel) {
    this.writableBusy = writable(false)
    this.busy = this.writableBusy

    this.internalCurrentTime = 0
    this.writableCurrentTime = writable(0)
    this.currentTime = this.writableCurrentTime

    this.writableCurrentValue = writable(2)

    this.currentStateIndex = 0
    this.writableState = writable(stateForIndex(0))
    this.message = derived(this.writableState, $state => {
      return $state.message
    })
    this.assumptions = derived(this.writableState, $state => {
      return createAssumptionsViewModel($state.modelInputs)
    })

    this.writableDataChanged = writable(0)

    const xMin = 0
    const xMax = 100
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
            color: 'magenta'
          },
          {
            varId: '_number_of_houses_required',
            color: '#4080e0',
            lineStyle: 'wide'
          }
        ]
      },
      data: new Map(),
      dataChanged: this.writableDataChanged
    }

    this.updateGraphData(0)
  }

  public nextStep(): void {
    this.currentStateIndex++

    if (this.currentStateIndex === 4) {
      this.internalCurrentTime = 30
      this.writableCurrentTime.set(this.internalCurrentTime)
    } else if (this.currentStateIndex > 4) {
      this.internalCurrentTime += 5
      this.writableCurrentTime.set(this.internalCurrentTime)
    }

    const state = stateForIndex(this.currentStateIndex)
    if (state.modelInputs.useRateFromUser) {
      state.modelInputs.currentRate = get(this.writableCurrentValue)
    }
    this.runModel(state)
    this.writableState.set(state)
  }

  public reset(): void {
    this.currentStateIndex = 0

    this.internalCurrentTime = 0
    this.writableCurrentTime.set(0)

    this.writableCurrentValue.set(2)

    const state = stateForIndex(this.currentStateIndex)
    this.runModel(state)
    this.writableState.set(state)
  }

  private updateGraphData(maxTime: number): void {
    const dataSource = this.appModel
    const dataChanged = this.writableDataChanged
    function updateData(graphViewModel: GraphViewModel) {
      for (const datasetSpec of graphViewModel.spec.datasets) {
        const series = dataSource.getSeriesForVar(datasetSpec.varId)
        if (series) {
          const points = series.points.filter(p => p.x <= maxTime)
          graphViewModel.data.set(datasetSpec.varId, points)
        }
      }
      dataChanged.update(n => n + 1)
    }
    updateData(this.supplyGraphViewModel)
  }

  private runModel(state: AppState): void {
    const inputValues = inputValuesForState(state)

    const stateInputs = state.modelInputs
    if (stateInputs.useRateFromUser !== true) {
      // Reset the lookup data to include the initial rate from the state
      this.lookupPoints = [{ x: 0, y: stateInputs.currentRate || 0 }]
    } else {
      // Add the current rate set by the user
      this.lookupPoints.push({ x: this.internalCurrentTime, y: stateInputs.currentRate })
    }
    const lookups = [this.appModel.createLookupDef(this.lookupPoints)]

    this.writableBusy.set(true)
    this.appModel.runModel(inputValues, lookups).then(() => {
      // Reveal the plots with an animation from left to right
      const duration = 600
      const animatedGraphTime = state.maxGraphTime - state.minGraphTime
      for (let i = 0; i <= duration; i += 10) {
        const animTimeInMonths = state.minGraphTime + (i / duration) * animatedGraphTime
        setTimeout(() => {
          this.updateGraphData(animTimeInMonths)
          if (i === duration) {
            this.writableBusy.set(false)
          }
        }, i)
      }
    })
  }
}
