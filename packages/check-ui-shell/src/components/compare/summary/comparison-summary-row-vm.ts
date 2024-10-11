// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type {
  DatasetKey,
  ComparisonScenarioKey,
  ComparisonGroupSummary,
  ComparisonView,
  ComparisonViewGroup
} from '@sdeverywhere/check-core'

import type { ComparisonGroupingKind } from '../_shared/comparison-grouping-kind'

// XXX: Views don't currently have a unique key of their own, so we assign them at runtime
export type ComparisonViewKey = string

export interface ComparisonSummaryRowViewMetadata {
  /** The view group that the view belongs to. */
  viewGroup: ComparisonViewGroup
  /** The metadata for the view. */
  view: ComparisonView
  /** The number of changed graphs, if this is an "all graphs" row. */
  changedGraphCount?: number
}

export interface ComparisonSummaryRowViewModel {
  kind: ComparisonGroupingKind
  /** The unique key for the row (can be undefined for a header row). */
  key?: DatasetKey | ComparisonScenarioKey | ComparisonViewKey
  /** The row title (e.g., output variable name or scenario title). */
  title: string
  /** The row subtitle (e.g., output variable source name or scenario subtitle). */
  subtitle?: string
  /** XXX */
  valuesPart?: string
  /** A string containing HTML `<span>` elements for annotations. */
  annotations?: string
  /** The percent of diffs for each threshold bucket. */
  diffPercentByBucket?: number[]
  /** The metadata for the comparison test group. */
  groupSummary?: ComparisonGroupSummary
  /** The view-related metadata, if this is a view row. */
  viewMetadata?: ComparisonSummaryRowViewMetadata
  /** Whether to use header style for the bar. */
  header?: boolean
}
