import { Readable, Writable, get, writable } from 'svelte/store'

import type { ModelRunner, Point } from '@sdeverywhere/runtime'
import { ModelListing, Outputs, createLookupDef } from '@sdeverywhere/runtime'

import { spawnAsyncModelRunner } from '@sdeverywhere/runtime-async'

import modelListingJson from './generated/listing.json?raw'
import modelWorkerJs from './generated/worker.js?raw'
import { AppState, inputValuesForState, stateForIndex } from './app-state'

/**
 * Create an `AppModel` instance.
 */
export async function createAppModel(): Promise<AppModel> {
  // Load the model listing
  const listing = new ModelListing(modelListingJson)

  // Initialize the generated model asynchronously.  We inline the worker code in the
  // rolled-up bundle, so that we don't have to fetch a separate `worker.js` file.
  const runner = await spawnAsyncModelRunner({ source: modelWorkerJs })
  const outputs = runner.createOutputs()

  // Create the `AppModel` instance
  return new AppModel(listing, runner, outputs)
}

/**
 * High-level interface to the runnable model.
 */
export class AppModel {
  private readonly writableBusy: Writable<boolean>
  public readonly busy: Readable<boolean>

  private internalCurrentTime: number
  private readonly writableCurrentTime: Writable<number>
  public readonly currentTime: Readable<number>

  private currentStateIndex: number
  private readonly writableState: Writable<AppState>
  public readonly state: Readable<AppState>

  public readonly writableUserInputValue: Writable<number>
  private gameLookupPoints: Point[]

  public onDataUpdated: (outputs: Outputs, maxTime: number) => void

  constructor(
    private readonly listing: ModelListing,
    private readonly runner: ModelRunner,
    private readonly outputs: Outputs
  ) {
    this.writableBusy = writable(false)
    this.busy = this.writableBusy

    this.internalCurrentTime = 0
    this.writableCurrentTime = writable(0)
    this.currentTime = this.writableCurrentTime

    this.currentStateIndex = 0
    this.writableState = writable(stateForIndex(0, this.internalCurrentTime))
    this.state = this.writableState

    this.writableUserInputValue = writable(1.7)
  }

  /**
   * Reset to the initial game state.
   */
  public reset(): void {
    this.internalCurrentTime = 0
    this.writableCurrentTime.set(0)

    this.currentStateIndex = 0
    const state = stateForIndex(this.currentStateIndex, this.internalCurrentTime)
    this.writableState.set(state)

    this.writableUserInputValue.set(1.7)

    this.runModelAndAnimate(state)
  }

  /**
   * Advance to the next game state.
   */
  public nextStep(): void {
    this.currentStateIndex++

    // TODO: Clean up this logic
    if (this.currentStateIndex === 3) {
      this.internalCurrentTime = 20
      this.writableCurrentTime.set(this.internalCurrentTime)
    } else if (this.currentStateIndex > 3) {
      this.internalCurrentTime += 5
      this.writableCurrentTime.set(this.internalCurrentTime)
    }
    const state = stateForIndex(this.currentStateIndex, this.internalCurrentTime)
    if (state.modelInputs.useRateFromUser) {
      state.modelInputs.currentRate = get(this.writableUserInputValue)
    }
    this.writableState.set(state)

    this.runModelAndAnimate(state)
  }

  /**
   * Schedule an asynchronous model run.  When the run completes, the graph
   * data will be updated in an animated fashion.
   */
  private runModelAndAnimate(state: AppState): void {
    // Determine the model input values for the given state
    const inputValues = inputValuesForState(state)

    // Update the lookup data to reflect the values for the given state
    const stateInputs = state.modelInputs
    if (stateInputs.useRateFromUser === true) {
      // Add the current rate set by the user
      this.gameLookupPoints.push({
        x: this.internalCurrentTime,
        y: stateInputs.currentRate
      })
    } else {
      // Otherwise, reset the lookup data to include the initial rate from the state
      this.gameLookupPoints = [
        {
          x: 0,
          y: stateInputs.currentRate || 0
        }
      ]
    }
    const gameDataVarSpec = this.listing.varSpecs.get('_planning_data')
    const gameLookup = createLookupDef(gameDataVarSpec, this.gameLookupPoints)
    const lookups = [gameLookup]

    // Set the "busy" flag (to put the UI into a non-editable state)
    this.writableBusy.set(true)

    // Run the model asynchronously
    this.runner.runModel(inputValues, this.outputs, { lookups }).then(() => {
      if (state.maxGraphTime > 0) {
        // Reveal the graph plots with an animation from left to right
        const duration = 600
        const animatedGraphTime = state.maxGraphTime - state.minGraphTime
        for (let i = 0; i <= duration; i += 10) {
          const animTimeInMonths = state.minGraphTime + (i / duration) * animatedGraphTime
          setTimeout(() => {
            this.onDataUpdated?.(this.outputs, animTimeInMonths)
            if (i === duration) {
              // Clear the "busy" flag when the animation completes
              this.writableBusy.set(false)
            }
          }, i)
        }
      } else {
        // Update the graph data without animation
        this.onDataUpdated?.(this.outputs, 0)
        this.writableBusy.set(false)
      }
    })
  }
}
