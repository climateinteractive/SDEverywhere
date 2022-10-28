// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { DatasetKey, ScenarioKey } from '@sdeverywhere/check-core'

export interface CompareSummaryRowViewModel {
  /** The group name (either dataset name or scenario name). */
  groupName: string
  /** The secondary name (either dataset source name or scenario position). */
  secondaryName?: string
  /** The percent of diffs for each threshold bucket. */
  diffPercentByBucket: number[]
  /** The total score for this row. */
  totalScore: number
  /** The associated group key. */
  groupKey?: DatasetKey | ScenarioKey
  /** Whether to use striped style for the bar. */
  striped: boolean
}
