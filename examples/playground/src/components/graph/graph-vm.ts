// Copyright (c) 2024 Climate Interactive / New Venture Fund

/** A data point with x and y coordinates. */
export interface Point {
  x: number
  y: number
}

/** Style options for a line in a graph. */
export type LineStyle = 'solid' | 'dashed' | 'scatter' | 'area' | 'none'

/** A dataset to be plotted in the graph. */
export interface GraphDataset {
  /** Variable ID. */
  varId: string
  /** Display label. */
  label: string
  /** CSS color. */
  color: string
  /** Line style. */
  style: LineStyle
  /** Data points. */
  points: Point[]
}

/** View model for a graph supporting multiple datasets. */
export interface GraphViewModel {
  /** Unique key for tracking changes. */
  key: string
  /** Datasets to display. */
  datasets: GraphDataset[]
  /** Optional minimum x value. */
  xMin?: number
  /** Optional maximum x value. */
  xMax?: number
}
