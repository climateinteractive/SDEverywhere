// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { derived, get, writable } from 'svelte/store'

import type {
  BundleModel,
  ComparisonConfig,
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary,
  ComparisonScenario,
  ComparisonTestSummary,
  ImplVar,
  ScenarioSpec,
  TraceDatasetReport,
  TraceOptions,
  TraceReport
} from '@sdeverywhere/check-core'
import { categorizeComparisonTestSummaries, TraceRunner } from '@sdeverywhere/check-core'

import { SelectorOptionViewModel, SelectorViewModel } from '../_shared/selector-vm'

import type { TracePointViewModel, TraceRowViewModel } from './trace-row-vm'
import { readDat } from './read-dat'

export interface TraceGroupViewModel {
  title: string
  rows: TraceRowViewModel[]
}

export class TraceViewModel {
  private readonly bundleModelL: BundleModel
  private readonly bundleModelR: BundleModel

  public readonly bundleNameL: string
  public readonly bundleNameR: string

  public readonly sourceSelector0: SelectorViewModel
  public readonly sourceSelector1: SelectorViewModel

  public readonly selectedSource0: Readable<string>
  public readonly selectedSource1: Readable<string>

  public readonly scenarioSelector0: Readable<SelectorViewModel>
  public readonly scenarioSelector1: Readable<SelectorViewModel>

  private readonly selectedScenarioSpecUid0: Writable<string | undefined>
  private readonly selectedScenarioSpecUid1: Writable<string | undefined>

  public readonly selectedScenarioSpec0: Readable<ScenarioSpec | undefined>
  public readonly selectedScenarioSpec1: Readable<ScenarioSpec | undefined>

  public readonly datText: Writable<string | undefined>

  private readonly writableStatusMessage: Writable<string | undefined>
  public readonly statusMessage: Readable<string>

  private readonly writableGroups: Writable<TraceGroupViewModel[]>
  public readonly groups: Readable<TraceGroupViewModel[]>

  private running = false

  constructor(public readonly comparisonConfig: ComparisonConfig, terseSummaries: ComparisonTestSummary[]) {
    // Extract the bundle models
    this.bundleModelL = comparisonConfig.bundleL.model
    this.bundleModelR = comparisonConfig.bundleR.model

    // Extract the bundle names
    this.bundleNameL = comparisonConfig.bundleL.name
    this.bundleNameR = comparisonConfig.bundleR.name

    // Configure the source selectors
    const selectedSource0 = writable('left')
    this.sourceSelector0 = new SelectorViewModel(
      [
        new SelectorOptionViewModel(this.bundleNameL, 'left'),
        new SelectorOptionViewModel(this.bundleNameR, 'right'),
        new SelectorOptionViewModel('DAT file', 'dat')
      ],
      selectedSource0
    )

    // XXX: For now we only allow comparing the "right" bundle to another since `TraceRunner` only supports that
    const selectedSource1 = writable('right')
    this.sourceSelector1 = new SelectorViewModel(
      [new SelectorOptionViewModel(this.bundleNameR, 'right')],
      selectedSource1
    )

    this.selectedSource0 = selectedSource0
    this.selectedSource1 = selectedSource1

    // Determine the available scenarios for each bundle
    const comparisonGroups = categorizeComparisonTestSummaries(comparisonConfig, terseSummaries)
    const groupsByScenario = comparisonGroups.byScenario
    const [scenarioOptionsL, scenarioSpecsL] = scenarioOptionsForBundle('left', this.bundleNameL, groupsByScenario)
    const [scenarioOptionsR, scenarioSpecsR] = scenarioOptionsForBundle('right', this.bundleNameR, groupsByScenario)

    // Configure each scenario selector when the source is changed
    this.selectedScenarioSpecUid0 = writable(undefined)
    this.selectedScenarioSpecUid1 = writable(undefined)
    this.scenarioSelector0 = derived(this.selectedSource0, $selectedSource0 => {
      switch ($selectedSource0) {
        case 'left':
          return createScenarioSelectorViewModel(scenarioOptionsL, this.selectedScenarioSpecUid0)
        case 'right':
          return createScenarioSelectorViewModel(scenarioOptionsR, this.selectedScenarioSpecUid0)
        case 'dat':
          return undefined
        default:
          throw new Error(`Unhandled source ${$selectedSource0}`)
      }
    })
    // XXX: For now we only allow for selecting the "right" bundle as the second source
    this.scenarioSelector1 = derived(this.selectedSource1, () => {
      return createScenarioSelectorViewModel(scenarioOptionsR, this.selectedScenarioSpecUid1)
    })

    // Derive the scenario specs from the selector states
    this.selectedScenarioSpec0 = derived(
      [this.selectedSource0, this.selectedScenarioSpecUid0],
      ([$selectedSource0, $selectedScenarioSpecUid]) => {
        switch ($selectedSource0) {
          case 'left':
            return scenarioSpecsL.find(spec => spec.uid === $selectedScenarioSpecUid)
          case 'right':
            return scenarioSpecsR.find(spec => spec.uid === $selectedScenarioSpecUid)
          case 'dat':
            return undefined
          default:
            throw new Error(`Unhandled source ${$selectedSource0}`)
        }
      }
    )
    // XXX: For now we only allow for selecting the "right" bundle as the second source
    this.selectedScenarioSpec1 = derived(this.selectedScenarioSpecUid1, $selectedScenarioSpecUid => {
      return scenarioSpecsR.find(spec => spec.uid === $selectedScenarioSpecUid)
    })

    // Set the initial dat text to undefined
    this.datText = writable(undefined)

    // Configure the initial UI state
    this.writableStatusMessage = writable('Loading…')
    this.statusMessage = this.writableStatusMessage
    this.writableGroups = writable([])
    this.groups = this.writableGroups
  }

  public run(): void {
    // For now, we only allow one run at a time
    if (this.running) {
      return
    }

    // Reset the UI
    this.writableGroups.set([])
    this.writableStatusMessage.set('Running comparisons, please wait…')
    this.running = true

    // Configure the trace options using the selected sources and scenarios
    const source0 = get(this.sourceSelector0.selectedValue)
    let traceOptions: TraceOptions
    if (source0 === 'dat') {
      // We are comparing to a dat file; parse the dat file and convert to a `DatasetMap`
      const datText = get(this.datText)
      if (datText === undefined) {
        this.writableStatusMessage.set('Select a DAT file for comparison')
        this.running = false
        return
      }
      const extData = readDat(datText, 'ModelImpl_')
      const bundleModel = this.bundleModelR
      const scenarioSpec = get(this.selectedScenarioSpec1)
      traceOptions = {
        kind: 'compare-to-ext-data',
        extData,
        bundleModel,
        scenarioSpec
      }
    } else {
      // We are comparing to another bundle
      let bundleModel0: BundleModel
      if (source0 === 'left') {
        bundleModel0 = this.bundleModelL
      } else {
        bundleModel0 = this.bundleModelR
      }
      const scenarioSpec0 = get(this.selectedScenarioSpec0)
      const bundleModel1 = this.bundleModelR
      const scenarioSpec1 = get(this.selectedScenarioSpec1)
      traceOptions = {
        kind: 'compare-to-bundle',
        bundleModel0,
        scenarioSpec0: scenarioSpec0,
        bundleModel1,
        scenarioSpec1: scenarioSpec1
      }
    }

    // TODO: Get this threshold value from the UI
    const threshold = 0

    // Run the trace
    const traceRunner = new TraceRunner()
    traceRunner.onComplete = report => {
      // console.log('COMPLETE!')
      const groups = groupsFromReport(this.bundleModelR, report, threshold)
      this.writableGroups.set(groups)
      if (groups.length === 0) {
        this.writableStatusMessage.set('No comparisons were performed. Check that the DAT file is valid.')
      } else {
        this.writableStatusMessage.set(undefined)
      }
      this.running = false
    }
    traceRunner.onError = error => {
      // Show error message
      console.error(error)
      this.writableStatusMessage.set(error.message)
      this.running = false
    }
    traceRunner.start(traceOptions)
  }
}

export function createTraceViewModel(
  comparisonConfig: ComparisonConfig,
  terseSummaries: ComparisonTestSummary[]
): TraceViewModel {
  return new TraceViewModel(comparisonConfig, terseSummaries)
}

function groupsFromReport(bundleModelR: BundleModel, report: TraceReport, threshold: number): TraceGroupViewModel[] {
  // TODO: Handle case where implVarGroups is undefined
  const implVars = bundleModelR.modelSpec.implVars
  const implVarGroups = bundleModelR.modelSpec.implVarGroups

  // Get min/max times from datasets
  // XXX: This would be simpler if the min/max times were required in ModelSpec
  let modelMinTime: number
  let modelMaxTime: number
  for (const datasetReport of report.datasetReports.values()) {
    if (datasetReport.points.size > 1) {
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      for (const t of datasetReport.points.keys()) {
        min = Math.min(t, min)
        max = Math.max(t, max)
      }
      modelMinTime = min
      modelMaxTime = max
      break
    }
  }
  if (modelMinTime === undefined || modelMaxTime === undefined) {
    console.error('Failed to determine min/max times')
    return []
  }

  function point(datasetReport: TraceDatasetReport, time: number): TracePointViewModel {
    const points = datasetReport.points
    const p = points.get(time)
    let color: string
    let empty = false
    if (p) {
      const rawDiff = Math.abs(p.valueR - p.valueL)
      if (rawDiff === 0) {
        color = 'green'
      } else {
        // TODO: Revisit handling of comparisons against zero.  For now if the reference
        // (left) value is zero, treat any difference as 100%.
        const diff = p.valueL !== 0 ? Math.abs(rawDiff / p.valueL) : 1
        const pctDiff = diff * 100
        if (pctDiff < threshold) {
          color = 'orange'
        } else {
          color = 'crimson'
        }
      }
    } else {
      color = 'crimson'
      empty = true
    }
    return {
      color,
      empty,
      diffPoint: p
    }
  }

  function row(fn: string | undefined, implVar: ImplVar, datasetReport: TraceDatasetReport): TraceRowViewModel {
    const points: TracePointViewModel[] = []

    switch (fn) {
      case 'initConstants':
      case 'initLevels':
        // For initConstants and initLevels, only show one data point for t=0
        points.push(point(datasetReport, modelMinTime))
        break
      case 'evalLevels':
        // For evalLevels, show data points for t>0; use an empty square for
        // the first item
        points.push({
          color: 'gray',
          empty: true
        })
        for (let t = modelMinTime + 1; t <= modelMaxTime; t++) {
          points.push(point(datasetReport, t))
        }
        break
      default:
        // For all other cases, show one data point for each time step
        for (let t = modelMinTime; t <= modelMaxTime; t++) {
          points.push(point(datasetReport, t))
        }
        break
    }

    return {
      varName: implVar.varName,
      points
    }
  }

  const groups: TraceGroupViewModel[] = []
  for (const groupSpec of implVarGroups) {
    const rows: TraceRowViewModel[] = []
    for (const datasetKey of groupSpec.datasetKeys) {
      const implVar = implVars.get(datasetKey)
      if (implVar === undefined) {
        // TODO: Display this warning in the UI
        console.warn(`WARNING: No impl var found for key=${datasetKey}, skipping trace row`)
        continue
      }

      const datasetReport = report.datasetReports.get(datasetKey)
      if (datasetReport === undefined) {
        // TODO: Display this warning in the UI
        console.warn(`WARNING: No dataset report found for key=${datasetKey}, skipping trace row`)
        continue
      }

      rows.push(row(groupSpec.fn, implVar, datasetReport))
    }
    groups.push({
      title: groupSpec.title,
      rows
    })
  }
  return groups
}

function scenarioOptionsForBundle(
  side: 'left' | 'right',
  bundleName: string,
  groupsByScenario: ComparisonGroupSummariesByCategory
): [SelectorOptionViewModel[], ScenarioSpec[]] {
  const scenarioOptions: SelectorOptionViewModel[] = []
  const scenarioSpecs: ScenarioSpec[] = []

  function addScenarioOption(summary: ComparisonGroupSummary): void {
    const scenario = summary.root as ComparisonScenario
    const spec = side === 'right' ? scenario.specR : scenario.specL
    if (!spec) {
      return
    }
    scenarioSpecs.push(spec)

    let scenarioTitle = scenario.title
    if (scenario.subtitle) {
      scenarioTitle += ` ${scenario.subtitle}`
    }
    scenarioOptions.push(new SelectorOptionViewModel(scenarioTitle, spec.uid))
  }

  function addScenarioOptions(summaries: ComparisonGroupSummary[], header: string, value: string): void {
    if (summaries.length === 0) {
      return
    }
    scenarioOptions.push(new SelectorOptionViewModel(header, value, { disabled: true }))
    summaries.forEach(addScenarioOption)
  }

  const onlyInSide = side === 'left' ? groupsByScenario.onlyInLeft : groupsByScenario.onlyInRight
  addScenarioOptions(onlyInSide, `--- Scenarios only valid in ${bundleName}`, '___only_in_side')
  addScenarioOptions(groupsByScenario.withDiffs, `--- Scenarios producing differences`, '___with_diffs')
  addScenarioOptions(groupsByScenario.withoutDiffs, `--- Scenarios NOT producing differences`, '___without_diffs')

  return [scenarioOptions, scenarioSpecs]
}

function createScenarioSelectorViewModel(
  scenarioOptions: SelectorOptionViewModel[],
  selectedScenarioSpecUid: Writable<string | undefined>
): SelectorViewModel {
  // XXX: Select the "All inputs at default" scenario by default.  This is fragile because it assumes that the
  // scenario is always present and has a specific UID, but there is no guarantee of that.
  let initialScenarioSpecUid: string
  for (const option of scenarioOptions) {
    if (option.label === 'All inputs at default') {
      initialScenarioSpecUid = option.value
      break
    }
  }
  selectedScenarioSpecUid.set(initialScenarioSpecUid)

  return new SelectorViewModel(scenarioOptions, selectedScenarioSpecUid)
}
