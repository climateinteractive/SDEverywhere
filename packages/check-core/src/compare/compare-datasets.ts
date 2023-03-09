// Copyright (c) 2023 Climate Interactive / New Venture Fund

import type { Scenario } from '../_shared/scenario'
import type { DatasetKey } from '../_shared/types'
import type { RelatedItem } from '../bundle/var-types'

/**
 * The variable/source name info associated with a dataset in a comparison test.
 */
export interface CompareDatasetInfo {
  /** The variable name. */
  varName: string
  /** The new variable name, if it was renamed. */
  newVarName?: string
  /** The source name. */
  sourceName?: string
  /** The new source name, if it was renamed. */
  newSourceName?: string
  /** The related items (e.g. graphs) for the dataset. */
  relatedItems: RelatedItem[]
}

/**
 * Provides access to the set of datasets that are configured for comparison.
 */
export interface CompareDatasets {
  /** The mapping of renamed dataset keys. */
  renamedDatasetKeys?: Map<DatasetKey, DatasetKey>

  /**
   * Return the keys for the datasets that should be compared for the given scenario.
   *
   * @param scenario The scenario.
   */
  getDatasetKeysForScenario(scenario: Scenario): DatasetKey[]

  /**
   * Return the dataset info for the given key.
   */
  getDatasetInfo(datasetKey: DatasetKey): CompareDatasetInfo | undefined
}
