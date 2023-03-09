// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { Bundle, CompareDatasets, DatasetKey } from '@sdeverywhere/check-core'
import { DatasetManager } from '@sdeverywhere/check-core'

// Simulate a variable being renamed between two versions of the model
// (see `getOutputVars` in `sample-model-bundle`)
const renamedDatasetKeys: Map<DatasetKey, DatasetKey> = new Map([['Model__output_w_v1', 'Model__output_w_v2']])

/**
 * Return the datasets used for comparisons.
 */
export function getCompareDatasets(bundleL: Bundle, bundleR: Bundle): CompareDatasets {
  return new DatasetManager(bundleL, bundleR, renamedDatasetKeys)
}
