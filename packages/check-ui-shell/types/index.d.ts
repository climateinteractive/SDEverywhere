// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { ConfigOptions, SuiteSummary } from '@sdeverywhere/check-core'

export interface AppShellOptions {
  suiteSummary?: SuiteSummary
  containerId?: string
  bundleNames?: string[]
}

export function initAppShell(configOptions: ConfigOptions, appShellOptions?: AppShellOptions): unknown
