// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'

import type { ComparisonSummaryRowViewModel } from './comparison-summary-row-vm'

export interface ComparisonSummarySectionViewModel {
  header: ComparisonSummaryRowViewModel
  rows: ComparisonSummaryRowViewModel[]
  expanded: Writable<boolean>
}
