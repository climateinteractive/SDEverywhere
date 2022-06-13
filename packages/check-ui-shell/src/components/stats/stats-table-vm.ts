// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { CompareConfig, PerfReport } from '@sdeverywhere/check-core'
import type { DotPlotViewModel } from '../perf/dot-plot-vm'
import { createDotPlotViewModel } from '../perf/dot-plot-vm'
import type { StatsTableRowViewModel } from './stats-table-row-vm'

export interface StatsTableViewModel {
  row1: StatsTableRowViewModel
  row2: StatsTableRowViewModel
  row3: StatsTableRowViewModel
}

export function createStatsTableViewModel(
  compareConfig: CompareConfig,
  perfReportL: PerfReport,
  perfReportR: PerfReport
): StatsTableViewModel {
  function signed(n: number, fractionDigits = 0): string {
    return n === 0 ? '-' : `${n <= 0 ? '' : '+'}${n.toFixed(fractionDigits)}`
  }

  function signedPct(n: number): string {
    return n === 0 ? '' : `${signed(n, 1)}%`
  }

  const modelSpecL = compareConfig.bundleL.model.modelSpec
  const modelSpecR = compareConfig.bundleR.model.modelSpec

  const inputCountL = modelSpecL.inputVars.size
  const inputCountR = modelSpecR.inputVars.size
  const inputCountChange = inputCountR - inputCountL

  const outputCountL = modelSpecL.outputVars.size
  const outputCountR = modelSpecR.outputVars.size
  const outputCountChange = outputCountR - outputCountL

  const modelSizeL = modelSpecL.modelSizeInBytes
  const modelSizeR = modelSpecR.modelSizeInBytes
  const modelSizeChange = modelSizeR - modelSizeL
  const modelSizePctChange = ((modelSizeR - modelSizeL) / modelSizeL) * 100

  const dataSizeL = modelSpecL.dataSizeInBytes
  const dataSizeR = modelSpecR.dataSizeInBytes
  const dataSizeChange = dataSizeR - dataSizeL
  const dataSizePctChange = ((dataSizeR - dataSizeL) / dataSizeL) * 100

  const avgTimeL = perfReportL.avgTime || 0
  const avgTimeR = perfReportR.avgTime || 0
  const avgTimeChange = avgTimeR - avgTimeL
  const avgTimePctChange = avgTimeL > 0 ? ((avgTimeR - avgTimeL) / avgTimeL) * 100 : 0

  const minTimeL = perfReportL.minTime
  const minTimeR = perfReportR.minTime
  const maxTimeL = perfReportL.maxTime
  const maxTimeR = perfReportR.maxTime

  const minTime = Math.min(minTimeL, minTimeR)
  const maxTime = Math.max(maxTimeL, maxTimeR)

  function dotPlot(report: PerfReport): DotPlotViewModel {
    return createDotPlotViewModel(report.allTimes, minTime, maxTime, report.avgTime)
  }

  const row1: StatsTableRowViewModel = {
    modelName: compareConfig.bundleL.name,
    datasetClassIndex: 0,
    inputs: inputCountL.toString(),
    outputs: outputCountL.toString(),
    modelSize: modelSizeL.toString(),
    modelSizePctChange: '',
    dataSize: dataSizeL.toString(),
    dataSizePctChange: '',
    avgTime: avgTimeL.toFixed(1),
    avgTimePctChange: '',
    minTime: minTimeL.toFixed(1),
    maxTime: maxTimeL.toFixed(1),
    dotPlot: dotPlot(perfReportL)
  }

  const row2: StatsTableRowViewModel = {
    modelName: compareConfig.bundleR.name,
    datasetClassIndex: 1,
    inputs: inputCountR.toString(),
    outputs: outputCountR.toString(),
    modelSize: modelSizeR.toString(),
    modelSizePctChange: '',
    dataSize: dataSizeR.toString(),
    dataSizePctChange: '',
    avgTime: avgTimeR.toFixed(1),
    avgTimePctChange: '',
    minTime: minTimeR.toFixed(1),
    maxTime: maxTimeR.toFixed(1),
    dotPlot: dotPlot(perfReportR)
  }

  const row3: StatsTableRowViewModel = {
    modelName: 'Change',
    inputs: signed(inputCountChange),
    outputs: signed(outputCountChange),
    modelSize: signed(modelSizeChange),
    modelSizePctChange: signedPct(modelSizePctChange),
    dataSize: signed(dataSizeChange),
    dataSizePctChange: signedPct(dataSizePctChange),
    avgTime: signed(avgTimeChange, 1),
    avgTimePctChange: signedPct(avgTimePctChange),
    minTime: '',
    maxTime: ''
  }

  return {
    row1,
    row2,
    row3
  }
}
