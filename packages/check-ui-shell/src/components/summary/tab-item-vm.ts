// Copyright (c) 2025 Climate Interactive / New Venture Fund

import type { Readable } from 'svelte/store'

export interface TabItemViewModel {
  id: string
  title: string
  subtitle: Readable<string>
  subtitleClass: Readable<string>
}
