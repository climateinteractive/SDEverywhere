// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'
import type { ComparisonConfig } from '@sdeverywhere/check-core'
import { localStorageWritableBoolean, localStorageWritableNumber } from '../../_shared/stores'

export interface HeaderViewModel {
  nameL?: string
  nameR?: string
  bundleNamesL: Writable<string[]>
  bundleNamesR: Writable<string[]>
  thresholds?: string[]
  simplifyScenarios?: Writable<boolean>
  zoom: Writable<number>
}

export function createHeaderViewModel(
  comparisonConfig: ComparisonConfig | undefined,
  includeSimplifyScenarios: boolean
): HeaderViewModel {
  let simplifyScenarios: Writable<boolean>
  if (includeSimplifyScenarios) {
    simplifyScenarios = localStorageWritableBoolean('sde-check-simplify-scenarios', false)
  } else {
    simplifyScenarios = undefined
  }

  const zoom = localStorageWritableNumber('sde-check-graph-zoom', 1)

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
      simplifyScenarios,
      zoom
    }
  } else {
    return {
      bundleNamesL: writable([]),
      bundleNamesR: writable([]),
      simplifyScenarios,
      zoom
    }
  }
}
