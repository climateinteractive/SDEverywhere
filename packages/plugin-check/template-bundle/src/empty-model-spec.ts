// Copyright (c) 2022 Climate Interactive / New Venture Fund

/*
 * This no-op module is configured as the default path alias in the tsconfig
 * files so that TypeScript does not complain.  (The actual module will be set
 * up using aliases in the Vite config file.)
 */

import type { InputSpec } from './inputs'
import type { OutputSpec } from './outputs'

export const startTime = 0
export const endTime = 0
export const inputSpecs: InputSpec[] = []
export const outputSpecs: OutputSpec[] = []
export const modelSizeInBytes = 0
export const dataSizeInBytes = 0
