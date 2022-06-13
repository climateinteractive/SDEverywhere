// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DotPlotViewModel } from '../perf/dot-plot-vm'

export interface StatsTableRowViewModel {
  modelName: string
  datasetClassIndex?: number
  inputs: string
  outputs: string
  modelSize: string
  modelSizePctChange: string
  dataSize: string
  dataSizePctChange: string
  avgTime: string
  avgTimePctChange: string
  minTime: string
  maxTime: string
  dotPlot?: DotPlotViewModel
}
