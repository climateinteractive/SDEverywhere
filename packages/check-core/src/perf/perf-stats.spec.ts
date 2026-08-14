// Copyright (c) 2026 Climate Interactive / New Venture Fund

import { describe, expect, it } from 'vitest'

import { PerfStats } from './perf-stats'

/**
 * Add a sequence of run times to a fresh `PerfStats` instance.
 */
function makeStats(times: number[]): PerfStats {
  const stats = new PerfStats()
  for (const t of times) {
    stats.addRun(t)
  }
  return stats
}

describe('PerfStats', () => {
  it('should produce zeroed report when no runs were added', () => {
    const report = new PerfStats().toReport()
    expect(report.minTime).toBe(0)
    expect(report.maxTime).toBe(0)
    expect(report.avgTime).toBe(0)
    expect(report.medianTime).toBe(0)
    expect(report.p95Time).toBe(0)
    expect(report.stdDev).toBe(0)
    expect(report.allTimes).toEqual([])
  })

  it('should report raw min and max from all samples', () => {
    const report = makeStats([20, 10, 30, 15, 25]).toReport()
    expect(report.minTime).toBe(10)
    expect(report.maxTime).toBe(30)
  })

  it('should sort allTimes ascending in the report', () => {
    const report = makeStats([20, 10, 30, 15, 25]).toReport()
    expect(report.allTimes).toEqual([10, 15, 20, 25, 30])
  })

  it('should compute the trimmed mean (interquartile mean) for avgTime', () => {
    // For 8 samples, the middle 50% is the 4 middle values [3,4,5,6] -> avg 4.5
    const report = makeStats([1, 2, 3, 4, 5, 6, 7, 100]).toReport()
    expect(report.avgTime).toBeCloseTo((3 + 4 + 5 + 6) / 4, 6)
  })

  it('should ignore extreme outliers when computing avgTime', () => {
    // With heavy outliers on both ends, trimmed mean should sit near the bulk
    const samples = [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 1, 200]
    const report = makeStats(samples).toReport()
    expect(report.avgTime).toBeCloseTo(20, 6)
  })

  it('should compute median as 50th percentile (linear interpolation)', () => {
    // Odd count: median is the middle value
    expect(makeStats([1, 2, 3, 4, 5]).toReport().medianTime).toBeCloseTo(3, 6)
    // Even count: median is interpolated midpoint
    expect(makeStats([1, 2, 3, 4]).toReport().medianTime).toBeCloseTo(2.5, 6)
  })

  it('should compute p95 as the 95th percentile (linear interpolation)', () => {
    // For samples 1..100 sorted ascending, p95 ≈ 95.05 with linear interpolation
    const samples: number[] = []
    for (let i = 1; i <= 100; i++) {
      samples.push(i)
    }
    const report = makeStats(samples).toReport()
    expect(report.p95Time).toBeCloseTo(95.05, 2)
  })

  it('should compute the population stddev across all samples', () => {
    // Mean = 30, variance = ((10-30)^2 + (20-30)^2 + (30-30)^2 + (40-30)^2 + (50-30)^2) / 5 = 200
    // stddev = sqrt(200) ≈ 14.142
    const report = makeStats([10, 20, 30, 40, 50]).toReport()
    expect(report.stdDev).toBeCloseTo(Math.sqrt(200), 4)
  })

  it('should produce stable percentiles for a single sample', () => {
    const report = makeStats([42]).toReport()
    expect(report.minTime).toBe(42)
    expect(report.maxTime).toBe(42)
    expect(report.avgTime).toBe(42)
    expect(report.medianTime).toBe(42)
    expect(report.p95Time).toBe(42)
    expect(report.stdDev).toBe(0)
  })
})
