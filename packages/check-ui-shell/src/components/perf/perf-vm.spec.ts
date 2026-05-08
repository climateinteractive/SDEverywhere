// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'

import { PerfStats } from '@sdeverywhere/check-core'

import { createPerfViewModel } from './perf-vm'

/**
 * Build a `PerfReport` from the given run-time samples.
 */
function reportOf(times: number[]) {
  const stats = new PerfStats()
  for (const t of times) {
    stats.addRun(t)
  }
  return stats.toReport()
}

describe('PerfViewModel', () => {
  it('should append a per-run row plus a summary row when one run is added', () => {
    const vm = createPerfViewModel()
    vm.addRow(reportOf([10, 11, 12, 13, 14]), reportOf([20, 21, 22, 23, 24]))

    const rows = get(vm.rows)
    expect(rows.length).toBe(2)
    expect(rows[0].label).toBe('1')
    expect(rows[0].isSummary).toBe(false)
    expect(rows[1].label).toBe('all')
    expect(rows[1].isSummary).toBe(true)
  })

  it('should pool samples across runs in the summary row', () => {
    const vm = createPerfViewModel()
    vm.addRow(reportOf([10, 10, 10, 10]), reportOf([20, 20, 20, 20]))
    vm.addRow(reportOf([12, 12, 12, 12]), reportOf([24, 24, 24, 24]))

    const rows = get(vm.rows)
    expect(rows.length).toBe(3)
    const summary = rows[2]
    // Pooled left samples are [10,10,10,10,12,12,12,12]; trimmed mean of middle 50% = 11
    expect(summary.avgTimeL).toBe('11.0')
    // Pooled right samples = [20,20,20,20,24,24,24,24]; trimmed mean = 22
    expect(summary.avgTimeR).toBe('22.0')
  })

  it('should compute percent change of avg from L to R', () => {
    const vm = createPerfViewModel()
    // L avg = 100, R avg = 90 -> -10%
    vm.addRow(reportOf([100, 100, 100, 100]), reportOf([90, 90, 90, 90]))

    const rows = get(vm.rows)
    expect(rows[0].pctChange).toBe('-10.0%')
    expect(rows[0].pctChangeKind).toBe('better')
  })

  it('should classify a regression as worse', () => {
    const vm = createPerfViewModel()
    vm.addRow(reportOf([100, 100, 100, 100]), reportOf([110, 110, 110, 110]))

    const rows = get(vm.rows)
    expect(rows[0].pctChange).toBe('+10.0%')
    expect(rows[0].pctChangeKind).toBe('worse')
  })

  it('should classify a tiny change as neutral and emit no pct text', () => {
    const vm = createPerfViewModel()
    vm.addRow(reportOf([100, 100, 100, 100]), reportOf([100, 100, 100, 100]))

    const rows = get(vm.rows)
    expect(rows[0].pctChange).toBe('')
    expect(rows[0].pctChangeKind).toBe('neutral')
  })

  it('should expose median, p95, and stddev formatted to one decimal', () => {
    const vm = createPerfViewModel()
    vm.addRow(reportOf([1, 2, 3, 4, 5]), reportOf([10, 20, 30, 40, 50]))

    const rows = get(vm.rows)
    expect(rows[0].medianTimeL).toBe('3.0')
    expect(rows[0].medianTimeR).toBe('30.0')
    expect(rows[0].p95TimeL).toMatch(/^4\.[6-9]/)
    expect(rows[0].p95TimeR).toMatch(/^4[6-9]/)
    expect(rows[0].stdDevL).not.toBe('0.0')
    expect(rows[0].stdDevR).not.toBe('0.0')
  })

  it('should produce dot plot bounds based on pooled p95 so outliers do not skew the scale', () => {
    const vm = createPerfViewModel()
    // Most samples cluster around 20; one extreme outlier at 1000
    const dense: number[] = []
    for (let i = 0; i < 100; i++) {
      dense.push(20)
    }
    dense.push(1000)
    vm.addRow(reportOf(dense), reportOf(dense.slice()))

    const rows = get(vm.rows)
    // Pooled p95 should be near 20 (since the 1000 is way past p95 of 100 samples)
    // and the 1000-sample should land in overflowCount, not in the visible points
    expect(rows[0].dotPlotL.overflowCount).toBeGreaterThanOrEqual(1)
    expect(rows[0].dotPlotR.overflowCount).toBeGreaterThanOrEqual(1)
  })
})
