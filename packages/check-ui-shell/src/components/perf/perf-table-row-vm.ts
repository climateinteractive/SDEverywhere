// Copyright (c) 2021-2026 Climate Interactive / New Venture Fund

import type { DotPlotViewModel } from './dot-plot-vm'

/**
 * Indicates how to color a percent-change value.
 * - 'better': improvement (faster); rendered green.
 * - 'worse': regression (slower); rendered red.
 * - 'neutral': no change or not applicable; rendered dim.
 */
export type PerfPctChangeKind = 'better' | 'worse' | 'neutral'

/**
 * A single row in the perf-runner results table.  A row is either:
 * - a per-run row, displaying stats from one Run button click, or
 * - a summary row, pooling samples from every per-run row.
 */
export interface PerfTableRowViewModel {
  /** Label shown in the leftmost column ("1", "2", ... or "all" for summary). */
  label: string
  /** True if this row aggregates samples across all runs. */
  isSummary: boolean
  /** Median time for the left bundle, formatted to one decimal place. */
  medianTimeL: string
  /** Median time for the right bundle, formatted to one decimal place. */
  medianTimeR: string
  /** Trimmed-mean ("avg") time for the left bundle, formatted to one decimal place. */
  avgTimeL: string
  /** Trimmed-mean ("avg") time for the right bundle, formatted to one decimal place. */
  avgTimeR: string
  /** Signed percent change of the right avgTime relative to the left (e.g. "+2.5%"). */
  pctChange: string
  /** Hint for coloring the percent-change value. */
  pctChangeKind: PerfPctChangeKind
  /** 95th-percentile time for the left bundle, formatted to one decimal place. */
  p95TimeL: string
  /** 95th-percentile time for the right bundle, formatted to one decimal place. */
  p95TimeR: string
  /** Standard deviation for the left bundle, formatted to one decimal place. */
  stdDevL: string
  /** Standard deviation for the right bundle, formatted to one decimal place. */
  stdDevR: string
  /** Dot plot for the left bundle's samples. */
  dotPlotL: DotPlotViewModel
  /** Dot plot for the right bundle's samples. */
  dotPlotR: DotPlotViewModel
}
