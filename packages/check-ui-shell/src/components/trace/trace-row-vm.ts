// Copyright (c) 2024 Climate Interactive / New Venture Fund

export interface TracePointViewModel {
  color: string
  empty?: boolean
}

export interface TraceRowViewModel {
  varName: string
  points: TracePointViewModel[]
}
