// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey, ComparisonScenarioKey, ComparisonGroupSummary } from '@sdeverywhere/check-core'

export interface CompareSummaryRowViewModel {
  /** The row title (e.g., output variable name or scenario title). */
  title: string
  /** The row subtitle (e.g., output variable source name or scenario subtitle). */
  subtitle?: string
  /** XXX */
  valuesPart?: string
  /** XXX */
  messagesPart?: string
  /** The percent of diffs for each threshold bucket. */
  diffPercentByBucket?: number[]
  /** The metadata for the comparison test group. */
  groupSummary?: ComparisonGroupSummary
  /** The associated group key. */
  groupKey?: DatasetKey | ComparisonScenarioKey
  /** Whether to use header style for the bar. */
  header?: boolean
}
