// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { Point } from './outputs'
import type { VarSpec } from './var-indices'

export interface DataVar {
  varSpec: VarSpec
  points: Point[]
}
