// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

export interface PerfReport {
  readonly minTime: number
  readonly maxTime: number
  readonly avgTime: number
  readonly allTimes: number[]
}

export class PerfStats {
  private readonly times: number[] = []

  addRun(timeInMillis: number): void {
    this.times.push(timeInMillis)
  }

  toReport(): PerfReport {
    // Get the absolute min and max times, just for informational
    // purposes (these will be thrown out before computing the average)
    const minTime = Math.min(...this.times)
    const maxTime = Math.max(...this.times)

    // Sort the run times, then keep only the middle 50% so that we
    // ignore outliers for computing the average time
    const sortedTimes = this.times.sort()
    const minIndex = Math.floor(sortedTimes.length / 4)
    const maxIndex = minIndex + Math.ceil(sortedTimes.length / 2)
    const middleTimes = sortedTimes.slice(minIndex, maxIndex)
    const totalTime = middleTimes.reduce((a, b) => a + b, 0)
    const avgTime = totalTime / middleTimes.length

    return {
      minTime,
      maxTime,
      avgTime,
      allTimes: sortedTimes
    }
  }
}
