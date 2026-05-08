// Copyright (c) 2021-2026 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { writable } from 'svelte/store'

import type { PerfReport } from '@sdeverywhere/check-core'
import { PerfStats } from '@sdeverywhere/check-core'

import type { DotPlotViewModel } from './dot-plot-vm'
import { createDotPlotViewModel } from './dot-plot-vm'
import type { PerfPctChangeKind, PerfTableRowViewModel } from './perf-table-row-vm'

/**
 * View model for the perf-runner results table.  Holds a row per Run-button click
 * plus a summary row that pools samples across all runs once at least one run
 * has completed.
 */
export class PerfViewModel {
  private readonly writableRows: Writable<PerfTableRowViewModel[]>
  /** The visible rows, including the summary row when present. */
  public readonly rows: Readable<PerfTableRowViewModel[]>

  /** Raw timing samples for the left bundle, partitioned by run. */
  private readonly samplesByRunL: number[][] = []
  /** Raw timing samples for the right bundle, partitioned by run. */
  private readonly samplesByRunR: number[][] = []

  constructor() {
    this.writableRows = writable([])
    this.rows = this.writableRows
  }

  /**
   * Append a new run to the table and refresh the summary row.
   *
   * @param reportL The performance report for the left bundle.
   * @param reportR The performance report for the right bundle.
   */
  addRow(reportL: PerfReport, reportR: PerfReport): void {
    this.samplesByRunL.push(reportL.allTimes)
    this.samplesByRunR.push(reportR.allTimes)

    const summaryReportL = pooledReport(this.samplesByRunL)
    const summaryReportR = pooledReport(this.samplesByRunR)

    // Determine shared bounds for all dot plots.  We use the absolute min as
    // the lower bound and the pooled-p95 as the upper bound so a single
    // outlier sample doesn't squish every plot to the left edge.  Samples
    // beyond p95 are rendered as an overflow indicator on the right.
    const lowerBound = Math.min(summaryReportL.minTime, summaryReportR.minTime)
    const upperBound = Math.max(summaryReportL.p95Time, summaryReportR.p95Time)

    const perRunRows: PerfTableRowViewModel[] = []
    for (let i = 0; i < this.samplesByRunL.length; i++) {
      const runReportL = reportFromTimes(this.samplesByRunL[i])
      const runReportR = reportFromTimes(this.samplesByRunR[i])
      perRunRows.push(
        buildRow(`${i + 1}`, false, runReportL, runReportR, lowerBound, upperBound)
      )
    }

    const summaryRow = buildRow(
      'all',
      true,
      summaryReportL,
      summaryReportR,
      lowerBound,
      upperBound
    )

    this.writableRows.set([...perRunRows, summaryRow])
  }
}

/**
 * Compute a `PerfReport` from the given list of run-time samples.
 */
function reportFromTimes(times: number[]): PerfReport {
  const stats = new PerfStats()
  for (const t of times) {
    stats.addRun(t)
  }
  return stats.toReport()
}

/**
 * Compute a pooled `PerfReport` across multiple runs by treating every sample
 * equally.
 */
function pooledReport(samplesByRun: number[][]): PerfReport {
  const stats = new PerfStats()
  for (const runSamples of samplesByRun) {
    for (const t of runSamples) {
      stats.addRun(t)
    }
  }
  return stats.toReport()
}

/**
 * Compute the percent change of `r` relative to `l` (i.e. (r - l) / l * 100).
 * Returns 0 if `l` is zero.
 */
function pctChange(l: number, r: number): number {
  if (l === 0) {
    return 0
  }
  return ((r - l) / l) * 100
}

/**
 * Format a signed percentage with a leading "+" or "-" and a "%" suffix.
 * Returns an empty string if `value` is exactly 0.
 */
function formatSignedPct(value: number): string {
  if (value === 0) {
    return ''
  }
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Classify the kind of percent change for color hinting.  A value below the
 * threshold (default 0.05%) is treated as neutral to avoid noisy coloring.
 */
function classifyPctChange(value: number): PerfPctChangeKind {
  if (Math.abs(value) < 0.05) {
    return 'neutral'
  }
  return value < 0 ? 'better' : 'worse'
}

/**
 * Build a single `PerfTableRowViewModel`.
 */
function buildRow(
  label: string,
  isSummary: boolean,
  reportL: PerfReport,
  reportR: PerfReport,
  lowerBound: number,
  upperBound: number
): PerfTableRowViewModel {
  const change = pctChange(reportL.avgTime, reportR.avgTime)
  return {
    label,
    isSummary,
    medianTimeL: reportL.medianTime.toFixed(1),
    medianTimeR: reportR.medianTime.toFixed(1),
    avgTimeL: reportL.avgTime.toFixed(1),
    avgTimeR: reportR.avgTime.toFixed(1),
    pctChange: formatSignedPct(change),
    pctChangeKind: classifyPctChange(change),
    p95TimeL: reportL.p95Time.toFixed(1),
    p95TimeR: reportR.p95Time.toFixed(1),
    stdDevL: reportL.stdDev.toFixed(1),
    stdDevR: reportR.stdDev.toFixed(1),
    dotPlotL: dotPlot(reportL, lowerBound, upperBound),
    dotPlotR: dotPlot(reportR, lowerBound, upperBound)
  }
}

/**
 * Build a `DotPlotViewModel` for the given report and bounds.
 */
function dotPlot(report: PerfReport, lower: number, upper: number): DotPlotViewModel {
  return createDotPlotViewModel(report.allTimes, lower, upper, report.avgTime)
}

/**
 * Create an empty `PerfViewModel`.
 */
export function createPerfViewModel(): PerfViewModel {
  return new PerfViewModel()
}
