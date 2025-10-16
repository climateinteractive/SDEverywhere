// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'
import type { ComparisonConfig } from '@sdeverywhere/check-core'

export interface HeaderViewModel {
  nameL?: string
  nameR?: string
  bundleNamesL: Writable<string[]>
  bundleNamesR: Writable<string[]>
  thresholds?: string[]
  controlsVisible: Writable<boolean>
  zoom: Writable<number>
  consistentYRange: Writable<boolean>
}

export function createHeaderViewModel(
  comparisonConfig: ComparisonConfig | undefined,
  zoom: Writable<number>,
  consistentYRange: Writable<boolean>
): HeaderViewModel {
  const controlsVisible = writable(false)

  // Only include the comparison-related header elements if the comparison
  // config is defined
  if (comparisonConfig) {
    const thresholds = comparisonConfig.thresholds
    const thresholdStrings: string[] = []
    thresholdStrings.push('no diff')
    for (let i = 0; i < 3; i++) {
      thresholdStrings.push(`diff &lt; ${thresholds[i]}%`)
    }
    thresholdStrings.push(`diff &gt;= ${thresholds[2]}%`)

    return {
      nameL: comparisonConfig.bundleL.name,
      nameR: comparisonConfig.bundleR.name,
      bundleNamesL: writable([comparisonConfig.bundleL.name]),
      bundleNamesR: writable([comparisonConfig.bundleR.name]),
      thresholds: thresholdStrings,
      controlsVisible,
      zoom,
      consistentYRange
    }
  } else {
    return {
      bundleNamesL: writable([]),
      bundleNamesR: writable([]),
      controlsVisible,
      zoom,
      consistentYRange
    }
  }
}
