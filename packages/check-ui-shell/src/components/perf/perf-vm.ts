// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { get, writable } from 'svelte/store'

import type { BundleModel, Config, PerfReport } from '@sdeverywhere/check-core'

import type { DotPlotViewModel } from './dot-plot-vm'
import { createDotPlotViewModel } from './dot-plot-vm'
import type { PerfTableRowViewModel } from './perf-table-row-vm'

export class PerfViewModel {
  private readonly writableRows: Writable<PerfTableRowViewModel[]>
  public readonly rows: Readable<PerfTableRowViewModel[]>
  private minTime = Number.MAX_VALUE
  private maxTime = 0

  constructor(public readonly bundleModelL: BundleModel, public readonly bundleModelR: BundleModel) {
    this.writableRows = writable([])
    this.rows = this.writableRows
  }

  addRow(reportL: PerfReport, reportR: PerfReport): void {
    // Compute the min/max time across all rows
    const reportMinTime = Math.min(reportL.minTime, reportR.minTime)
    const reportMaxTime = Math.max(reportL.maxTime, reportR.maxTime)
    const overallMinTime = Math.min(this.minTime, reportMinTime)
    const overallMaxTime = Math.max(this.maxTime, reportMaxTime)
    this.minTime = overallMinTime
    this.maxTime = overallMaxTime

    function updateBounds(vm: DotPlotViewModel): DotPlotViewModel {
      return createDotPlotViewModel(vm.values, overallMinTime, overallMaxTime, vm.avg)
    }

    // Update the dot plots for all existing rows so that they all use the
    // same min/max bounds
    const allRows = get(this.writableRows)
    for (const row of allRows) {
      row.dotPlotL = updateBounds(row.dotPlotL)
      row.dotPlotR = updateBounds(row.dotPlotR)
    }

    function dotPlot(report: PerfReport): DotPlotViewModel {
      return createDotPlotViewModel(report.allTimes, overallMinTime, overallMaxTime, report.avgTime)
    }

    // Add the new row
    allRows.push({
      num: allRows.length + 1,
      minTimeL: reportL.minTime.toFixed(1),
      avgTimeL: reportL.avgTime.toFixed(1),
      maxTimeL: reportL.maxTime.toFixed(1),
      minTimeR: reportR.minTime.toFixed(1),
      avgTimeR: reportR.avgTime.toFixed(1),
      maxTimeR: reportR.maxTime.toFixed(1),
      dotPlotL: dotPlot(reportL),
      dotPlotR: dotPlot(reportR)
    })
    this.writableRows.set(allRows)
  }
}

export function createPerfViewModel(config: Config): PerfViewModel {
  return new PerfViewModel(config.compare.bundleL.model, config.compare.bundleR.model)
}
