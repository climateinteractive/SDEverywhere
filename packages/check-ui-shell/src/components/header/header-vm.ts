// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { Writable } from 'svelte/store'
import { writable } from 'svelte/store'
import type { CompareConfig } from '@sdeverywhere/check-core'
import { localStorageWritableBoolean } from '../../_shared/stores'

export interface HeaderViewModel {
  nameL?: string
  nameR?: string
  bundleNamesL: Writable<string[]>
  bundleNamesR: Writable<string[]>
  thresholds?: string[]
  simplifyScenarios?: Writable<boolean>
}

export function createHeaderViewModel(
  compareConfig: CompareConfig | undefined,
  includeSimplifyScenarios: boolean
): HeaderViewModel {
  let simplifyScenarios: Writable<boolean>
  if (includeSimplifyScenarios) {
    simplifyScenarios = localStorageWritableBoolean('sde-check-simplify-scenarios', true)
  } else {
    simplifyScenarios = undefined
  }

  // Only include the comparison-related header elements if the compare
  // config is defined
  if (compareConfig) {
    const thresholds = compareConfig.thresholds
    const thresholdStrings: string[] = []
    thresholdStrings.push('no diff')
    for (let i = 0; i < 3; i++) {
      thresholdStrings.push(`diff &lt; ${thresholds[i]}%`)
    }
    thresholdStrings.push(`diff &gt;= ${thresholds[2]}%`)

    return {
      nameL: compareConfig.bundleL.name,
      nameR: compareConfig.bundleR.name,
      bundleNamesL: writable([compareConfig.bundleL.name]),
      bundleNamesR: writable([compareConfig.bundleR.name]),
      thresholds: thresholdStrings,
      simplifyScenarios
    }
  } else {
    return {
      bundleNamesL: writable([]),
      bundleNamesR: writable([]),
      simplifyScenarios
    }
  }
}
