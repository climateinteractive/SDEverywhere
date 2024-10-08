// Copyright (c) 2024 Climate Interactive / New Venture Fund

import type { Readable } from 'svelte/store'

export interface UserPrefs {
  zoom: Readable<number>
  consistentYRange: Readable<boolean>
}
