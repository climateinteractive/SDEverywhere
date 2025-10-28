// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { Readable } from 'svelte/store'

import type { ComparisonSortMode } from '@sdeverywhere/check-core'

export interface UserPrefs {
  zoom: Readable<number>
  consistentYRange: Readable<boolean>
  sortMode: Readable<ComparisonSortMode>
}
