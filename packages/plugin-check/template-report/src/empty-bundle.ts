// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle } from '@sdeverywhere/check-core'

/*
 * This module serves two purposes:
 *
 * 1. It is configured as the default path alias in the tsconfig files so
 *    that TypeScript does not complain.  (The actual bundles will be set
 *    up using aliases in the Vite config file.)
 *
 * 2. It is used as a default no-op bundle in the case where a baseline
 *    bundle is not used (in which case no comparison tests will be run
 *    and only the current bundle will be checked).
 */

export function createBundle(): Bundle {
  return {
    version: -1,
    modelSpec: undefined,
    initModel: () => undefined
  }
}
