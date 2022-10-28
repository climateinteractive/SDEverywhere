// Copyright (c) 2022 Climate Interactive / New Venture Fund

/*
 * This no-op module is configured as the default path alias in the tsconfig
 * files so that TypeScript does not complain.  (The actual module will be set
 * up using aliases in the Vite config file.)
 */

import type { Bundle, ConfigOptions } from '@sdeverywhere/check-core'

export interface BundleOptions {
  nameL?: string
  nameR?: string
}

export async function getConfigOptions(
  /* eslint-disable @typescript-eslint/no-unused-vars */
  _bundleL: Bundle | undefined,
  _bundleR: Bundle,
  _opts: BundleOptions
  /* eslint-enable @typescript-eslint/no-unused-vars */
): Promise<ConfigOptions> {
  return undefined
}
