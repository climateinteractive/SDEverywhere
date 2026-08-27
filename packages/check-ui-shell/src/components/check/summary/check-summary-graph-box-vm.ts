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

import type {
  ComparisonGraphPlot,
  ComparisonGraphPlotStyle,
  ComparisonGraphViewModel,
  Point
} from '../../graphs/comparison-graph-vm'
import { pointsFromDataset } from '../../graphs/comparison-graph-vm'

let requestId = 1

/**
 * Return the key used to store the data for one of the datasets referenced by
 * the given predicate op.
 *
 * @param op The predicate operation.
 * @param index The index of the referenced dataset.
 */
function refDataKey(op: CheckPredicateOp, index: number): string {
  return `${op}::${index}`
}

/**
 * Return the point-wise sum of the given sets of points.  Note that a point is only
 * included in the result if a value is available at that time in every one of the
 * given sets.
 *
 * @param pointArrays The sets of points to be summed.
 */
function sumPoints(pointArrays: Point[][]): Point[] {
  const firstPoints = pointArrays[0]
  const otherPointMaps = pointArrays.slice(1).map(points => new Map(points.map(p => [p.x, p.y])))

  const summed: Point[] = []
  for (const point of firstPoints) {
    let sum = point.y
    let complete = true
    for (const otherPointMap of otherPointMaps) {
      const otherY = otherPointMap.get(point.x)
      if (otherY === undefined) {
        complete = false
        break
      }
      sum += otherY
    }
    if (complete) {
      summed.push({ x: point.x, y: sum })
    }
  }

  return summed
}

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

      switch (opRef.kind) {
        case 'constant':
          // Add the op as a data key so that we keep track of which datasets
          // need to be resolved
          this.expectedDataKeys.push(op)

          // Add the constant value to the map.  A straight line segment
          // will be generated when the graph view model is created.
          this.resolvedDataKeys.push(op)
          this.opConstantRefs.set(op, opRef.value)
          break
        case 'data': {
          // Fetch each referenced dataset separately; if the op references more
          // than one dataset, they will be combined into a single set of points
          // once all responses have been received
          opRef.dataRef.refs.forEach((ref, index) => {
            const dataKey = refDataKey(op, index)
            this.expectedDataKeys.push(dataKey)
            this.requestDataset(dataKey, ref.scenario.spec, ref.dataset.datasetKey)
          })
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

    this.dataCoordinator.requestDataset(requestKey, scenarioSpec, datasetKey, undefined, dataset => {
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
   * Combine the data for each op that references one or more datasets, and store
   * the resulting points under the key for that op.  When an op references multiple
   * datasets, the points are combined according to the op declared in the data ref
   * (currently `sum` is the only supported op).
   */
  private combineRefData(): void {
    const combineOp = (op: CheckPredicateOp) => {
      const opRef = this.predicateReport.opRefs.get(op)
      if (opRef === undefined || opRef.kind !== 'data') {
        return
      }

      const pointArrays = opRef.dataRef.refs.map((_, index) => this.resolvedData.get(refDataKey(op, index)))
      if (pointArrays.some(points => points === undefined)) {
        return
      }

      if (opRef.dataRef.op === 'sum') {
        this.resolvedData.set(op, sumPoints(pointArrays))
      } else if (pointArrays.length === 1) {
        // There is a single referenced dataset, so no combining is needed
        this.resolvedData.set(op, pointArrays[0])
      }
      // Note that if multiple datasets are referenced but the op is not recognized,
      // we intentionally leave the data unset so that no reference line is displayed
    }
    combineOp('gt')
    combineOp('gte')
    combineOp('lt')
    combineOp('lte')
    combineOp('eq')
    combineOp('approx')
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

    // Combine the referenced datasets for each op into a single set of points
    this.combineRefData()

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

    // Add the primary plot
    const plots: ComparisonGraphPlot[] = []
    plots.push({
      points: primaryPoints,
      color: 'deepskyblue',
      style: 'normal'
    })

    // Add the primary and reference plots
    const addRefPlot = (
      op: CheckPredicateOp,
      style: ComparisonGraphPlotStyle | undefined,
      delta = 0,
      lineWidth?: number
    ) => {
      const color = 'green'
      if (lineWidth === undefined) {
        lineWidth = 1
      }
      const constantRef = this.opConstantRefs.get(op)
      if (constantRef !== undefined) {
        if (minPredTime === maxPredTime) {
          // Add a single point
          plots.push({
            points: [{ x: minPredTime, y: constantRef + delta }],
            color,
            style,
            lineWidth
          })
        } else {
          // Add a line segment for the constant
          plots.push({
            points: [
              { x: minPredTime, y: constantRef + delta },
              { x: maxPredTime, y: constantRef + delta }
            ],
            color,
            style,
            lineWidth
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
        plots.push({
          points: filtered,
          color,
          style,
          lineWidth
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
    addRefPlot('eq', 'normal', 0, 5)

    // Handle `approx` specially by adding two reference lines (one for the
    // lower bound and one for the upper bound)
    const tolerance = this.predicateReport.tolerance || 0.1
    addRefPlot('approx', 'fill-to-next', -tolerance)
    addRefPlot('approx', 'normal', tolerance)
    addRefPlot('approx', 'dashed', 0)

    // Create the comparison graph view model
    const comparisonGraphViewModel: ComparisonGraphViewModel = {
      key: this.baseRequestKey,
      plots,
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
