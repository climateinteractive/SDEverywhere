// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import { assertNever } from 'assert-never'
import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type {
  CheckDataCoordinator,
  CheckPredicateOp,
  CheckPredicateReport,
  CheckPredicateTimeOptions,
  CheckScenario,
  DatasetKey,
  ScenarioSpec
} from '@sdeverywhere/check-core'

import type { ComparisonGraphViewModel, PlotStyle, Point, RefPlot } from '../../graphs/comparison-graph-vm'
import { pointsFromDataset } from '../../graphs/comparison-graph-vm'

let requestId = 1

export interface CheckSummaryGraphBoxContent {
  comparisonGraphViewModel: ComparisonGraphViewModel
}

export class CheckSummaryGraphBoxViewModel {
  public readonly baseRequestKey: string
  private requestKeys: string[] = []
  private expectedDataKeys: string[] = []
  private resolvedDataKeys: string[] = []
  private readonly opConstantRefs: Map<CheckPredicateOp, number> = new Map()
  private readonly resolvedData: Map<string, Point[]> = new Map()
  private readonly writableContent: Writable<CheckSummaryGraphBoxContent>
  public readonly content: Readable<CheckSummaryGraphBoxContent>
  private dataRequested = false
  private dataLoaded = false

  constructor(
    private readonly dataCoordinator: CheckDataCoordinator,
    private readonly scenario: CheckScenario,
    private readonly datasetKey: DatasetKey,
    private readonly predicateReport: CheckPredicateReport
  ) {
    this.baseRequestKey = `check-graph-box::${requestId++}`
    this.writableContent = writable(undefined)
    this.content = this.writableContent
  }

  requestData(): void {
    if (this.dataRequested) {
      return
    }
    this.dataRequested = true

    this.expectedDataKeys = []
    this.resolvedDataKeys = []
    this.requestKeys = []
    this.resolvedData.clear()

    // Request the primary dataset that is being checked
    this.expectedDataKeys.push('primary')
    this.requestDataset('primary', this.scenario.spec, this.datasetKey)

    // Determine which reference datasets need to be fetched
    const addOp = (op: CheckPredicateOp) => {
      const opRef = this.predicateReport.opRefs.get(op)
      if (opRef === undefined) {
        return
      }

      // Add the op as a data key so that we keep track of which
      // datasets need to be resolved
      this.expectedDataKeys.push(op)

      switch (opRef.kind) {
        case 'constant':
          // Add the constant value to the map.  A straight line segment
          // will be generated when the graph view model is created.
          this.resolvedDataKeys.push(op)
          this.opConstantRefs.set(op, opRef.value)
          break
        case 'data': {
          // Fetch the reference dataset
          const refScenario = opRef.dataRef.scenario.spec
          const refDatasetKey = opRef.dataRef.dataset.datasetKey
          this.requestDataset(op, refScenario, refDatasetKey)
          break
        }
        default:
          assertNever(opRef)
      }
    }
    addOp('gt')
    addOp('gte')
    addOp('lt')
    addOp('lte')
    addOp('eq')
    addOp('approx')
  }

  clearData(): void {
    if (this.dataRequested) {
      this.writableContent.set(undefined)
      if (!this.dataLoaded) {
        for (const requestKey of this.requestKeys) {
          this.dataCoordinator.cancelRequest(requestKey)
        }
        this.requestKeys = []
        this.resolvedData.clear()
      }
      this.dataRequested = false
      this.dataLoaded = false
    }
  }

  /**
   * Request a dataset for the given scenario and key.
   *
   * @param dataKey The key used to store the dataset that is received.
   * @param scenarioSpec The scenario to be configured.
   * @param datasetKey The key for the dataset to be fetched.
   */
  private requestDataset(dataKey: string, scenarioSpec: ScenarioSpec, datasetKey: DatasetKey): void {
    // Create the request key and add it to the set
    const requestKey = `${this.baseRequestKey}::${dataKey}`
    this.requestKeys.push(requestKey)

    this.dataCoordinator.requestDataset(requestKey, scenarioSpec, datasetKey, dataset => {
      if (!this.dataRequested) {
        return
      }

      // Mark this data as resolved
      this.resolvedDataKeys.push(dataKey)

      // Save the dataset points
      this.resolvedData.set(dataKey, pointsFromDataset(dataset))

      // Call the completion handler (this will only have an effect once all
      // expected datasets have been received)
      this.processResponses()
    })
  }

  /**
   * Should be called when a dataset response is received from the data coordinator.
   * If there are other pending requests, this will be a no-op.  Once all responses
   * are received, this will build the comparison graph view model.
   */
  private processResponses(): void {
    // Check that all expected datasets have been received
    if (this.resolvedDataKeys.length !== this.expectedDataKeys.length) {
      return
    }

    // Determine the min/max times for the primary dataset
    const primaryPoints = this.resolvedData.get('primary')
    const minDataTime = primaryPoints.reduce((min, p) => (p.x < min ? p.x : min), primaryPoints[0].x)
    const maxDataTime = primaryPoints.reduce((max, p) => (p.x > max ? p.x : max), primaryPoints[0].x)

    // Use the predicate's time spec to determine the reference line time bounds
    const timeSpec = this.predicateReport.time
    let minPredTime: number
    let maxPredTime: number
    type FilterTimeFunc = (t: number) => boolean
    let filterTime: FilterTimeFunc
    if (timeSpec === undefined) {
      // No time spec; use the time bounds of the primary dataset
      minPredTime = minDataTime
      maxPredTime = maxDataTime
      filterTime = t => t >= minDataTime && t <= maxDataTime
    } else {
      if (typeof timeSpec === 'number') {
        // There is only a single time value
        minPredTime = timeSpec
        maxPredTime = timeSpec
        filterTime = t => t === minDataTime
      } else if (Array.isArray(timeSpec)) {
        // This is an inclusive range shorthand (e.g. `time: [0, 1]`)
        minPredTime = timeSpec[0]
        maxPredTime = timeSpec[1]
        filterTime = t => t >= minDataTime && t <= maxDataTime
      } else {
        // This is a full time spec with `after` and/or `before`.  Allow up
        // to two time predicates in the same check; this allows for range
        // comparisons (for example, after t0 AND before t1).
        const timeOpts = timeSpec as CheckPredicateTimeOptions
        const timeFuncs: FilterTimeFunc[] = []
        if (timeOpts.after_excl !== undefined) {
          timeFuncs.push(t => t > timeOpts.after_excl)
          minPredTime = timeOpts.after_excl
        }
        if (timeOpts.after_incl !== undefined) {
          timeFuncs.push(t => t >= timeOpts.after_incl)
          minPredTime = timeOpts.after_incl
        }
        if (timeOpts.before_excl !== undefined) {
          timeFuncs.push(t => t < timeSpec.before_excl)
          maxPredTime = timeOpts.before_excl
        }
        if (timeOpts.before_incl !== undefined) {
          timeFuncs.push(t => t <= timeSpec.before_incl)
          maxPredTime = timeOpts.before_incl
        }
        if (minPredTime === undefined) {
          minPredTime = minDataTime
        }
        if (maxPredTime === undefined) {
          maxPredTime = maxDataTime
        }
        filterTime = t => {
          for (const f of timeFuncs) {
            if (!f(t)) {
              return false
            }
          }
          return true
        }
      }
    }

    // Add reference lines
    const refPlots: RefPlot[] = []

    const addRefPlot = (op: CheckPredicateOp, style: PlotStyle | undefined, delta = 0) => {
      const constantRef = this.opConstantRefs.get(op)
      if (constantRef !== undefined) {
        if (minPredTime === maxPredTime) {
          // Add a single point
          refPlots.push({
            points: [{ x: minPredTime, y: constantRef + delta }],
            style
          })
        } else {
          // Add a line segment for the constant
          refPlots.push({
            points: [
              { x: minPredTime, y: constantRef + delta },
              { x: maxPredTime, y: constantRef + delta }
            ],
            style
          })
        }
        return
      }

      const points = this.resolvedData.get(op)
      if (points !== undefined) {
        // Filter the reference dataset so that only the points that
        // fall within the time bounds are included
        let filtered = points.filter(p => filterTime(p.x))
        if (delta !== 0) {
          filtered = filtered.map(p => {
            return { x: p.x, y: p.y + delta }
          })
        }
        refPlots.push({
          points: filtered,
          style
        })
      }
    }

    const hasOp = (op: CheckPredicateOp) => {
      return this.opConstantRefs.has(op) || this.resolvedData.has(op)
    }
    const hasGt = hasOp('gt') || hasOp('gte')
    const hasLt = hasOp('lt') || hasOp('lte')

    addRefPlot('gt', hasLt ? 'fill-to-next' : 'fill-above')
    addRefPlot('gte', hasLt ? 'fill-to-next' : 'fill-above')
    addRefPlot('lt', hasGt ? 'normal' : 'fill-below')
    addRefPlot('lte', hasGt ? 'normal' : 'fill-below')
    addRefPlot('eq', 'wide')

    // Handle `approx` specially by adding two reference lines (one for the
    // lower bound and one for the upper bound)
    const tolerance = this.predicateReport.tolerance || 0.1
    addRefPlot('approx', 'fill-to-next', -tolerance)
    addRefPlot('approx', 'normal', tolerance)
    addRefPlot('approx', 'dashed')

    // Create the comparison graph view model
    const comparisonGraphViewModel: ComparisonGraphViewModel = {
      key: this.baseRequestKey,
      refPlots,
      pointsL: [],
      pointsR: primaryPoints,
      xMin: undefined,
      xMax: undefined
    }

    // Set the content
    this.writableContent.set({
      comparisonGraphViewModel
    })
    this.dataLoaded = true
  }
}
