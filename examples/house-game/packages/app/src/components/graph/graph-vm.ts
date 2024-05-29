import type { Readable } from 'svelte/store'
import type { OutputVarId, Point } from '@sdeverywhere/runtime'

export interface GraphDatasetSpec {
  varId: OutputVarId
  label: string
  color: string
  lineStyle?: 'wide' | 'scatter' | 'none'
}

export interface GraphSpec {
  xAxisLabel?: string
  xMin?: number
  xMax?: number
  yAxisLabel?: string
  yMin?: number
  yMax?: number
  ySoftMax?: number
  datasets: GraphDatasetSpec[]
}

export interface GraphViewModel {
  /** The spec that describes the graph datasets and visuals. */
  spec: GraphSpec

  /** The data for the graph plots. */
  data: Map<OutputVarId, Point[]>

  /** Incremented when there is a change to the data. */
  dataChanged: Readable<number>
}
