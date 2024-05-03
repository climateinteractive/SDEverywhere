export interface Point {
  x: number
  y: number
}

export type PlotStyle = 'normal' | 'wide' | 'dashed'

export interface RefPlot {
  points: Point[]
  style: PlotStyle
}

export interface GraphViewModel {
  key: string
  // refPlots: RefPlot[]
  points: Point[]
  xMin?: number
  xMax?: number
}
