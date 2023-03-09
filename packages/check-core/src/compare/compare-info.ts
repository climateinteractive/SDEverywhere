// Copyright (c) 2021-2022 Climate Interactive / New Venture Fund

import type { RelatedItem } from '../bundle/var-types'

/**
 * The variable/source name info associated with a dataset.
 */
export interface DatasetInfo {
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
