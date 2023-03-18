// Copyright (c) 2022 Climate Interactive / New Venture Fund

import type { RelatedItem } from '../bundle/var-types'
import type { DatasetKey } from '../_shared/types'
import type { CompareScenario } from './_shared/compare-resolved-types'

/**
 * Describes a scenario/dataset comparison.
 */
export interface CompareItem {
  /** The item title. */
  title: string
  /** The item subtitle. */
  subtitle?: string
  /** The scenario used for comparison. */
  scenario: CompareScenario
  /** The key for the datasets being compared. */
  datasetKey: DatasetKey
}

/**
 * The title and subtitle info for a group of comparisons.
 */
export interface CompareGroupInfo {
  /** The group title. */
  title: string
  /** The group subtitle. */
  subtitle?: string
  /** The related items (e.g. graphs or sliders) for the group. */
  relatedItems: RelatedItem[]
}

/**
 * Describes a group of comparisons.  The results can be grouped either
 * by dataset or by scenario.
 */
export interface CompareGroup {
  /** The group title/subtitle info. */
  info: CompareGroupInfo
  /** The items in the group. */
  items: CompareItem[]
}
