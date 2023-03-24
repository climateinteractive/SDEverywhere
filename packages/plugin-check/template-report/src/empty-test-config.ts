// Copyright (c) 2022 Climate Interactive / New Venture Fund

/*
 * This no-op module is configured as the default path alias in the tsconfig
 * files so that TypeScript does not complain.  (The actual module will be set
 * up using aliases in the Vite config file.)
 */

import type { Bundle, ConfigInitOptions, ConfigOptions } from '@sdeverywhere/check-core'

export async function getConfigOptions(
  /* eslint-disable @typescript-eslint/no-unused-vars */
  _bundleL: Bundle | undefined,
  _bundleR: Bundle,
  _opts?: ConfigInitOptions
  /* eslint-enable @typescript-eslint/no-unused-vars */
): Promise<ConfigOptions> {
  return undefined
}
