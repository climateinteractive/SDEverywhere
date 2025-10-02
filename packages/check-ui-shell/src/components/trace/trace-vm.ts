// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type {
  BundleModel,
  ComparisonConfig,
  ComparisonGroupSummariesByCategory,
  ComparisonGroupSummary,
  ComparisonScenario,
  ComparisonTestSummary,
  DatasetMap,
  ImplVar,
  ScenarioSpec,
  TraceDatasetReport,
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

  public readonly scenarioSelectorL: SelectorViewModel
  public readonly scenarioSelectorR: SelectorViewModel

  private readonly writableGroups: Writable<TraceGroupViewModel[]>
  public readonly groups: Readable<TraceGroupViewModel[]>

  private readonly writableRunning: Writable<boolean>
  public readonly running: Readable<boolean>

  constructor(public readonly comparisonConfig: ComparisonConfig, terseSummaries: ComparisonTestSummary[]) {
    this.bundleModelL = comparisonConfig.bundleL.model
    this.bundleModelR = comparisonConfig.bundleR.model

    this.bundleNameL = comparisonConfig.bundleL.name
    this.bundleNameR = comparisonConfig.bundleR.name

    const comparisonGroups = categorizeComparisonTestSummaries(comparisonConfig, terseSummaries)
    const groupsByScenario = comparisonGroups.byScenario
    this.scenarioSelectorL = createScenarioSelectorViewModel(this.bundleNameL, groupsByScenario, 'left')
    this.scenarioSelectorR = createScenarioSelectorViewModel(this.bundleNameR, groupsByScenario, 'right')

    this.writableGroups = writable([])
    this.groups = this.writableGroups

    this.writableRunning = writable(false)
    this.running = this.writableRunning
  }

  public run(datText?: string): void {
    // If comparing to a dat file, parse the dat file and convert to a `DatasetMap`
    let extData: DatasetMap
    if (datText) {
      extData = readDat(datText, 'ModelImpl_')
      // console.log(extData)
    }

    this.writableGroups.set([])
    this.writableRunning.set(true)

    // XXX: Temporary
    function allInputsAtDefaultSpec(): ScenarioSpec {
      return {
        kind: 'all-inputs',
        uid: 'all_inputs_at_default',
        position: 'at-default'
      }
    }

    // XXX
    let scenarioSpecL: ScenarioSpec | undefined
    if (!extData) {
      scenarioSpecL = allInputsAtDefaultSpec()
    }

    // XXX
    const scenarioSpecR: ScenarioSpec = allInputsAtDefaultSpec()

    // TODO: Get this value from the UI
    const threshold = 0
    const traceRunner = new TraceRunner(this.bundleModelL, this.bundleModelR, scenarioSpecL, scenarioSpecR)
    traceRunner.onComplete = report => {
      console.log('COMPLETE!')
      this.writableGroups.set(groupsFromReport(/*this.bundleModelL,*/ this.bundleModelR, report, threshold))
      this.writableRunning.set(false)
    }
    traceRunner.onError = error => {
      // TODO: Show error message in view
      console.error(error)
      this.writableRunning.set(false)
    }
    traceRunner.start(extData)
  }
}

export function createTraceViewModel(
  comparisonConfig: ComparisonConfig,
  terseSummaries: ComparisonTestSummary[]
): TraceViewModel {
  return new TraceViewModel(comparisonConfig, terseSummaries)
}

function groupsFromReport(
  // bundleModelL: BundleModel,
  bundleModelR: BundleModel,
  report: TraceReport,
  threshold: number
): TraceGroupViewModel[] {
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

function createScenarioSelectorViewModel(
  bundleName: string,
  groupsByScenario: ComparisonGroupSummariesByCategory,
  side: 'left' | 'right'
): SelectorViewModel {
  const scenarioOptions: SelectorOptionViewModel[] = []

  function addScenarioOption(summary: ComparisonGroupSummary): void {
    const scenario = summary.root as ComparisonScenario
    const spec = side === 'right' ? scenario.specR : scenario.specL
    if (!spec) {
      return
    }
    let scenarioTitle = scenario.title
    if (scenario.subtitle) {
      scenarioTitle += ` ${scenario.subtitle}`
    }
    scenarioOptions.push(new SelectorOptionViewModel(scenarioTitle, scenario.key))
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

  // XXX: Select the "All inputs at default" scenario by default.  This is fragile because it assumes that the
  // display name is a certain value, but there is no guarantee of that.
  let initialValue: string
  for (const option of scenarioOptions) {
    if (option.label === 'All inputs at default') {
      initialValue = option.value
      break
    }
  }

  const selectedValue = writable(initialValue)
  return new SelectorViewModel(scenarioOptions, selectedValue)
}
