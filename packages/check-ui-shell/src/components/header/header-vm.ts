// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Readable, Writable } from 'svelte/store'
import { derived, writable } from 'svelte/store'
import type { ComparisonConfig, ComparisonSortMode } from '@sdeverywhere/check-core'

export interface HeaderViewModel {
  devMode: boolean
  nameL?: string
  nameR?: string
  bundleNamesL: Writable<string[]>
  bundleNamesR: Writable<string[]>
  thresholds?: Readable<string[]>
  generatedDateString: Readable<string | undefined>
  controlsVisible: Writable<boolean>
  zoom: Writable<number>
  consistentYRange: Writable<boolean>
  sortMode: Writable<ComparisonSortMode>
  concurrency: Writable<number>
}

export function createHeaderViewModel(
  devMode: boolean,
  comparisonConfig: ComparisonConfig | undefined,
  generatedDateString: Readable<string | undefined>,
  zoom: Writable<number>,
  consistentYRange: Writable<boolean>,
  sortMode: Writable<ComparisonSortMode>,
  concurrency: Writable<number>
): HeaderViewModel {
  const controlsVisible = writable(false)

  // Only include the comparison-related header elements if the comparison
  // config is defined
  if (comparisonConfig) {
    const thresholdStrings = derived(sortMode, $sortMode => {
      const strings: string[] = []
      if ($sortMode === 'max-diff-relative' || $sortMode === 'avg-diff-relative') {
        // Use the relative ratio thresholds
        const thresholds = comparisonConfig.ratioThresholds
        strings.push('no diff')
        for (let i = 0; i < 3; i++) {
          strings.push(`ratio &lt; ${thresholds[i]}`)
        }
        strings.push(`ratio &gt;= ${thresholds[2]}`)
      } else {
        // Use the regular percent thresholds
        const thresholds = comparisonConfig.thresholds
        strings.push('no diff')
        for (let i = 0; i < 3; i++) {
          strings.push(`diff &lt; ${thresholds[i]}%`)
        }
        strings.push(`diff &gt;= ${thresholds[2]}%`)
      }
      return strings
    })

    return {
      devMode,
      nameL: comparisonConfig.bundleL.name,
      nameR: comparisonConfig.bundleR.name,
      bundleNamesL: writable([comparisonConfig.bundleL.name]),
      bundleNamesR: writable([comparisonConfig.bundleR.name]),
      thresholds: thresholdStrings,
      generatedDateString,
      controlsVisible,
      zoom,
      consistentYRange,
      sortMode,
      concurrency
    }
  } else {
    return {
      devMode,
      bundleNamesL: writable([]),
      bundleNamesR: writable([]),
      generatedDateString,
      controlsVisible,
      zoom,
      consistentYRange,
      sortMode,
      concurrency
    }
  }
}
