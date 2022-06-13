// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DotPlotViewModel } from './dot-plot-vm'

export interface PerfTableRowViewModel {
  num: number
  minTimeL: string
  avgTimeL: string
  maxTimeL: string
  minTimeR: string
  avgTimeR: string
  maxTimeR: string
  dotPlotL: DotPlotViewModel
  dotPlotR: DotPlotViewModel
}
